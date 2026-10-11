import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { generateToken } from "../src/middleware/authenticate.js";
import {
  convertToHectares,
  convertToTonnes,
  estimateTotalProduction,
} from "../src/modules/yield/productionEstimator.service.js";
import { createFarm } from "../src/modules/farms/farms.service.js";
import { createCrop } from "../src/modules/crops/crops.service.js";

describe("Phase AI-5 — Yield Forecasting & Production Estimation Engine Tests", () => {
  let server;
  let baseUrl;

  const userA = { id: "user-ai5-test-a-101", email: "ai5-a@example.com", role: "FARMER" };
  const userB = { id: "user-ai5-test-b-202", email: "ai5-b@example.com", role: "FARMER" };
  const tokenA = generateToken(userA);
  const tokenB = generateToken(userB);

  let farmA;
  let cropWheat;
  let cropPaddy;

  before(async () => {
    // Start local test server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });

    // Clean up test data if prior exists
    await prisma.yieldPrediction.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    }).catch(() => {});

    await prisma.actualProduction.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    }).catch(() => {});

    await prisma.crop.deleteMany({
      where: { farm: { userId: { in: [userA.id, userB.id] } } },
    }).catch(() => {});

    await prisma.farm.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    }).catch(() => {});

    // Create users in db
    await prisma.user.createMany({
      data: [
        { id: userA.id, name: "User A (AI-5)", email: userA.email, passwordHash: "mockHash" },
        { id: userB.id, name: "User B (AI-5)", email: userB.email, passwordHash: "mockHash" },
      ],
    });

    // Create Farm for User A
    farmA = await createFarm(userA.id, {
      name: "Sunrise Agro Farm",
      state: "Punjab",
      district: "Patiala",
      latitude: 30.3398,
      longitude: 76.3869,
      area: 6.0,
      areaUnit: "hectare",
      soilType: "Alluvial Soil",
      irrigationSource: "Tube Well",
    });

    // Create Crops for User A
    cropWheat = await createCrop(userA.id, {
      farmId: farmA.id,
      cropName: "Wheat",
      variety: "HD-2967",
      sowingDate: "2026-11-05",
      expectedHarvestDate: "2027-04-10",
      fieldArea: 3.5,
    });

    cropPaddy = await createCrop(userA.id, {
      farmId: farmA.id,
      cropName: "Rice (Paddy)",
      variety: "PR-126",
      sowingDate: "2026-06-15",
      expectedHarvestDate: "2026-10-25",
      fieldArea: 2.5,
    });
  });

  after(async () => {
    // Cleanup
    await prisma.yieldPrediction.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    }).catch(() => {});

    await prisma.actualProduction.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    }).catch(() => {});

    await prisma.crop.deleteMany({
      where: { farm: { userId: { in: [userA.id, userB.id] } } },
    }).catch(() => {});

    await prisma.farm.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    }).catch(() => {});

    if (server) {
      server.close();
    }
  });

  // ==========================================================================
  // 1. UNIT NORMALIZATION & PRODUCTION CALCULATOR UNIT TESTS
  // ==========================================================================

  describe("1. Production Estimation & Unit Normalization", () => {
    test("converts standard area units to hectares accurately", () => {
      assert.equal(convertToHectares(1.0, "HECTARE"), 1.0);
      assert.equal(convertToHectares(2.5, "HA"), 2.5);
      assert.equal(convertToHectares(1.0, "ACRE"), 0.404686);
      assert.equal(convertToHectares(10000, "SQ_METER"), 1.0);
    });

    test("converts harvest quantity to metric tonnes accurately", () => {
      assert.equal(convertToTonnes(1.5, "TONNE"), 1.5);
      assert.equal(convertToTonnes(50, "QUINTAL"), 5.0); // 50 * 0.1 = 5 tonnes
      assert.equal(convertToTonnes(2500, "KG"), 2.5);
    });

    test("rejects invalid or nonpositive area with descriptive AppError", () => {
      assert.throws(() => convertToHectares(0, "HECTARE"), /strictly positive/);
      assert.throws(() => convertToHectares(-3, "ACRE"), /strictly positive/);
      assert.throws(() => convertToHectares(2, "INVALID_UNIT"), /Unsupported area unit/);
    });

    test("computes total expected production and uncertainty bounds", () => {
      const res = estimateTotalProduction({
        yieldTonnesPerHectare: 4.5,
        areaValue: 2.0,
        areaUnit: "HECTARE",
        lowerYield: 3.8,
        upperYield: 5.2,
      });

      assert.equal(res.plantedAreaHectares, 2.0);
      assert.equal(res.predictedYieldTonnesPerHectare, 4.5);
      assert.equal(res.expectedProductionTonnes, 9.0);
      assert.equal(res.lowerProductionTonnes, 7.6);
      assert.equal(res.upperProductionTonnes, 10.4);
    });

    test("computes expected production with acre inputs", () => {
      // 3.5 t/ha on 5 acres (5 * 0.404686 = 2.02343 ha) -> ~7.082 tonnes
      const res = estimateTotalProduction({
        yieldTonnesPerHectare: 3.5,
        areaValue: 5.0,
        areaUnit: "ACRE",
      });
      assert.ok(Math.abs(res.expectedProductionTonnes - 7.082) < 0.05);
    });
  });

  // ==========================================================================
  // 2. REST API ENDPOINTS, AUTHENTICATION & ACCESS CONTROL
  // ==========================================================================

  describe("2. REST API Endpoints & Security", () => {
    test("POST /api/crops/:cropId/yield-prediction rejects unauthenticated requests with 401", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/yield-prediction`, {
        method: "POST",
      });
      assert.equal(res.status, 401);
    });

    test("POST /api/crops/:cropId/yield-prediction enforces ownership: User B cannot predict User A's crop (404)", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/yield-prediction`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenB}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 404);
    });

    test("POST /api/crops/:cropId/yield-prediction succeeds for User A and returns complete response contract", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/yield-prediction`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          annualRainfallMm: 600,
          fertilizerKg: 130,
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      const data = json.data;

      assert.equal(data.cropId, cropWheat.id);
      assert.equal(data.cropName, "Wheat");
      assert.ok(data.yield.value > 0);
      assert.equal(data.yield.unit, "TONNE_PER_HECTARE");
      assert.ok(data.production.value > 0);
      assert.equal(data.production.unit, "TONNE");
      assert.ok(data.plantedArea.areaHectares > 0);
      assert.ok(["HIGH", "MODERATE", "LOW"].includes(data.confidence));
      assert.ok(data.uncertainty.available);
      assert.ok(data.uncertainty.lowerYieldTonnesPerHectare <= data.yield.value);
      assert.ok(data.uncertainty.upperYieldTonnesPerHectare >= data.yield.value);
    });

    test("GET /api/crops/:cropId/yield-prediction retrieves latest cached estimate", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/yield-prediction`, {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.cropId, cropWheat.id);
      assert.ok(json.data.yield.value > 0);
    });

    test("POST /api/crops/:cropId/yield-prediction/refresh forces fresh calculation", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/yield-prediction/refresh`, {
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
      assert.ok(json.data.yield.value > 0);
    });

    test("POST /api/crops/:cropId/production-estimate computes production for custom area", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/production-estimate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          areaValue: 10.0,
          areaUnit: "ACRE",
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.originalAreaUnit, "ACRE");
      assert.ok(json.data.expectedProductionTonnes > 0);
    });

    test("POST /api/crops/:cropId/actual-production records harvested production", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/actual-production`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quantity: 14.5,
          unit: "TONNE",
          notes: "Excellent harvest quality with zero lodging.",
        }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.actualProductionTonnes, 14.5);
      assert.ok(json.data.actualYieldTonnesPerHectare > 0);
    });

    test("GET /api/farms/:farmId/production-estimates returns farm-wide production summary", async () => {
      const res = await fetch(`${baseUrl}/api/farms/${farmA.id}/production-estimates`, {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      const data = json.data;

      assert.equal(data.farmId, farmA.id);
      assert.ok(data.totalCropsCount >= 2);
      assert.ok(data.cropsCoveredCount >= 1);
      assert.ok(data.totalEstimatedProductionTonnes > 0);
      assert.ok(Array.isArray(data.crops));
    });

    test("GET /api/farms/:farmId/production-estimates enforces farm ownership (User B gets 404)", async () => {
      const res = await fetch(`${baseUrl}/api/farms/${farmA.id}/production-estimates`, {
        headers: {
          Authorization: `Bearer ${tokenB}`,
        },
      });
      assert.equal(res.status, 404);
    });
  });
});
