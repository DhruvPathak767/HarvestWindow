import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import { generateToken } from "../src/middleware/authenticate.js";
import { createFarm } from "../src/modules/farms/farms.service.js";
import { createCrop } from "../src/modules/crops/crops.service.js";
import {
  evaluateCropRules,
  differenceInCalendarDays,
} from "../src/modules/recommendations/recommendations.rules.js";
import {
  refreshRecommendations,
  listRecommendations,
  updateRecommendationStatus,
} from "../src/modules/recommendations/recommendations.service.js";

describe("Phase 6 — Recommendations Engine Module Tests", () => {
  let server;
  let baseUrl;

  const userA = { id: "rec-user-a-111", email: "rec-a@example.com", role: "FARMER" };
  const userB = { id: "rec-user-b-222", email: "rec-b@example.com", role: "FARMER" };
  const tokenA = generateToken(userA);
  const tokenB = generateToken(userB);

  let farmA;
  let cropA1;
  let cropA2;
  let farmB;
  let cropB1;

  before(async () => {
    // Setup test HTTP server on an ephemeral port
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Create Farm and Crops for User A
    farmA = await createFarm(userA.id, {
      name: "Sunrise Organic Farm",
      state: "Maharashtra",
      district: "Nashik",
      area: 8.5,
      areaUnit: "hectare",
      latitude: 19.9975,
      longitude: 73.7898,
      soilType: "Black Cotton",
    });

    const today = new Date();
    const approachingHarvest = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000); // 4 days away
    const sowingA1 = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

    cropA1 = await createCrop(userA.id, {
      farmId: farmA.id,
      cropName: "Wheat",
      variety: "Sharbati",
      sowingDate: sowingA1.toISOString(),
      expectedHarvestDate: approachingHarvest.toISOString(),
      growthStage: "FLOWERING",
    });

    cropA2 = await createCrop(userA.id, {
      farmId: farmA.id,
      cropName: "Soybean",
      variety: "JS-335",
      sowingDate: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      growthStage: "GERMINATION", // Missing expected harvest date
    });

    // Create Farm and Crop for User B
    farmB = await createFarm(userB.id, {
      name: "Green Valley Farm",
      state: "Punjab",
      district: "Ludhiana",
      area: 12,
      areaUnit: "acre",
      latitude: 30.901,
      longitude: 75.8573,
    });

    cropB1 = await createCrop(userB.id, {
      farmId: farmB.id,
      cropName: "Mustard",
      sowingDate: new Date().toISOString(),
      growthStage: "SEEDLING",
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // =========================================================================
  // 1. Pure Rule Engine Unit Tests
  // =========================================================================
  describe("1. Pure Agricultural Rule Engine Evaluation", () => {
    const mockFarm = {
      id: "farm-mock-1",
      name: "Mock Farm",
      soilType: "Loamy",
    };

    const baseCrop = {
      id: "crop-mock-1",
      cropName: "Paddy",
      growthStage: "FLOWERING",
      sowingDate: new Date("2026-08-01"),
    };

    test("Rule A1: Generates irrigation pause ahead of expected heavy rainfall (>=15mm in 3 days)", () => {
      const weatherWithRain = {
        dailyForecast: [
          { date: "2026-10-11", rainfallMm: 10, maxTempC: 28 },
          { date: "2026-10-12", rainfallMm: 15, maxTempC: 26 },
          { date: "2026-10-13", rainfallMm: 0, maxTempC: 29 },
        ],
      };

      const rules = evaluateCropRules({
        farm: mockFarm,
        crop: baseCrop,
        weather: weatherWithRain,
      });

      const pauseRec = rules.find((r) => r.ruleKey.startsWith("irrigation-rain-pause"));
      assert.ok(pauseRec, "Expected irrigation-rain-pause recommendation");
      assert.equal(pauseRec.category, "weather");
      assert.equal(pauseRec.priority, "medium");
      assert.match(pauseRec.title, /Pause irrigation/i);
    });

    test("Rule A2: Generates dry spell & moisture check during sustained dry weather with high temp", () => {
      const dryWeather = {
        dailyForecast: [
          { date: "2026-10-11", rainfallMm: 0, maxTempC: 34 },
          { date: "2026-10-12", rainfallMm: 0, maxTempC: 35 },
          { date: "2026-10-13", rainfallMm: 0, maxTempC: 33 },
          { date: "2026-10-14", rainfallMm: 0, maxTempC: 32 },
          { date: "2026-10-15", rainfallMm: 0.5, maxTempC: 31 },
        ],
      };

      const rules = evaluateCropRules({
        farm: mockFarm,
        crop: baseCrop,
        weather: dryWeather,
      });

      const drySpellRec = rules.find((r) => r.ruleKey.startsWith("irrigation-dry-spell"));
      assert.ok(drySpellRec, "Expected irrigation-dry-spell recommendation");
      assert.equal(drySpellRec.category, "monitoring");
      assert.match(drySpellRec.title, /Monitor soil moisture and irrigation/i);
    });

    test("Rule B: Generates heavy rainfall warning when daily rainfall >= 35mm", () => {
      const stormyWeather = {
        dailyForecast: [
          { date: "2026-10-12", rainfallMm: 45, maxTempC: 24 },
        ],
      };

      const rules = evaluateCropRules({
        farm: mockFarm,
        crop: baseCrop,
        weather: stormyWeather,
      });

      const heavyRainRec = rules.find((r) => r.ruleKey.startsWith("heavy-rain"));
      assert.ok(heavyRainRec, "Expected heavy-rain recommendation");
      assert.equal(heavyRainRec.category, "weather");
      assert.equal(heavyRainRec.priority, "high");
      assert.match(heavyRainRec.title, /Heavy rainfall alert/i);
    });

    test("Rule C: Generates heat stress watch when forecast max temperature >= 38°C", () => {
      const extremeHeatWeather = {
        dailyForecast: [
          { date: "2026-10-13", rainfallMm: 0, maxTempC: 41, humidity: 25 },
        ],
      };

      const rules = evaluateCropRules({
        farm: mockFarm,
        crop: baseCrop,
        weather: extremeHeatWeather,
      });

      const heatRec = rules.find((r) => r.ruleKey.startsWith("heat-stress"));
      assert.ok(heatRec, "Expected heat-stress recommendation");
      assert.equal(heatRec.category, "weather");
      assert.equal(heatRec.priority, "high");
      assert.match(heatRec.title, /Heat stress watch/i);
    });

    test("Rule D: Generates harvest approaching recommendation when 3-10 days remain", () => {
      const refDate = new Date("2026-10-10");
      const cropApproaching = {
        ...baseCrop,
        expectedHarvestDate: new Date("2026-10-15"), // 5 days away
      };

      const rules = evaluateCropRules({
        farm: mockFarm,
        crop: cropApproaching,
        referenceDate: refDate,
      });

      const approachRec = rules.find((r) => r.ruleKey.startsWith("harvest-approaching"));
      assert.ok(approachRec, "Expected harvest-approaching recommendation");
      assert.equal(approachRec.category, "timing");
      assert.equal(approachRec.priority, "high"); // 5 days is high priority
      assert.match(approachRec.title, /5 days remaining/i);
    });

    test("Rule E: Generates harvest readiness recommendation when target date is reached (<= 2 days)", () => {
      const refDate = new Date("2026-10-10");
      const cropReady = {
        ...baseCrop,
        expectedHarvestDate: new Date("2026-10-11"), // 1 day away
      };

      const rules = evaluateCropRules({
        farm: mockFarm,
        crop: cropReady,
        referenceDate: refDate,
      });

      const readyRec = rules.find((r) => r.ruleKey.startsWith("harvest-ready"));
      assert.ok(readyRec, "Expected harvest-ready recommendation");
      assert.equal(readyRec.category, "timing");
      assert.equal(readyRec.priority, "high");
      assert.match(readyRec.title, /Confirm harvest readiness/i);
    });

    test("Rule F: Generates stage-specific monitoring guidance for flowering stage", () => {
      const rules = evaluateCropRules({
        farm: mockFarm,
        crop: { ...baseCrop, growthStage: "Flowering" },
      });

      const stageRec = rules.find((r) => r.ruleKey.includes("flowering"));
      assert.ok(stageRec, "Expected flowering stage recommendation");
      assert.equal(stageRec.category, "monitoring");
      assert.match(stageRec.title, /Flowering canopy inspection/i);
    });

    test("Rule G: Missing data resilience: handles missing harvest date and null weather gracefully", () => {
      const incompleteCrop = {
        id: "crop-no-harvest-date",
        cropName: "Tomato",
        sowingDate: new Date("2026-09-01"),
        expectedHarvestDate: null,
        growthStage: null,
      };

      // Weather is completely null
      const rules = evaluateCropRules({
        farm: mockFarm,
        crop: incompleteCrop,
        weather: null,
      });

      assert.ok(Array.isArray(rules));
      const missingDateRec = rules.find((r) => r.ruleKey.startsWith("missing-harvest-date"));
      assert.ok(missingDateRec, "Expected missing-harvest-date recommendation");
      assert.equal(missingDateRec.category, "monitoring");
      assert.match(missingDateRec.title, /Configure target harvest date/i);

      // Ensures no weather recommendations were fabricated
      const weatherRec = rules.find((r) => r.category === "weather");
      assert.equal(weatherRec, undefined, "No weather recommendations should be fabricated without weather data");
    });
  });

  // =========================================================================
  // 2. Recommendations Service Refresh & Deduplication
  // =========================================================================
  describe("2. Service Deduplication & Reconciliation", () => {
    test("Initial refresh creates new open recommendations for User A", async () => {
      const result = await refreshRecommendations(userA.id);
      assert.ok(result.total > 0, "Expected at least 1 rule candidate");
      assert.ok(result.created > 0, "Expected at least 1 created recommendation");
    });

    test("Second refresh is idempotent and retains existing open recommendations", async () => {
      const secondResult = await refreshRecommendations(userA.id);
      assert.equal(secondResult.created, 0, "Subsequent refresh should not recreate existing recommendations");
      assert.ok(secondResult.retained > 0, "Expected existing recommendations to be retained");
    });

    test("Preserves completed and dismissed recommendations and does NOT reopen them", async () => {
      const list = await listRecommendations(userA.id, { status: "open" });
      assert.ok(list.items.length > 0, "User A should have open recommendations");

      const targetRec = list.items[0];
      // Mark as completed
      const completed = await updateRecommendationStatus(userA.id, targetRec.id, "completed");
      assert.equal(completed.status, "completed");
      assert.ok(completed.completedAt, "completedAt timestamp must be set");

      // Re-run refresh
      const refreshResult = await refreshRecommendations(userA.id);
      assert.ok(refreshResult.retained > 0);

      // Verify the recommendation is still completed and was NOT reset to open
      const verifyList = await listRecommendations(userA.id, { status: "completed" });
      const stillCompleted = verifyList.items.find((r) => r.id === targetRec.id);
      assert.ok(stillCompleted, "Recommendation must still be completed");
      assert.equal(stillCompleted.status, "completed");
    });
  });

  // =========================================================================
  // 3. API Endpoints & Multi-Tenant Authorization
  // =========================================================================
  describe("3. REST API Endpoints & Ownership Security", () => {
    test("GET /api/v1/recommendations requires authentication (401 without token)", async () => {
      const res = await fetch(`${baseUrl}/api/v1/recommendations`);
      assert.equal(res.status, 401);
    });

    test("GET /api/v1/recommendations returns 200 with list and pagination for User A", async () => {
      const res = await fetch(`${baseUrl}/api/v1/recommendations`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data.items));
      assert.ok(json.data.pagination);
      assert.ok(json.data.pagination.total >= 1);
    });

    test("Supports server-side filtering by status (open vs completed)", async () => {
      const openRes = await fetch(`${baseUrl}/api/v1/recommendations?status=open`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(openRes.status, 200);
      const openJson = await openRes.json();
      for (const item of openJson.data.items) {
        assert.equal(item.status, "open");
      }

      const completedRes = await fetch(`${baseUrl}/api/v1/recommendations?status=completed`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(completedRes.status, 200);
      const completedJson = await completedRes.json();
      for (const item of completedJson.data.items) {
        assert.equal(item.status, "completed");
      }
    });

    test("Supports server-side filtering by priority and category", async () => {
      const filterRes = await fetch(`${baseUrl}/api/v1/recommendations?category=monitoring`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(filterRes.status, 200);
      const filterJson = await filterRes.json();
      for (const item of filterJson.data.items) {
        assert.equal(item.category, "monitoring");
      }
    });

    test("PATCH /api/v1/recommendations/:id/status updates status to dismissed", async () => {
      const listRes = await fetch(`${baseUrl}/api/v1/recommendations?status=open`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const listJson = await listRes.json();
      assert.ok(listJson.data.items.length > 0);

      const rec = listJson.data.items[0];

      const patchRes = await fetch(`${baseUrl}/api/v1/recommendations/${rec.id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "dismissed" }),
      });

      assert.equal(patchRes.status, 200);
      const patchJson = await patchRes.json();
      assert.equal(patchJson.success, true);
      assert.equal(patchJson.data.status, "dismissed");
      assert.ok(patchJson.data.dismissedAt);
    });

    test("PATCH /api/v1/recommendations/:id/status rejects invalid status with 400", async () => {
      const listRes = await fetch(`${baseUrl}/api/v1/recommendations`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const listJson = await listRes.json();
      const rec = listJson.data.items[0];

      const patchRes = await fetch(`${baseUrl}/api/v1/recommendations/${rec.id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "invalid_status" }),
      });

      assert.equal(patchRes.status, 400);
      const errJson = await patchRes.json();
      assert.equal(errJson.success, false);
    });

    test("POST /api/v1/recommendations/refresh refreshes recommendations via API", async () => {
      const res = await fetch(`${baseUrl}/api/v1/recommendations/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(typeof json.data.total === "number");
    });

    test("Cross-User Isolation: User B cannot access or update User A's recommendations", async () => {
      const listRes = await fetch(`${baseUrl}/api/v1/recommendations`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const listJson = await listRes.json();
      const recA = listJson.data.items[0];

      // User B attempts to read User A's recommendation
      const getRes = await fetch(`${baseUrl}/api/v1/recommendations/${recA.id}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.equal(getRes.status, 404, "User B should receive 404 accessing User A's recommendation");

      // User B attempts to update User A's recommendation status
      const patchRes = await fetch(`${baseUrl}/api/v1/recommendations/${recA.id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenB}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed" }),
      });
      assert.equal(patchRes.status, 404, "User B should receive 404 updating User A's recommendation");
    });
  });
});
