import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { generateToken } from "../src/middleware/authenticate.js";
import { evaluateHarvestWeatherRisk } from "../src/modules/weather/weatherRisk.engine.js";
import { resolveCropRiskConfig } from "../src/modules/weather/weatherRisk.config.js";
import {
  normalizeDailyForecastRecords,
  kmhToMps,
  mpsToKmh,
  validateNumeric,
} from "../src/modules/weather/weather.normalizer.js";
import {
  HARVEST_SUITABILITY,
  URGENCY_LEVEL,
  CONFIDENCE_LEVEL,
  RISK_CATEGORY,
  RISK_SEVERITY,
} from "../src/modules/weather/weatherRisk.constants.js";
import { createFarm } from "../src/modules/farms/farms.service.js";
import { createCrop } from "../src/modules/crops/crops.service.js";

describe("Phase AI-3 — Weather Intelligence & Harvest Risk Engine Tests", () => {
  let server;
  let baseUrl;

  const userA = { id: "user-ai3-test-a-111", email: "ai3-a@example.com", role: "FARMER" };
  const userB = { id: "user-ai3-test-b-222", email: "ai3-b@example.com", role: "FARMER" };
  const tokenA = generateToken(userA);
  const tokenB = generateToken(userB);

  let farmAWithCoords;
  let farmAWithoutCoords;
  let cropWheat;
  let cropPaddy;
  let cropCotton;

  before(async () => {
    // Start local test server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });

    // Create farms for User A
    farmAWithCoords = await createFarm(userA.id, {
      name: "Green Valley Farm",
      state: "Punjab",
      district: "Ludhiana",
      latitude: 30.901,
      longitude: 75.8573,
      area: 8.5,
      areaUnit: "hectare",
    });

    farmAWithoutCoords = await createFarm(userA.id, {
      name: "Remote Plot",
      state: "Punjab",
      district: "Patiala",
      area: 4.0,
      areaUnit: "acre",
    });

    // Create crops for User A
    cropWheat = await createCrop(userA.id, {
      farmId: farmAWithCoords.id,
      cropName: "Wheat",
      variety: "HD-2967",
      sowingDate: "2026-10-01",
      expectedHarvestDate: "2026-10-18",
      growthStage: "Ripening",
    });

    cropPaddy = await createCrop(userA.id, {
      farmId: farmAWithCoords.id,
      cropName: "Paddy",
      variety: "Basmati-1121",
      sowingDate: "2026-06-15",
      expectedHarvestDate: "2026-10-25",
      growthStage: "Maturing",
    });

    cropCotton = await createCrop(userA.id, {
      farmId: farmAWithCoords.id,
      cropName: "Cotton",
      variety: "Bt-Cotton",
      sowingDate: "2026-05-10",
      expectedHarvestDate: "2026-10-15",
      growthStage: "Ripening",
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // =========================================================================
  // 1. Weather Normalizer & Units Conversion Unit Tests
  // =========================================================================
  describe("1. Weather Normalization & Unit Conversions", () => {
    test("converts km/h to m/s accurately", () => {
      assert.equal(kmhToMps(36), 10.0);
      assert.equal(kmhToMps(0), 0.0);
      assert.equal(kmhToMps(18), 5.0);
      assert.equal(kmhToMps(null), null);
    });

    test("converts m/s to km/h accurately", () => {
      assert.equal(mpsToKmh(10), 36.0);
      assert.equal(mpsToKmh(5), 18.0);
      assert.equal(mpsToKmh(null), null);
    });

    test("validates numeric physical boundaries", () => {
      assert.equal(validateNumeric(25, -50, 60, "temp"), 25);
      assert.equal(validateNumeric(150, -50, 60, "temp"), null); // exceeds max
      assert.equal(validateNumeric(-80, -50, 60, "temp"), null); // below min
      assert.equal(validateNumeric("invalid", -50, 60, "temp"), null);
    });

    test("normalizes raw daily records array into internal schema with data quality tracking", () => {
      const mockRawDays = [
        {
          date: "2026-10-11",
          minTempC: 18.5,
          maxTempC: 32.0,
          rainfallMm: 4.5,
          precipitationProbabilityMax: 65,
          maxWindSpeedKmh: 28.8,
          humidityPercent: 72,
          weatherCode: 61,
        },
        {
          date: "2026-10-12",
          minTempC: 19.0,
          maxTempC: 31.5,
          rainfallMm: 0,
          precipitationProbabilityMax: 10,
          maxWindSpeedKmh: 14.4,
          weatherCode: 1,
        },
      ];

      const { records, dataQuality } = normalizeDailyForecastRecords(mockRawDays, {
        provider: "Open-Meteo",
      });

      assert.equal(records.length, 2);
      assert.equal(records[0].date, "2026-10-11");
      assert.equal(records[0].windSpeedMps, 8.0); // 28.8 kmh / 3.6 = 8.0 mps
      assert.equal(records[0].rainfallMm, 4.5);
      assert.equal(records[0].precipitationProbabilityPercent, 65);
      assert.equal(records[0].weatherCondition, "rain");
      assert.equal(dataQuality.recordCount, 2);
    });

    test("handles empty daily forecast gracefully with incomplete flag", () => {
      const { records, dataQuality } = normalizeDailyForecastRecords([]);
      assert.equal(records.length, 0);
      assert.equal(dataQuality.complete, false);
      assert.ok(dataQuality.missingFields.includes("dailyForecast"));
    });
  });

  // =========================================================================
  // 2. Crop Risk Configuration & Benchmark Resolution
  // =========================================================================
  describe("2. Crop Sensitivity Configurations", () => {
    test("resolves verified Wheat benchmarks accurately", () => {
      const cfg = resolveCropRiskConfig("Wheat", "HD-2967");
      assert.equal(cfg.cropName, "Wheat");
      assert.equal(cfg.isGeneric, false);
      assert.equal(cfg.rainfall.harvestDamageThresholdMm, 8.0);
      assert.equal(cfg.wind.lodgingSpeedMps, 10.5);
      assert.ok(cfg.evidenceSource.includes("ICAR"));
    });

    test("resolves aliases like 'dhan' or 'rice' to Paddy", () => {
      const cfg = resolveCropRiskConfig("dhan");
      assert.equal(cfg.cropName, "Paddy");
      assert.equal(cfg.isGeneric, false);
    });

    test("falls back to generic conservative configuration for unverified crops with isGeneric flag", () => {
      const cfg = resolveCropRiskConfig("Dragonfruit");
      assert.equal(cfg.cropName, "Dragonfruit");
      assert.equal(cfg.isGeneric, true);
      assert.ok(cfg.evidenceSource.includes("Conservative"));
    });
  });

  // =========================================================================
  // 3. Pure Risk Engine Scoring & Explainability
  // =========================================================================
  describe("3. Deterministic Risk Engine Evaluation", () => {
    const mockRefDate = new Date("2026-10-11T00:00:00Z");

    const benignForecast = Array.from({ length: 10 }, (_, i) => {
      const day = i + 11;
      return {
        date: `2026-10-${day}`,
        temperatureC: 25,
        minTempC: 18,
        maxTempC: 32,
        humidityPercent: 55,
        precipitationProbabilityPercent: 5,
        rainfallMm: 0,
        windSpeedMps: 4.0,
        windGustMps: 6.0,
        weatherCondition: "clear",
      };
    });

    test("Scenario 1: Favorable benign weather produces FAVORABLE suitability and low score", () => {
      const assessment = evaluateHarvestWeatherRisk({
        crop: {
          cropName: "Wheat",
          growthStage: "Ripening",
        },
        harvestPrediction: {
          estimatedHarvestStart: "2026-10-14",
          estimatedHarvestEnd: "2026-10-18",
          mostLikelyHarvestDate: "2026-10-16",
          daysUntilHarvest: 5,
        },
        forecastRecords: benignForecast,
        referenceDate: mockRefDate,
      });

      assert.equal(assessment.harvestSuitability, HARVEST_SUITABILITY.FAVORABLE);
      assert.ok(assessment.overallRiskScore < 30);
      assert.equal(assessment.urgency, URGENCY_LEVEL.LOW);
      assert.equal(assessment.confidence, CONFIDENCE_LEVEL.HIGH);
      assert.ok(assessment.explanation.length > 0);
      assert.ok(assessment.recommendations.length > 0);
    });

    test("Scenario 2: Heavy rainfall overlapping active harvest window triggers UNFAVORABLE and high risk", () => {
      const rainyForecast = benignForecast.map((day, idx) => {
        if (idx === 3 || idx === 4) {
          // 2026-10-14 and 2026-10-15: heavy rain overlapping window
          return {
            ...day,
            rainfallMm: 35.0,
            precipitationProbabilityPercent: 90,
            weatherCondition: "rain",
          };
        }
        return day;
      });

      const assessment = evaluateHarvestWeatherRisk({
        crop: {
          cropName: "Wheat",
          growthStage: "Ripening",
        },
        harvestPrediction: {
          estimatedHarvestStart: "2026-10-14",
          estimatedHarvestEnd: "2026-10-18",
          daysUntilHarvest: 3,
        },
        forecastRecords: rainyForecast,
        referenceDate: mockRefDate,
      });

      assert.equal(assessment.harvestSuitability, HARVEST_SUITABILITY.UNFAVORABLE);
      assert.ok(assessment.overallRiskScore >= 65);
      const rainRisk = assessment.risks.find((r) => r.category === RISK_CATEGORY.RAINFALL);
      assert.ok(rainRisk);
      assert.equal(rainRisk.severity, RISK_SEVERITY.HIGH);
      assert.ok(rainRisk.observedOrForecastValues.maxDailyRainfallMm >= 35);
      assert.ok(assessment.explanation.some((e) => e.includes("rainfall")));
    });

    test("Scenario 3: High precipitation probability with low expected rain (light drizzle) returns moderate/caution score", () => {
      const drizzleForecast = benignForecast.map((day, idx) => {
        if (idx === 2) {
          return {
            ...day,
            rainfallMm: 2.0, // light rain
            precipitationProbabilityPercent: 85, // high prob
          };
        }
        return day;
      });

      const assessment = evaluateHarvestWeatherRisk({
        crop: {
          cropName: "Wheat",
        },
        harvestPrediction: {
          estimatedHarvestStart: "2026-10-13",
          estimatedHarvestEnd: "2026-10-17",
        },
        forecastRecords: drizzleForecast,
        referenceDate: mockRefDate,
      });

      // Does not manufacture an extreme or catastrophic score merely from probability
      assert.notEqual(assessment.harvestSuitability, HARVEST_SUITABILITY.UNFAVORABLE);
      assert.ok(assessment.overallRiskScore < 50);
    });

    test("Scenario 4: High sustained relative humidity triggers HUMIDITY_DRYING risk and storage guidance", () => {
      const humidForecast = benignForecast.map((day) => ({
        ...day,
        humidityPercent: 88,
      }));

      const assessment = evaluateHarvestWeatherRisk({
        crop: {
          cropName: "Paddy",
        },
        harvestPrediction: {
          estimatedHarvestStart: "2026-10-12",
          estimatedHarvestEnd: "2026-10-18",
        },
        forecastRecords: humidForecast,
        referenceDate: mockRefDate,
      });

      const humRisk = assessment.risks.find((r) => r.category === RISK_CATEGORY.HUMIDITY_DRYING);
      assert.ok(humRisk);
      assert.ok(humRisk.score >= 50);
      assert.ok(assessment.recommendations.some((rec) => rec.includes("drying") || rec.includes("storage")));
    });

    test("Scenario 5: Strong wind exceeding lodging threshold triggers WIND risk", () => {
      const windyForecast = benignForecast.map((day, idx) => {
        if (idx === 1) {
          return {
            ...day,
            windSpeedMps: 14.0, // exceeds wheat 10.5 mps threshold
            windGustMps: 18.0,
          };
        }
        return day;
      });

      const assessment = evaluateHarvestWeatherRisk({
        crop: {
          cropName: "Wheat",
        },
        harvestPrediction: {
          estimatedHarvestStart: "2026-10-12",
          estimatedHarvestEnd: "2026-10-16",
        },
        forecastRecords: windyForecast,
        referenceDate: mockRefDate,
      });

      const windRisk = assessment.risks.find((r) => r.category === RISK_CATEGORY.WIND);
      assert.ok(windRisk);
      assert.ok(windRisk.score >= 40);
      assert.ok(assessment.explanation.some((e) => e.includes("lodging") || e.includes("wind")));
    });

    test("Scenario 6: Unverified crop uses generic thresholds with MODERATE confidence", () => {
      const assessment = evaluateHarvestWeatherRisk({
        crop: {
          cropName: "Avocado",
        },
        harvestPrediction: {
          estimatedHarvestStart: "2026-10-14",
          estimatedHarvestEnd: "2026-10-18",
        },
        forecastRecords: benignForecast,
        referenceDate: mockRefDate,
      });

      assert.equal(assessment.confidence, CONFIDENCE_LEVEL.MODERATE);
      assert.equal(assessment.dataQuality.isGenericThresholds, true);
    });

    test("Scenario 7: Harvest window entirely outside 10-day forecast horizon sets LOW confidence and explicit advisory", () => {
      const assessment = evaluateHarvestWeatherRisk({
        crop: {
          cropName: "Wheat",
        },
        harvestPrediction: {
          estimatedHarvestStart: "2026-11-20", // 40 days away
          estimatedHarvestEnd: "2026-11-28",
        },
        forecastRecords: benignForecast, // ends 2026-10-20
        referenceDate: mockRefDate,
      });

      assert.equal(assessment.confidence, CONFIDENCE_LEVEL.LOW);
      assert.equal(assessment.dataQuality.windowCompletelyOutside, true);
      assert.ok(assessment.explanation.some((e) => e.includes("horizon") || e.includes("beyond")));
    });

    test("Scenario 8: Missing harvest prediction evaluates current field conditions and flags window missing", () => {
      const assessment = evaluateHarvestWeatherRisk({
        crop: {
          cropName: "Wheat",
        },
        harvestPrediction: null,
        forecastRecords: benignForecast,
        referenceDate: mockRefDate,
      });

      assert.equal(assessment.harvestWindow, null);
      assert.equal(assessment.confidence, CONFIDENCE_LEVEL.LOW);
      assert.ok(assessment.explanation.some((e) => e.includes("Harvest window is not yet established")));
    });

    test("Scenario 9: Severe adverse weather within 48 hours for mature crop triggers CRITICAL urgency", () => {
      const imminentStormForecast = benignForecast.map((day, idx) => {
        if (idx === 0) {
          // today/tomorrow
          return {
            ...day,
            rainfallMm: 45.0,
            precipitationProbabilityPercent: 95,
            windSpeedMps: 15.0,
          };
        }
        return day;
      });

      const assessment = evaluateHarvestWeatherRisk({
        crop: {
          cropName: "Wheat",
          growthStage: "Maturity / Ready to harvest",
        },
        harvestPrediction: {
          estimatedHarvestStart: "2026-10-11",
          estimatedHarvestEnd: "2026-10-14",
          daysUntilHarvest: 0,
        },
        forecastRecords: imminentStormForecast,
        referenceDate: mockRefDate,
      });

      assert.equal(assessment.urgency, URGENCY_LEVEL.CRITICAL);
      assert.equal(assessment.harvestSuitability, HARVEST_SUITABILITY.UNFAVORABLE);
    });

    test("Scenario 10: Pure determinism — identical inputs produce identical scores", () => {
      const input = {
        crop: { cropName: "Wheat" },
        harvestPrediction: {
          estimatedHarvestStart: "2026-10-14",
          estimatedHarvestEnd: "2026-10-18",
        },
        forecastRecords: benignForecast,
        referenceDate: mockRefDate,
      };

      const res1 = evaluateHarvestWeatherRisk(input);
      const res2 = evaluateHarvestWeatherRisk(input);

      assert.equal(res1.overallRiskScore, res2.overallRiskScore);
      assert.equal(res1.harvestSuitability, res2.harvestSuitability);
      assert.equal(res1.urgency, res2.urgency);
      assert.equal(res1.confidence, res2.confidence);
    });
  });

  // =========================================================================
  // 4. REST API Endpoint Integration & Security
  // =========================================================================
  describe("4. REST API Endpoints & Security", () => {
    test("GET /api/crops/:cropId/weather-risk rejects unauthenticated request with 401", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/weather-risk`);
      assert.equal(res.status, 401);
    });

    test("GET /api/crops/:cropId/weather-risk enforces ownership: User B cannot access User A's crop (404)", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/weather-risk`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.equal(res.status, 404);
    });

    test("GET /api/crops/:cropId/weather-risk succeeds for User A with complete response contract", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/weather-risk`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data);
      assert.equal(json.data.cropName, "Wheat");
      assert.ok(typeof json.data.overallRiskScore === "number");
      assert.ok(["FAVORABLE", "CAUTION", "UNFAVORABLE", "INSUFFICIENT_DATA"].includes(json.data.harvestSuitability));
      assert.ok(["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(json.data.urgency));
      assert.ok(Array.isArray(json.data.risks));
      assert.ok(Array.isArray(json.data.explanation));
      assert.ok(Array.isArray(json.data.recommendations));
      assert.ok(json.data.forecastCoverage);
      assert.ok(json.data.source);
    });

    test("POST /api/crops/:cropId/weather-risk/refresh successfully forces fresh assessment", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/weather-risk/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.overallRiskScore !== undefined);
    });

    test("GET /api/farms/:farmId/weather-risk evaluates all crops on the farm and summarizes posture", async () => {
      const res = await fetch(`${baseUrl}/api/farms/${farmAWithCoords.id}/weather-risk`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.summary);
      assert.ok(json.data.summary.totalCropsAssessed >= 3);
      assert.ok(Array.isArray(json.data.crops));
      assert.ok(json.data.weather.current);
    });

    test("GET /api/farms/:farmId/weather-risk returns 400 when farm coordinates are missing", async () => {
      const res = await fetch(`${baseUrl}/api/farms/${farmAWithoutCoords.id}/weather-risk`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 400);

      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.message.includes("coordinates"));
    });

    test("GET /api/dashboard/weather-risk supplies dashboard weather intelligence summaries", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard/weather-risk`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.summary);
      assert.ok(json.data.summary.totalCropsAssessed >= 3);
      assert.ok(Array.isArray(json.data.urgentCrops));
      assert.ok(Array.isArray(json.data.upcomingAdverseEvents));
      assert.ok(Array.isArray(json.data.harvestOpportunities));
    });

    test("GET /api/weather/crops/:cropId/risk alias endpoint functions identically", async () => {
      const res = await fetch(`${baseUrl}/api/weather/crops/${cropWheat.id}/risk`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.cropName, "Wheat");
    });
  });
});
