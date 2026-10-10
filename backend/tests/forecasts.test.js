import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { generateToken } from "../src/middleware/authenticate.js";
import {
  predictHarvestWindow,
  parseDate,
  addDays,
  diffDays,
  toDateString,
} from "../src/modules/forecasts/predictionEngine.js";
import { resolveCropRule, CROP_RULES } from "../src/modules/forecasts/cropRules.js";

describe("Phase 5 — Harvest Window Prediction Engine & Forecast API Tests", () => {
  // =========================================================================
  // SUITE 1: PURE PREDICTION ENGINE UNIT TESTS (DETERMINISTIC)
  // =========================================================================
  describe("1. Prediction Engine Calculation Logic", () => {
    const fixedToday = new Date(Date.UTC(2026, 2, 1)); // 2026-03-01

    test("1. Valid sowing date with exact crop-variety rule (Wheat HD-3086)", () => {
      const crop = {
        id: "crop-1",
        cropName: "Wheat",
        variety: "HD-3086",
        sowingDate: "2025-11-01",
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      assert.equal(result.cropName, "Wheat");
      assert.equal(result.variety, "HD-3086");
      // HD-3086: minDays=135, typicalDays=142, maxDays=152
      assert.equal(result.harvestWindow.startDate, "2026-03-16");
      assert.equal(result.harvestWindow.typicalDate, "2026-03-23");
      assert.equal(result.harvestWindow.endDate, "2026-04-02");
      assert.ok(result.confidence.score >= 80);
      assert.equal(result.confidence.level, "HIGH");
      assert.ok(result.contributingFactors.some((f) => f.id === "VARIETY_RULE_MATCHED"));
    });

    test("2. Valid sowing date with crop-level fallback rule (Wheat without variety)", () => {
      const crop = {
        id: "crop-2",
        cropName: "Wheat",
        variety: null,
        sowingDate: "2025-11-01",
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      // Generic wheat: minDays=125, typicalDays=140, maxDays=158
      assert.equal(result.harvestWindow.startDate, "2026-03-06");
      assert.equal(result.harvestWindow.typicalDate, "2026-03-21");
      assert.equal(result.harvestWindow.endDate, "2026-04-08");
      assert.ok(result.contributingFactors.some((f) => f.id === "CROP_LEVEL_RULE_USED"));
    });

    test("3. Missing sowing date returns INSUFFICIENT_DATA and zero confidence", () => {
      const crop = {
        id: "crop-3",
        cropName: "Mustard",
        sowingDate: null,
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      assert.equal(result.readinessLevel, "INSUFFICIENT_DATA");
      assert.equal(result.harvestWindow.startDate, null);
      assert.equal(result.harvestWindow.typicalDate, null);
      assert.equal(result.harvestWindow.endDate, null);
      assert.equal(result.confidence.score, 0);
      assert.ok(result.contributingFactors.some((f) => f.id === "MISSING_SOWING_DATE"));
    });

    test("4. Unknown crop utilizes generic agricultural fallback gracefully", () => {
      const crop = {
        id: "crop-4",
        cropName: "RareExoticCrop",
        sowingDate: "2026-01-01",
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      assert.ok(result.harvestWindow.startDate !== null);
      assert.ok(result.contributingFactors.some((f) => f.id === "GENERIC_FALLBACK_RULE_USED"));
    });

    test("5. Unknown variety falls back to crop-level rule", () => {
      const crop = {
        id: "crop-5",
        cropName: "Wheat",
        variety: "UnlistedCultivarXYZ",
        sowingDate: "2025-11-01",
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      assert.ok(result.contributingFactors.some((f) => f.id === "CROP_LEVEL_RULE_USED"));
    });

    test("6. Crop duration configuration respects minDays <= typicalDays <= maxDays", () => {
      for (const rule of CROP_RULES) {
        assert.ok(
          rule.minDays <= rule.typicalDays,
          `${rule.cropName} minDays (${rule.minDays}) should be <= typicalDays (${rule.typicalDays})`
        );
        assert.ok(
          rule.typicalDays <= rule.maxDays,
          `${rule.cropName} typicalDays (${rule.typicalDays}) should be <= maxDays (${rule.maxDays})`
        );
      }
    });

    test("7. Minimum, typical, and maximum harvest date calculations", () => {
      const crop = {
        id: "crop-7",
        cropName: "Maize",
        sowingDate: "2026-01-01",
      };

      // Maize: min 90, typical 105, max 125
      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      assert.equal(result.harvestWindow.startDate, "2026-04-01");
      assert.equal(result.harvestWindow.typicalDate, "2026-04-16");
      assert.equal(result.harvestWindow.endDate, "2026-05-06");
    });

    test("8. Correctly computes leap years without 1-day drift", () => {
      // 2024 is a leap year (Feb has 29 days)
      const leapCrop = {
        id: "crop-leap",
        cropName: "Tomato", // min 70, typical 85, max 100
        sowingDate: "2024-02-01",
      };

      const result = predictHarvestWindow({
        crop: leapCrop,
        referenceDate: new Date(Date.UTC(2024, 2, 1)),
      });
      // Feb 2024 has 29 days: Feb 1 + 70 days -> Feb 28 days + Mar 31 days + Apr 11 days = Apr 11
      assert.equal(result.harvestWindow.startDate, "2024-04-11");
    });

    test("9. Handles year boundaries correctly", () => {
      const crop = {
        id: "crop-year",
        cropName: "Wheat",
        variety: "HD-3086", // min 135
        sowingDate: "2025-10-15",
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      // Sown late 2025, harvest opens in 2026
      assert.ok(result.harvestWindow.startDate.startsWith("2026-"));
    });

    test("10. Negative days remaining for overdue estimates", () => {
      const crop = {
        id: "crop-overdue",
        cropName: "Tomato", // max 100 days
        sowingDate: "2025-08-01",
      };

      // refDate is 2026-03-01 (7 months later)
      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      assert.ok(result.daysToWindowEnd < 0);
      assert.equal(result.readinessLevel, "OVERDUE");
      assert.equal(result.readinessStatus, "passed");
    });

    test("11. Already-harvested crops are classified as HARVESTED", () => {
      const crop = {
        id: "crop-harvested",
        cropName: "Wheat",
        sowingDate: "2025-11-01",
        growthStage: "HARVESTED",
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      assert.equal(result.readinessLevel, "HARVESTED");
      assert.equal(result.readinessStatus, "passed");
      assert.ok(result.contributingFactors.some((f) => f.id === "HARVEST_ALREADY_RECORDED"));
    });

    test("12. Readiness classification boundaries (APPROACHING, READY/in-window, DEVELOPING)", () => {
      // 1. In-Window (Today falls between windowStart and windowEnd)
      const inWindowCrop = {
        id: "c-inwin",
        cropName: "Maize", // min 90, max 125
        sowingDate: "2025-11-15", // 90 days = ~Feb 13, 125 days = ~Mar 20
      };
      const resInWindow = predictHarvestWindow({ crop: inWindowCrop, referenceDate: fixedToday });
      assert.equal(resInWindow.readinessLevel, "READY");
      assert.equal(resInWindow.readinessStatus, "in-window");

      // 2. Approaching (Within 21 days before windowStart)
      const approachingCrop = {
        id: "c-appr",
        cropName: "Maize",
        sowingDate: "2025-12-10", // 90 days = ~Mar 10 (9 days from Mar 1)
      };
      const resApproaching = predictHarvestWindow({ crop: approachingCrop, referenceDate: fixedToday });
      assert.equal(resApproaching.readinessLevel, "APPROACHING");
      assert.equal(resApproaching.readinessStatus, "approaching");

      // 3. Developing (More than 21 days out)
      const developingCrop = {
        id: "c-dev",
        cropName: "Maize",
        sowingDate: "2026-02-01", // 90 days = May 2
      };
      const resDeveloping = predictHarvestWindow({ crop: developingCrop, referenceDate: fixedToday });
      assert.equal(resDeveloping.readinessLevel, "DEVELOPING");
      assert.equal(resDeveloping.readinessStatus, "growing");
    });

    test("13. Growth-stage timeline generation covers developmental stages", () => {
      const crop = {
        id: "crop-stages",
        cropName: "Wheat",
        sowingDate: "2025-11-01",
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      assert.ok(Array.isArray(result.growthTimeline));
      assert.ok(result.growthTimeline.length >= 6);
      assert.ok(result.growthTimeline.some((s) => s.stage.toLowerCase().includes("sowing")));
      assert.ok(result.growthTimeline.some((s) => s.stage.toLowerCase().includes("flowering")));
      assert.ok(result.growthTimeline.some((s) => s.stage.toLowerCase().includes("harvest")));
    });

    test("14. Missing stage-duration rules defaults gracefully to cerealGrain template", () => {
      const crop = {
        id: "crop-no-template",
        cropName: "NovelPlant",
        sowingDate: "2026-01-01",
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      assert.ok(result.growthTimeline.length > 0);
    });

    test("15. Distinguishes observed stages from estimated future stages", () => {
      const crop = {
        id: "crop-obs",
        cropName: "Wheat",
        sowingDate: "2025-11-01",
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      // Early stages that finished before March 2026 should be observed: true
      const earlyStage = result.growthTimeline[0];
      assert.equal(earlyStage.observed, true);
      assert.equal(earlyStage.status, "COMPLETED");

      // Terminal harvest window that starts on 2026-03-06 is in the future relative to 2026-03-01
      const terminalStage = result.growthTimeline[result.growthTimeline.length - 1];
      assert.equal(terminalStage.observed, false);
    });

    test("16. Confidence score is bounded and deterministic", () => {
      const crop = {
        id: "crop-conf",
        cropName: "Wheat",
        variety: "HD-3086",
        sowingDate: "2025-11-01",
        fieldArea: 10,
        irrigationMethod: "canal",
        growthStage: "FLOWERING",
      };

      const result1 = predictHarvestWindow({ crop, referenceDate: fixedToday });
      const result2 = predictHarvestWindow({ crop, referenceDate: fixedToday });

      assert.equal(result1.confidence.score, result2.confidence.score);
      assert.ok(result1.confidence.score >= 20 && result1.confidence.score <= 95);
    });

    test("17. Flags expected harvest date conflict when farmer date diverges from agronomy", () => {
      const crop = {
        id: "crop-exp-conflict",
        cropName: "Wheat", // maturity ~140 days
        sowingDate: "2025-11-01",
        expectedHarvestDate: "2025-12-01", // Only 30 days! Major conflict
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      assert.ok(result.contributingFactors.some((f) => f.id === "EXPECTED_DATE_CONFLICT"));
    });

    test("18. Flags expected harvest date consistent when farmer date aligns", () => {
      const crop = {
        id: "crop-exp-align",
        cropName: "Wheat",
        variety: "HD-3086",
        sowingDate: "2025-11-01",
        expectedHarvestDate: "2026-03-23", // Aligns with typical 142 days
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      assert.ok(result.contributingFactors.some((f) => f.id === "EXPECTED_DATE_CONSISTENT"));
    });

    test("19. Includes clear explanations for all contributing factors", () => {
      const crop = {
        id: "crop-factors",
        cropName: "Cotton",
        sowingDate: "2025-06-01",
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday });
      for (const factor of result.contributingFactors) {
        assert.ok(factor.id && typeof factor.id === "string");
        assert.ok(factor.label && typeof factor.label === "string");
        assert.ok(factor.detail && typeof factor.detail === "string");
        assert.ok(["supports", "delays", "advances", "neutral"].includes(factor.direction));
      }
    });

    test("20. Baseline predictions function without weather integration", () => {
      const crop = {
        id: "crop-no-weather",
        cropName: "Tomato",
        sowingDate: "2026-01-01",
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday, weatherContext: null });
      assert.equal(result.weatherAdjustmentApplied, false);
      assert.ok(result.contributingFactors.some((f) => f.id === "WEATHER_DATA_UNAVAILABLE"));
    });

    test("21. Weather integration extension hook applies when context provided", () => {
      const crop = {
        id: "crop-with-weather",
        cropName: "Tomato",
        sowingDate: "2026-01-01",
      };

      const weatherContext = {
        heatAdvanceDays: 3,
        rainDelayDays: 1,
        note: "Warm spell pulled window forward",
      };

      const result = predictHarvestWindow({ crop, referenceDate: fixedToday, weatherContext });
      assert.equal(result.weatherAdjustmentApplied, true);
      assert.ok(result.contributingFactors.some((f) => f.id === "WEATHER_ADJUSTMENT_APPLIED"));
    });

    test("22. Identical inputs and reference dates produce strictly identical outputs", () => {
      const crop = {
        id: "crop-det",
        cropName: "Wheat",
        variety: "HD-3086",
        sowingDate: "2025-11-01",
      };

      const res1 = predictHarvestWindow({ crop, referenceDate: fixedToday });
      const res2 = predictHarvestWindow({ crop, referenceDate: fixedToday });

      assert.deepEqual(res1.harvestWindow, res2.harvestWindow);
      assert.equal(res1.readinessStatus, res2.readinessStatus);
      assert.equal(res1.daysUntilHarvest, res2.daysUntilHarvest);
      assert.equal(res1.confidence.score, res2.confidence.score);
    });
  });

  // =========================================================================
  // SUITE 2: REST API ENDPOINTS & MULTI-TENANT ISOLATION
  // =========================================================================
  describe("2. Forecast REST API & Ownership Isolation", () => {
    let server;
    let baseUrl;

    const userA = {
      id: "user-fc-alpha-789",
      email: "fc_alpha@example.com",
      name: "Farmer Forecast Alpha",
      role: "FARMER",
    };
    const userB = {
      id: "user-fc-beta-987",
      email: "fc_beta@example.com",
      name: "Farmer Forecast Beta",
      role: "FARMER",
    };

    const tokenA = generateToken(userA);
    const tokenB = generateToken(userB);

    let farmA;
    let farmB;
    let cropA1;
    let cropA2;
    let cropB1;

    before(async () => {
      // 1. Seed test users
      await prisma.user.upsert({
        where: { id: userA.id },
        update: {},
        create: {
          id: userA.id,
          email: userA.email,
          name: userA.name,
          passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$demo$demo",
          role: "FARMER",
        },
      });

      await prisma.user.upsert({
        where: { id: userB.id },
        update: {},
        create: {
          id: userB.id,
          email: userB.email,
          name: userB.name,
          passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$demo$demo",
          role: "FARMER",
        },
      });

      // 2. Seed test farms
      farmA = await prisma.farm.create({
        data: {
          userId: userA.id,
          name: "Alpha Valley Farm",
          state: "Punjab",
          district: "Patiala",
          area: 20.0,
          areaUnit: "HECTARE",
        },
      });

      farmB = await prisma.farm.create({
        data: {
          userId: userB.id,
          name: "Beta Orchard",
          state: "Haryana",
          district: "Karnal",
          area: 12.0,
          areaUnit: "ACRE",
        },
      });

      // 3. Seed crops for User A
      cropA1 = await prisma.crop.create({
        data: {
          farmId: farmA.id,
          cropName: "Wheat",
          variety: "HD-3086",
          sowingDate: new Date("2025-11-10"),
          growthStage: "FLOWERING",
        },
      });

      cropA2 = await prisma.crop.create({
        data: {
          farmId: farmA.id,
          cropName: "Mustard",
          sowingDate: new Date("2025-10-20"),
          growthStage: "HARVEST_READY",
        },
      });

      // 4. Seed crops for User B
      cropB1 = await prisma.crop.create({
        data: {
          farmId: farmB.id,
          cropName: "Cotton",
          sowingDate: new Date("2025-06-01"),
        },
      });

      // 5. Start HTTP test server
      await new Promise((resolve) => {
        server = http.createServer(app);
        server.listen(0, () => {
          baseUrl = `http://localhost:${server.address().port}`;
          resolve();
        });
      });
    });

    after(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }

      // Cleanup
      await prisma.crop.deleteMany({
        where: { id: { in: [cropA1.id, cropA2.id, cropB1.id] } },
      }).catch(() => {});

      await prisma.farm.deleteMany({
        where: { id: { in: [farmA.id, farmB.id] } },
      }).catch(() => {});

      await prisma.user.deleteMany({
        where: { id: { in: [userA.id, userB.id] } },
      }).catch(() => {});
    });

    test("1. Reject unauthenticated requests with 401", async () => {
      const res = await fetch(`${baseUrl}/api/forecasts`);
      assert.equal(res.status, 401);
    });

    test("2. GET /api/forecasts returns forecasts scoped only to authenticated user's crops", async () => {
      const resA = await fetch(`${baseUrl}/api/forecasts`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(resA.status, 200);
      const dataA = await resA.json();
      assert.equal(dataA.success, true);
      assert.ok(Array.isArray(dataA.data.forecasts));
      assert.equal(dataA.data.forecasts.length, 2);

      const returnedCropIds = dataA.data.forecasts.map((f) => f.cropId);
      assert.ok(returnedCropIds.includes(cropA1.id));
      assert.ok(returnedCropIds.includes(cropA2.id));
      assert.ok(!returnedCropIds.includes(cropB1.id), "User A should NOT see User B's forecasts");
    });

    test("3. GET /api/forecasts?farmId filters by specific farm", async () => {
      const res = await fetch(`${baseUrl}/api/forecasts?farmId=${farmA.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.data.forecasts.length, 2);
    });

    test("4. GET /api/forecasts?cropId filters by specific crop", async () => {
      const res = await fetch(`${baseUrl}/api/forecasts?cropId=${cropA1.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.data.forecasts.length, 1);
      assert.equal(data.data.forecasts[0].cropId, cropA1.id);
    });

    test("5. GET /api/forecasts/:cropId retrieves single forecast", async () => {
      const res = await fetch(`${baseUrl}/api/forecasts/${cropA1.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.cropId, cropA1.id);
      assert.ok(data.data.harvestWindow.startDate);
    });

    test("6. Cross-user isolation: User B cannot retrieve User A's crop forecast by ID", async () => {
      const res = await fetch(`${baseUrl}/api/forecasts/${cropA1.id}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.equal(res.status, 404);
    });

    test("7. POST /api/forecasts/refresh recalculates all accessible crops", async () => {
      const res = await fetch(`${baseUrl}/api/forecasts/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.processed, 2);
      assert.equal(data.data.updated, 2);
      assert.equal(data.data.failed, 0);
    });

    test("8. POST /api/forecasts/refresh with cropId scope refreshes only targeted crop", async () => {
      const res = await fetch(`${baseUrl}/api/forecasts/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cropId: cropA1.id }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.data.processed, 1);
      assert.equal(data.data.forecasts[0].cropId, cropA1.id);
    });

    test("9. User B cannot refresh User A's farm or crop", async () => {
      // Attempt to refresh User A's farm
      const resFarm = await fetch(`${baseUrl}/api/forecasts/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenB}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ farmId: farmA.id }),
      });
      assert.equal(resFarm.status, 404);

      // Attempt to refresh User A's crop
      const resCrop = await fetch(`${baseUrl}/api/forecasts/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenB}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cropId: cropA1.id }),
      });
      assert.equal(resCrop.status, 404);
    });
  });
});
