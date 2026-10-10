import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { generateToken } from "../src/middleware/authenticate.js";

describe("Phase AI-2 — Harvest Window Prediction Engine & REST API Integration Tests", () => {
  let server;
  let baseUrl;

  const testUserA = {
    id: "user-ai2-alpha-101",
    email: "ai2_alpha@example.com",
    name: "Farmer AI Alpha",
    role: "FARMER",
  };

  const testUserB = {
    id: "user-ai2-beta-102",
    email: "ai2_beta@example.com",
    name: "Farmer AI Beta",
    role: "FARMER",
  };

  const tokenA = generateToken(testUserA);
  const tokenB = generateToken(testUserB);

  let farmA;
  let farmB;
  let cropA1;
  let cropA2_no_sow;
  let cropB1;

  before(async () => {
    // 1. Seed users
    await prisma.user.upsert({
      where: { id: testUserA.id },
      update: {},
      create: {
        id: testUserA.id,
        email: testUserA.email,
        name: testUserA.name,
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$demo$demo",
        role: "FARMER",
      },
    });

    await prisma.user.upsert({
      where: { id: testUserB.id },
      update: {},
      create: {
        id: testUserB.id,
        email: testUserB.email,
        name: testUserB.name,
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$demo$demo",
        role: "FARMER",
      },
    });

    // 2. Clean previous test entities
    await prisma.harvestPrediction.deleteMany({
      where: { userId: { in: [testUserA.id, testUserB.id] } },
    });
    await prisma.crop.deleteMany({
      where: { farm: { userId: { in: [testUserA.id, testUserB.id] } } },
    });
    await prisma.farm.deleteMany({
      where: { userId: { in: [testUserA.id, testUserB.id] } },
    });

    // 3. Create Farm A (with real coordinates for microclimate GDD)
    farmA = await prisma.farm.create({
      data: {
        userId: testUserA.id,
        name: "Ludhiana Wheat Farm",
        state: "Punjab",
        district: "Ludhiana",
        area: 5.5,
        latitude: 30.901,
        longitude: 75.857,
      },
    });

    // 4. Create Farm B for multi-tenant isolation
    farmB = await prisma.farm.create({
      data: {
        userId: testUserB.id,
        name: "Nashik Onion Farm",
        state: "Maharashtra",
        district: "Nashik",
        area: 3.2,
        latitude: 19.997,
        longitude: 73.789,
      },
    });

    // 5. Create crops for Farm A
    cropA1 = await prisma.crop.create({
      data: {
        farmId: farmA.id,
        cropName: "Wheat",
        variety: "HD-2967",
        sowingDate: new Date("2024-11-15T00:00:00.000Z"),
        growthStage: "Grain Filling",
        fieldArea: 3.5,
      },
    });

    // Crop without sowing date (to test honest missing input reporting)
    cropA2_no_sow = await prisma.crop.create({
      data: {
        farmId: farmA.id,
        cropName: "Cotton",
        variety: "BT-Cotton",
        sowingDate: new Date("1970-01-01T00:00:00.000Z"), // will test without passing sowingDate
        growthStage: "Vegetative",
      },
    });

    // Crop for Farm B
    cropB1 = await prisma.crop.create({
      data: {
        farmId: farmB.id,
        cropName: "Onion",
        variety: "Nashik Red",
        sowingDate: new Date("2024-10-01T00:00:00.000Z"),
        growthStage: "Bulb Development",
      },
    });

    // 6. Start ephemeral HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.harvestPrediction.deleteMany({
      where: { userId: { in: [testUserA.id, testUserB.id] } },
    }).catch(() => null);
    await prisma.crop.deleteMany({
      where: { farm: { userId: { in: [testUserA.id, testUserB.id] } } },
    }).catch(() => null);
    await prisma.farm.deleteMany({
      where: { userId: { in: [testUserA.id, testUserB.id] } },
    }).catch(() => null);
    await prisma.user.deleteMany({
      where: { id: { in: [testUserA.id, testUserB.id] } },
    }).catch(() => null);
  });

  test("1. Rejects unauthenticated prediction request with 401", async () => {
    const res = await fetch(`${baseUrl}/api/harvest-predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cropId: cropA1.id }),
    });
    assert.equal(res.status, 401);
  });

  test("2. Enforces farm & crop ownership: User B cannot predict User A's crop (404/unauthorized)", async () => {
    const res = await fetch(`${baseUrl}/api/harvest-predictions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ cropId: cropA1.id }),
    });
    assert.equal(res.status, 404);
  });

  test("3. Missing sowing date returns honest insufficient_data response", async () => {
    const res = await fetch(`${baseUrl}/api/harvest-predictions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        farmId: farmA.id,
        cropName: "Wheat",
        // sowingDate omitted intentionally
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "insufficient_data");
    assert.ok(body.message.includes("Sowing date is required"));
  });

  test("4. Successfully generates live hybrid harvest prediction for valid crop", async () => {
    const res = await fetch(`${baseUrl}/api/harvest-predictions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        cropId: cropA1.id,
        referenceDate: "2024-12-01",
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "success");
    assert.ok(body.prediction);

    const pred = body.prediction;
    assert.equal(pred.crop_name, "Wheat");
    assert.ok(pred.estimated_harvest_start);
    assert.ok(pred.most_likely_harvest_date);
    assert.ok(pred.estimated_harvest_end);
    assert.ok(pred.prediction_method);
    assert.ok(pred.model_version);
    assert.ok(pred.uncertainty);
    assert.ok(pred.data_quality);
    assert.ok(Array.isArray(pred.explanation));
    assert.ok(pred.explanation.length > 0);
  });

  test("5. Verifies prediction is persisted in MySQL via Prisma HarvestPrediction model", async () => {
    const records = await prisma.harvestPrediction.findMany({
      where: {
        cropId: cropA1.id,
        userId: testUserA.id,
      },
    });
    assert.ok(records.length >= 1);
    const record = records[0];
    assert.equal(record.farmId, farmA.id);
    assert.equal(record.cropId, cropA1.id);
    assert.ok(record.mostLikelyHarvestDate);
    assert.ok(record.predictionMethod);
    assert.ok(record.modelVersion);
  });

  test("6. Retrieves persisted prediction history via GET /api/harvest-predictions/history/:cropId", async () => {
    const res = await fetch(`${baseUrl}/api/harvest-predictions/history/${cropA1.id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);

    const first = body.data[0];
    assert.ok(first.mostLikelyHarvestDate);
    assert.ok(first.predictionMethod);
  });

  test("7. User B cannot access User A's prediction history", async () => {
    const res = await fetch(`${baseUrl}/api/harvest-predictions/history/${cropA1.id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });
    assert.equal(res.status, 404);
  });

  test("8. POST /api/forecasts/predict alias route functions identically", async () => {
    const res = await fetch(`${baseUrl}/api/forecasts/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        cropId: cropA1.id,
        referenceDate: "2024-12-01",
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "success");
    assert.equal(body.prediction.crop_name, "Wheat");
  });
});
