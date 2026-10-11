import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { generateToken } from "../src/middleware/authenticate.js";

describe("Phase AI-9 — Prediction Monitoring & Continuous Improvement Tests", () => {
  let server;
  let baseUrl;

  const userA = { id: "user-ai9-test-a-101", email: "ai9-a@example.com", role: "FARMER" };
  const userB = { id: "user-ai9-test-b-202", email: "ai9-b@example.com", role: "FARMER" };
  const adminUser = { id: "user-ai9-admin-999", email: "ai9-admin@example.com", role: "ADMIN" };

  const tokenA = generateToken(userA);
  const tokenB = generateToken(userB);
  const tokenAdmin = generateToken(adminUser);

  let farmA;
  let cropWheat;
  let predictionWheat;

  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });

    // Cleanup prior test artifacts
    await prisma.predictionEvaluation.deleteMany({
      where: { outcome: { userId: { in: [userA.id, userB.id, adminUser.id] } } },
    }).catch(() => {});

    await prisma.harvestOutcome.deleteMany({
      where: { userId: { in: [userA.id, userB.id, adminUser.id] } },
    }).catch(() => {});

    await prisma.harvestPrediction.deleteMany({
      where: { userId: { in: [userA.id, userB.id, adminUser.id] } },
    }).catch(() => {});

    await prisma.crop.deleteMany({
      where: { farm: { userId: { in: [userA.id, userB.id, adminUser.id] } } },
    }).catch(() => {});

    await prisma.farm.deleteMany({
      where: { userId: { in: [userA.id, userB.id, adminUser.id] } },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id, adminUser.id] } },
    }).catch(() => {});

    // Create users
    await prisma.user.createMany({
      data: [
        {
          id: userA.id,
          name: "Farmer AI9 Alpha",
          email: userA.email,
          passwordHash: "hash-test-pwd",
          role: "FARMER",
        },
        {
          id: userB.id,
          name: "Farmer AI9 Beta",
          email: userB.email,
          passwordHash: "hash-test-pwd",
          role: "FARMER",
        },
        {
          id: adminUser.id,
          name: "Admin AI9 Lead",
          email: adminUser.email,
          passwordHash: "hash-test-pwd",
          role: "ADMIN",
        },
      ],
    });

    // Create Farm for User A
    farmA = await prisma.farm.create({
      data: {
        id: "farm-ai9-test-a",
        userId: userA.id,
        name: "Punjab Wheat Fields",
        state: "Punjab",
        district: "Ludhiana",
        area: 4.5,
      },
    });

    // Create Crop for Farm A
    cropWheat = await prisma.crop.create({
      data: {
        id: "crop-ai9-wheat-01",
        farmId: farmA.id,
        cropName: "Wheat",
        variety: "HD-2967",
        sowingDate: new Date("2026-11-01T00:00:00.000Z"),
        expectedHarvestDate: new Date("2027-03-25T00:00:00.000Z"),
        growthStage: "Ripening",
      },
    });

    // Create HarvestPrediction for Crop A
    predictionWheat = await prisma.harvestPrediction.create({
      data: {
        id: "pred-ai9-wheat-01",
        userId: userA.id,
        farmId: farmA.id,
        cropId: cropWheat.id,
        predictionDate: new Date("2026-11-02T00:00:00.000Z"),
        estimatedHarvestStart: new Date("2027-03-20T00:00:00.000Z"),
        mostLikelyHarvestDate: new Date("2027-03-25T00:00:00.000Z"),
        estimatedHarvestEnd: new Date("2027-03-30T00:00:00.000Z"),
        predictionMethod: "agronomic_gdd_weather",
        modelVersion: "2.0.0-agronomic-gdd-weather",
      },
    });
  });

  after(async () => {
    // Cleanup
    await prisma.predictionEvaluation.deleteMany({
      where: { outcome: { userId: { in: [userA.id, userB.id, adminUser.id] } } },
    }).catch(() => {});

    await prisma.harvestOutcome.deleteMany({
      where: { userId: { in: [userA.id, userB.id, adminUser.id] } },
    }).catch(() => {});

    await prisma.harvestPrediction.deleteMany({
      where: { userId: { in: [userA.id, userB.id, adminUser.id] } },
    }).catch(() => {});

    await prisma.crop.deleteMany({
      where: { farm: { userId: { in: [userA.id, userB.id, adminUser.id] } } },
    }).catch(() => {});

    await prisma.farm.deleteMany({
      where: { userId: { in: [userA.id, userB.id, adminUser.id] } },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id, adminUser.id] } },
    }).catch(() => {});

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("1. Farmer cannot record outcome for another farmer's crop", async () => {
    const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/harvest-outcomes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        actualHarvestDate: "2027-03-27",
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Access denied/);
  });

  test("2. Farmer records actual harvest outcome with consent controls", async () => {
    const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/harvest-outcomes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        actualHarvestDate: "2027-03-28", // 3 days after most likely date (2027-03-25)
        consentEvaluation: true,
        consentTraining: true,
        notes: "Slight heat wave delayed ripening slightly.",
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.cropId, cropWheat.id);
    assert.equal(body.data.verificationStatus, "PENDING_VERIFICATION");
    assert.equal(body.data.consentTraining, true);
    assert.equal(body.data.consentEvaluation, true);

    // Verify PredictionEvaluation was generated automatically
    const evalRecord = await prisma.predictionEvaluation.findFirst({
      where: { outcomeId: body.data.id },
    });
    assert.ok(evalRecord);
    assert.equal(evalRecord.errorDays, 3); // 2027-03-28 minus 2027-03-25 = +3 days
    assert.equal(evalRecord.absoluteErrorDays, 3);
    assert.equal(evalRecord.isWithin3Days, true);
    assert.equal(evalRecord.isWithinWindow, true); // Inside [03-20, 03-30]
  });

  test("3. Prevent duplicate harvest outcome for the same crop and date", async () => {
    const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/harvest-outcomes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        actualHarvestDate: "2027-03-28",
      }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test("4. Farmer retrieves crop harvest outcomes", async () => {
    const res = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/harvest-outcomes`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);
    assert.ok(body.data[0].prediction);
    assert.equal(body.data[0].evaluations.length, 1);
  });

  test("5. Outcome correction updates evaluation and preserves audit trail", async () => {
    const listRes = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/harvest-outcomes`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listBody = await listRes.json();
    const outcomeId = listBody.data[0].id;

    // Correct date to 2027-03-25 (exact match!)
    const updateRes = await fetch(`${baseUrl}/api/crops/${cropWheat.id}/harvest-outcomes/${outcomeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        actualHarvestDate: "2027-03-25",
        notes: "Corrected entry: actual harvest completed on March 25.",
      }),
    });

    assert.equal(updateRes.status, 200);
    const updateBody = await updateRes.json();
    assert.equal(updateBody.data.verificationStatus, "CORRECTED");
    assert.equal(updateBody.data.correctionCount, 1);
    assert.ok(updateBody.data.previousOutcomeJson);

    // Verify recomputed evaluation
    const refreshedEval = await prisma.predictionEvaluation.findFirst({
      where: { outcomeId },
      orderBy: { evaluationRevision: "desc" },
    });
    assert.ok(refreshedEval);
    assert.equal(refreshedEval.errorDays, 0);
    assert.equal(refreshedEval.isExactDate, true);
  });

  test("6. GET /api/ai/monitoring/accuracy returns metric summary", async () => {
    const res = await fetch(`${baseUrl}/api/ai/monitoring/accuracy`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data);
    assert.equal(typeof body.data.totalEvaluated, "number");
  });

  test("7. GET /api/ai/monitoring/drift returns drift telemetry", async () => {
    const res = await fetch(`${baseUrl}/api/ai/monitoring/drift`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.assessments);
    assert.ok(body.data.assessments.length >= 1);
  });

  test("8. GET /api/ai/monitoring/models returns registry with active model", async () => {
    const res = await fetch(`${baseUrl}/api/ai/monitoring/models`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.activeModel);
    assert.equal(body.data.activeModel.modelName, "HarvestWindow-Predictor");
  });

  test("9. Non-admin is blocked from administrative endpoints (403)", async () => {
    const res = await fetch(`${baseUrl}/api/admin/ai/monitoring/jobs`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test("10. Admin can execute evaluation and retraining check", async () => {
    const evalRes = await fetch(`${baseUrl}/api/admin/ai/monitoring/evaluate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });

    assert.equal(evalRes.status, 200);
    const evalBody = await evalRes.json();
    assert.equal(evalBody.success, true);
    assert.equal(evalBody.data.status, "COMPLETED");

    const retrainRes = await fetch(`${baseUrl}/api/admin/ai/monitoring/retrain-check`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });

    assert.equal(retrainRes.status, 200);
    const retrainBody = await retrainRes.json();
    assert.equal(retrainBody.success, true);
    assert.ok(retrainBody.data.eligibility);
  });
});
