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
import { buildWeatherContext } from "../src/modules/forecasts/weatherContext.js";

describe("Phase 4 + Phase 5 — Weather-Aware Harvest Window Prediction Integration Tests", () => {
  const fixedRefDate = new Date(Date.UTC(2026, 2, 1)); // 2026-03-01

  // =========================================================================
  // 1. WEATHER CONTEXT INTERFACE & VALIDATION UNIT TESTS
  // =========================================================================
  describe("1. Weather Context Interface & Validation", () => {
    test("6. Normalizes valid Phase 4 weather into structured WeatherContext", () => {
      const rawWeather = {
        farm: { id: "farm-1", name: "Green Acres", latitude: 28.6139, longitude: 77.209 },
        current: {
          temperatureC: 26.5,
          relativeHumidityPercent: 60,
          precipitationMm: 0,
          condition: "sunny",
          conditionLabel: "Clear sky",
          observedAt: "2026-03-01T10:00:00Z",
        },
        dailyForecast: [
          { date: "2026-03-01", minTempC: 14, maxTempC: 28, precipitationMm: 0 },
          { date: "2026-03-02", minTempC: 15, maxTempC: 30, precipitationMm: 5 },
          { date: "2026-03-03", minTempC: 16, maxTempC: 32, precipitationMm: 25 },
        ],
        warnings: [{ type: "rainfall", severity: "warning", title: "Heavy Rain Alert", message: "25mm expected" }],
        timezone: "Asia/Kolkata",
        provider: "Open-Meteo",
        fetchedAt: new Date().toISOString(),
      };

      const ctx = buildWeatherContext(rawWeather);
      assert.equal(ctx.available, true);
      assert.equal(ctx.latitude, 28.6139);
      assert.equal(ctx.longitude, 77.209);
      assert.equal(ctx.summary10Day.totalRainfallMm, 30);
      assert.equal(ctx.summary10Day.maxDailyRainfallMm, 25);
      assert.equal(ctx.summary10Day.peakMaxTempC, 32);
      assert.equal(ctx.isStale, false);
      assert.equal(ctx.warnings.length, 1);
    });

    test("7. Farm with missing coordinates produces available: false with FARM_COORDINATES_MISSING", () => {
      const ctx = buildWeatherContext({
        farm: { id: "farm-no-coords", latitude: null, longitude: null },
      });
      assert.equal(ctx.available, false);
      assert.equal(ctx.reason, "MISSING_COORDINATES");
      assert.ok(ctx.weatherFactors.some((f) => f.id === "FARM_COORDINATES_MISSING"));
    });

    test("8. Null or non-object weather produces available: false with NO_WEATHER_DATA", () => {
      const ctx = buildWeatherContext(null);
      assert.equal(ctx.available, false);
      assert.equal(ctx.reason, "NO_WEATHER_DATA");
      assert.ok(ctx.weatherFactors.some((f) => f.id === "WEATHER_DATA_UNAVAILABLE"));
    });

    test("9. Stale weather data (>24h) is correctly identified", () => {
      const staleDate = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(); // 36 hours ago
      const rawWeather = {
        farm: { id: "farm-stale", latitude: 20.0, longitude: 75.0 },
        dailyForecast: [{ date: "2026-03-01", minTempC: 18, maxTempC: 30, precipitationMm: 0 }],
        fetchedAt: staleDate,
      };

      const ctx = buildWeatherContext(rawWeather);
      assert.equal(ctx.available, true);
      assert.equal(ctx.isStale, true);
    });

    test("10. Missing measurements and NaN values are handled safely without crash", () => {
      const rawWeather = {
        farm: { id: "farm-nan", latitude: 22.0, longitude: 78.0 },
        dailyForecast: [
          { date: "2026-03-01", minTempC: "invalid", maxTempC: null, precipitationMm: NaN },
          { date: "2026-03-02", minTempC: 20, maxTempC: 32, precipitationMm: -10 }, // negative clamped to 0
        ],
        fetchedAt: new Date().toISOString(),
      };

      const ctx = buildWeatherContext(rawWeather);
      assert.equal(ctx.available, true);
      assert.equal(ctx.summary10Day.totalRainfallMm, 0);
      assert.equal(ctx.summary10Day.peakMaxTempC, 32);
    });
  });

  // =========================================================================
  // 2. AGRONOMIC WEATHER ADJUSTMENT LAYER
  // =========================================================================
  describe("2. Agronomic Weather Adjustment Engine", () => {
    // Sowing on 2025-11-01 -> Wheat HD-3086 (min: 135d -> 2026-03-16, typical: 142d -> 2026-03-23)
    // On 2026-03-01: daysToBaselineStart = 15 days (near harvest!)
    const nearHarvestWheat = {
      id: "crop-wheat-near",
      cropName: "Wheat",
      variety: "HD-3086",
      sowingDate: "2025-11-01",
    };

    test("11. Heavy rainfall near harvest delays harvest window (+3 to +4 days)", () => {
      const weatherContext = buildWeatherContext({
        farm: { id: "f1", latitude: 28.5, longitude: 77.2 },
        dailyForecast: [
          { date: "2026-03-01", minTempC: 16, maxTempC: 28, precipitationMm: 40 }, // heavy rain
          { date: "2026-03-02", minTempC: 16, maxTempC: 26, precipitationMm: 25 },
          { date: "2026-03-03", minTempC: 15, maxTempC: 27, precipitationMm: 15 },
        ],
        fetchedAt: new Date().toISOString(),
      });

      const result = predictHarvestWindow({
        crop: nearHarvestWheat,
        referenceDate: fixedRefDate,
        weatherContext,
      });

      assert.equal(result.weatherAdjustmentApplied, true);
      assert.equal(result.weatherAdjustmentStatus, "APPLIED");
      assert.ok(result.weatherAdjustmentDays >= 3);
      assert.ok(result.contributingFactors.some((f) => f.id === "HEAVY_RAINFALL_HARVEST_DELAY"));

      // Baseline remains intact
      assert.equal(result.baselineHarvestWindow.startDate, "2026-03-16");
      assert.equal(result.baselineHarvestWindow.typicalDate, "2026-03-23");

      // Adjusted window delayed
      assert.ok(result.adjustedHarvestWindow !== null);
      assert.ok(result.adjustedHarvestWindow.startDate > result.baselineHarvestWindow.startDate);
      assert.equal(result.harvestWindow.startDate, result.adjustedHarvestWindow.startDate);
    });

    test("12. High temperature stress accelerates ripening/senescence (-2 days)", () => {
      const weatherContext = buildWeatherContext({
        farm: { id: "f1", latitude: 28.5, longitude: 77.2 },
        dailyForecast: [
          { date: "2026-03-01", minTempC: 24, maxTempC: 41, precipitationMm: 0 },
          { date: "2026-03-02", minTempC: 25, maxTempC: 42, precipitationMm: 0 },
          { date: "2026-03-03", minTempC: 26, maxTempC: 40, precipitationMm: 0 },
        ],
        fetchedAt: new Date().toISOString(),
      });

      const result = predictHarvestWindow({
        crop: nearHarvestWheat,
        referenceDate: fixedRefDate,
        weatherContext,
      });

      assert.equal(result.weatherAdjustmentApplied, true);
      assert.equal(result.weatherAdjustmentStatus, "APPLIED");
      assert.ok(result.weatherAdjustmentDays < 0);
      assert.ok(result.contributingFactors.some((f) => f.id === "TEMPERATURE_HEAT_ACCELERATION"));
      assert.ok(result.adjustedHarvestWindow.startDate < result.baselineHarvestWindow.startDate);
    });

    test("13. Cold temperature/frost risk slows ripening (+2 days)", () => {
      const weatherContext = buildWeatherContext({
        farm: { id: "f1", latitude: 28.5, longitude: 77.2 },
        dailyForecast: [
          { date: "2026-03-01", minTempC: 4, maxTempC: 18, precipitationMm: 0 },
          { date: "2026-03-02", minTempC: 3, maxTempC: 17, precipitationMm: 0 },
        ],
        fetchedAt: new Date().toISOString(),
      });

      const result = predictHarvestWindow({
        crop: nearHarvestWheat,
        referenceDate: fixedRefDate,
        weatherContext,
      });

      assert.equal(result.weatherAdjustmentApplied, true);
      assert.equal(result.weatherAdjustmentStatus, "APPLIED");
      assert.ok(result.weatherAdjustmentDays > 0);
      assert.ok(result.contributingFactors.some((f) => f.id === "COLD_TEMPERATURE_RETARDATION"));
    });

    test("14. Early vegetative crop does not apply 10-day short forecast to full-season maturity", () => {
      const earlyVegetativeCrop = {
        id: "crop-early-veg",
        cropName: "Cotton",
        sowingDate: "2026-02-15", // Cotton takes 160 days, only 14 days old on March 1!
      };

      const stormyWeather = buildWeatherContext({
        farm: { id: "f1", latitude: 28.5, longitude: 77.2 },
        dailyForecast: [
          { date: "2026-03-01", minTempC: 16, maxTempC: 28, precipitationMm: 50 },
        ],
        fetchedAt: new Date().toISOString(),
      });

      const result = predictHarvestWindow({
        crop: earlyVegetativeCrop,
        referenceDate: fixedRefDate,
        weatherContext: stormyWeather,
      });

      // Does not shift dates months away!
      assert.equal(result.weatherAdjustmentApplied, false);
      assert.equal(result.weatherAdjustmentStatus, "NOT_APPLIED");
      assert.equal(result.weatherAdjustmentDays, 0);
      assert.equal(result.adjustedHarvestWindow, null);
      assert.ok(result.contributingFactors.some((f) => f.id === "WEATHER_MONITORED_EARLY_STAGE"));
    });

    test("15. Stale weather data (>24h) bypasses adjustments to protect prediction integrity", () => {
      const staleWeather = buildWeatherContext({
        farm: { id: "f1", latitude: 28.5, longitude: 77.2 },
        dailyForecast: [
          { date: "2026-03-01", minTempC: 25, maxTempC: 42, precipitationMm: 0 },
          { date: "2026-03-02", minTempC: 25, maxTempC: 42, precipitationMm: 0 },
          { date: "2026-03-03", minTempC: 25, maxTempC: 42, precipitationMm: 0 },
        ],
        fetchedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48h old
      });

      const result = predictHarvestWindow({
        crop: nearHarvestWheat,
        referenceDate: fixedRefDate,
        weatherContext: staleWeather,
      });

      assert.equal(result.weatherAdjustmentApplied, false);
      assert.equal(result.weatherAdjustmentStatus, "NOT_APPLIED");
      assert.equal(result.adjustedHarvestWindow, null);
      assert.ok(result.contributingFactors.some((f) => f.id === "WEATHER_DATA_STALE"));
    });

    test("16. Benign weather conditions retain baseline and log WEATHER_CONDITIONS_OPTIMAL", () => {
      const mildWeather = buildWeatherContext({
        farm: { id: "f1", latitude: 28.5, longitude: 77.2 },
        dailyForecast: [
          { date: "2026-03-01", minTempC: 16, maxTempC: 26, precipitationMm: 2 },
          { date: "2026-03-02", minTempC: 17, maxTempC: 27, precipitationMm: 0 },
        ],
        fetchedAt: new Date().toISOString(),
      });

      const result = predictHarvestWindow({
        crop: nearHarvestWheat,
        referenceDate: fixedRefDate,
        weatherContext: mildWeather,
      });

      assert.equal(result.weatherAdjustmentApplied, false);
      assert.equal(result.weatherAdjustmentStatus, "NOT_APPLIED");
      assert.equal(result.weatherAdjustmentDays, 0);
      assert.equal(result.adjustedHarvestWindow, null);
      assert.ok(result.contributingFactors.some((f) => f.id === "WEATHER_CONDITIONS_OPTIMAL"));
    });

    test("17. Refreshes recalculate cleanly from baseline without compounding adjustments", () => {
      const stormyWeather = buildWeatherContext({
        farm: { id: "f1", latitude: 28.5, longitude: 77.2 },
        dailyForecast: [
          { date: "2026-03-01", minTempC: 16, maxTempC: 28, precipitationMm: 45 },
          { date: "2026-03-02", minTempC: 16, maxTempC: 28, precipitationMm: 35 },
        ],
        fetchedAt: new Date().toISOString(),
      });

      // First calculation
      const res1 = predictHarvestWindow({
        crop: nearHarvestWheat,
        referenceDate: fixedRefDate,
        weatherContext: stormyWeather,
      });

      // Second calculation (simulating refresh)
      const res2 = predictHarvestWindow({
        crop: nearHarvestWheat,
        referenceDate: fixedRefDate,
        weatherContext: stormyWeather,
      });

      // Dates must match exactly, never compound or accumulate!
      assert.deepEqual(res1.harvestWindow, res2.harvestWindow);
      assert.deepEqual(res1.baselineHarvestWindow, res2.baselineHarvestWindow);
      assert.deepEqual(res1.adjustedHarvestWindow, res2.adjustedHarvestWindow);
      assert.equal(res1.weatherAdjustmentDays, res2.weatherAdjustmentDays);
    });
  });

  // =========================================================================
  // 3. FULL REST API & ENDPOINT INTEGRATION
  // =========================================================================
  describe("3. REST API Endpoint Integration", () => {
    let server;
    let baseUrl;
    let userA;
    let userB;
    let farmWithCoords;
    let farmNoCoords;
    let cropOnFarmWithCoords;
    let cropOnFarmNoCoords;

    before(async () => {
      server = http.createServer(app);
      await new Promise((resolve) => server.listen(0, resolve));
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;

      const timestamp = Date.now();

      // Create test user A
      const emailA = `test-int-a-${timestamp}@example.com`;
      const uA = await prisma.user.create({
        data: {
          name: "User Weather A",
          email: emailA,
          passwordHash: "hash",
          role: "FARMER",
        },
      });
      userA = {
        ...uA,
        token: generateToken(uA),
      };

      // Create test user B
      const emailB = `test-int-b-${timestamp}@example.com`;
      const uB = await prisma.user.create({
        data: {
          name: "User Weather B",
          email: emailB,
          passwordHash: "hash",
          role: "FARMER",
        },
      });
      userB = {
        ...uB,
        token: generateToken(uB),
      };

      // Create Farm with valid coordinates (New Delhi / Karnal agricultural zone)
      farmWithCoords = await prisma.farm.create({
        data: {
          userId: userA.id,
          name: "Karnal Experimental Farm",
          state: "Haryana",
          district: "Karnal",
          latitude: 29.6857,
          longitude: 76.9905,
          area: 12.5,
          areaUnit: "ACRE",
        },
      });

      // Create Farm without coordinates
      farmNoCoords = await prisma.farm.create({
        data: {
          userId: userA.id,
          name: "Remote Farm No Coords",
          state: "Punjab",
          district: "Ludhiana",
          latitude: null,
          longitude: null,
          area: 8.0,
          areaUnit: "ACRE",
        },
      });

      // Create crops
      cropOnFarmWithCoords = await prisma.crop.create({
        data: {
          farmId: farmWithCoords.id,
          cropName: "Wheat",
          variety: "HD-3086",
          sowingDate: new Date("2025-11-01"),
          growthStage: "RIPENING",
        },
      });

      cropOnFarmNoCoords = await prisma.crop.create({
        data: {
          farmId: farmNoCoords.id,
          cropName: "Mustard",
          variety: "Pusa Bold",
          sowingDate: new Date("2025-10-15"),
          growthStage: "FLOWERING",
        },
      });
    });

    after(async () => {
      // Clean up test data
      await prisma.crop.deleteMany({
        where: {
          farmId: { in: [farmWithCoords?.id, farmNoCoords?.id].filter(Boolean) },
        },
      });
      await prisma.farm.deleteMany({
        where: {
          id: { in: [farmWithCoords?.id, farmNoCoords?.id].filter(Boolean) },
        },
      });
      if (userA) await prisma.user.delete({ where: { id: userA.id } });
      if (userB) await prisma.user.delete({ where: { id: userB.id } });

      await new Promise((resolve) => server.close(resolve));
    });

    test("18. GET /api/forecasts retrieves forecasts with weather-aware response structure", async () => {
      const res = await fetch(`${baseUrl}/api/forecasts`, {
        headers: { Authorization: `Bearer ${userA.token}` },
      });
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data.forecasts));
      assert.ok(body.data.forecasts.length >= 2);

      // Verify each forecast includes baselineHarvestWindow and weather metadata
      for (const fc of body.data.forecasts) {
        assert.ok(fc.baselineHarvestWindow);
        assert.ok(fc.baselineHarvestWindow.startDate);
        assert.ok(fc.baselineHarvestWindow.typicalDate);
        assert.ok(fc.baselineHarvestWindow.endDate);
        assert.ok(["APPLIED", "NOT_APPLIED", "UNAVAILABLE"].includes(fc.weatherAdjustmentStatus));
        assert.ok(typeof fc.weatherAdjustmentApplied === "boolean");
        assert.ok(Array.isArray(fc.weatherFactors));
      }
    });

    test("19. Farm with missing coordinates receives baseline forecast with UNAVAILABLE weather status", async () => {
      const res = await fetch(`${baseUrl}/api/forecasts/${cropOnFarmNoCoords.id}`, {
        headers: { Authorization: `Bearer ${userA.token}` },
      });
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      const fc = body.data;
      assert.equal(fc.cropName, "Mustard");
      assert.ok(fc.harvestWindow.startDate !== null);
      assert.equal(fc.weatherAdjustmentStatus, "UNAVAILABLE");
      assert.equal(fc.weatherAdjustmentApplied, false);
      assert.equal(fc.adjustedHarvestWindow, null);
      assert.ok(fc.contributingFactors.some((f) => f.id === "FARM_COORDINATES_MISSING" || f.id === "WEATHER_DATA_UNAVAILABLE"));
    });

    test("20. POST /api/forecasts/refresh updates forecasts and reports actual success metrics", async () => {
      const res = await fetch(`${baseUrl}/api/forecasts/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userA.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ farmId: farmWithCoords.id }),
      });
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.processed >= 1);
      assert.equal(body.data.failed, 0);
      assert.ok(Array.isArray(body.data.forecasts));
    });

    test("21. User B cannot access User A's forecasts or trigger refresh", async () => {
      const res = await fetch(`${baseUrl}/api/forecasts/${cropOnFarmWithCoords.id}`, {
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      assert.equal(res.status, 404);

      const refreshRes = await fetch(`${baseUrl}/api/forecasts/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userB.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ farmId: farmWithCoords.id }),
      });
      assert.equal(refreshRes.status, 404);
    });

    test("22. Phase 4 GET /api/weather/:farmId continues working without interruption", async () => {
      const res = await fetch(`${baseUrl}/api/weather/${farmWithCoords.id}`, {
        headers: { Authorization: `Bearer ${userA.token}` },
      });
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.current);
      assert.ok(Array.isArray(body.data.dailyForecast));
    });
  });
});
