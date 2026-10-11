import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { generateToken } from "../src/middleware/authenticate.js";
import { AlertEngineService } from "../src/modules/notifications/alertEngine.service.js";
import { AlertDeduplicator } from "../src/modules/notifications/alertDeduplicator.js";
import { ALERT_SEVERITIES, ALERT_LIFECYCLES } from "../src/modules/notifications/alertRules.config.js";

describe("Phase AI-8: Personalized Alerts & Recommendation Engine Tests", () => {
  let server;
  let baseUrl;

  const testUserA = { id: "ai8-user-a-301", email: "ai8-farmer-a@harvestwindow.test", role: "FARMER" };
  const testUserB = { id: "ai8-user-b-402", email: "ai8-farmer-b@harvestwindow.test", role: "FARMER" };
  const tokenA = generateToken(testUserA);
  const tokenB = generateToken(testUserB);

  let farmA;
  let cropA;
  let cropB;

  before(async () => {
    // 1. Start ephemeral HTTP server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 2. Upsert test users
    await prisma.user.upsert({
      where: { id: testUserA.id },
      update: {},
      create: {
        id: testUserA.id,
        name: "Alert Farmer Alpha",
        email: testUserA.email,
        passwordHash: "$argon2id$dummy",
        role: "FARMER",
      },
    });

    await prisma.user.upsert({
      where: { id: testUserB.id },
      update: {},
      create: {
        id: testUserB.id,
        name: "Alert Farmer Beta",
        email: testUserB.email,
        passwordHash: "$argon2id$dummy",
        role: "FARMER",
      },
    });

    // 3. Create Farm for User A
    farmA = await prisma.farm.create({
      data: {
        userId: testUserA.id,
        name: "Sunrise Organic Farm",
        state: "Maharashtra",
        district: "Nashik",
        area: 5.0,
        areaUnit: "HECTARE",
        latitude: 19.997,
        longitude: 73.789,
      },
    });

    // 4. Create Crop A: Harvest approaching in 4 days
    cropA = await prisma.crop.create({
      data: {
        farmId: farmA.id,
        cropName: "Soybean",
        variety: "JS-335",
        growthStage: "maturity",
        sowingDate: new Date(Date.now() - 95 * 86400000),
        expectedHarvestDate: new Date(Date.now() + 4 * 86400000),
        fieldArea: 2.5,
      },
    });

    // Add harvest prediction for Crop A
    await prisma.harvestPrediction.create({
      data: {
        userId: testUserA.id,
        farmId: farmA.id,
        cropId: cropA.id,
        predictionMethod: "agronomic_gdd_weather",
        modelVersion: "1.0.0",
        mostLikelyHarvestDate: new Date(Date.now() + 4 * 86400000),
        estimatedHarvestStart: new Date(Date.now() + 2 * 86400000),
        estimatedHarvestEnd: new Date(Date.now() + 7 * 86400000),
        daysUntilHarvest: 4,
      },
    });

    // 5. Create Crop B: With material prediction change (2 predictions with 5 days shift)
    cropB = await prisma.crop.create({
      data: {
        farmId: farmA.id,
        cropName: "Cotton",
        variety: "Bt-Cotton",
        growthStage: "boll_development",
        sowingDate: new Date(Date.now() - 110 * 86400000),
        expectedHarvestDate: new Date(Date.now() + 25 * 86400000),
        fieldArea: 2.5,
      },
    });

    // Old prediction
    await prisma.harvestPrediction.create({
      data: {
        userId: testUserA.id,
        farmId: farmA.id,
        cropId: cropB.id,
        predictionMethod: "agronomic_baseline",
        modelVersion: "1.0.0",
        mostLikelyHarvestDate: new Date(Date.now() + 20 * 86400000),
        daysUntilHarvest: 20,
        createdAt: new Date(Date.now() - 2 * 86400000),
      },
    });

    // New prediction (shifted by 5 days)
    await prisma.harvestPrediction.create({
      data: {
        userId: testUserA.id,
        farmId: farmA.id,
        cropId: cropB.id,
        predictionMethod: "agronomic_baseline",
        modelVersion: "1.0.0",
        mostLikelyHarvestDate: new Date(Date.now() + 25 * 86400000),
        daysUntilHarvest: 25,
        createdAt: new Date(),
      },
    });

    // 6. Create WeatherAssessment with caution risk
    await prisma.weatherAssessment.create({
      data: {
        userId: testUserA.id,
        farmId: farmA.id,
        overallRiskScore: 68,
        harvestSuitability: "CAUTION",
        urgency: "HIGH",
        confidence: "HIGH",
        rainfallRiskScore: 55,
        sourceProvider: "open-meteo",
      },
    });
  });

  after(async () => {
    try {
      await prisma.notification.deleteMany({
        where: { userId: { in: [testUserA.id, testUserB.id] } },
      });
      await prisma.weatherAssessment.deleteMany({
        where: { farmId: farmA.id },
      });
      await prisma.harvestPrediction.deleteMany({
        where: { userId: testUserA.id },
      });
      await prisma.crop.deleteMany({
        where: { farmId: farmA.id },
      });
      await prisma.farm.deleteMany({
        where: { id: farmA.id },
      });
      await prisma.userSettings.deleteMany({
        where: { userId: { in: [testUserA.id, testUserB.id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testUserA.id, testUserB.id] } },
      });
    } catch (e) {
      console.warn("Cleanup warning:", e.message);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // Test 1: Deduplicator key generation and uniqueness
  test("AlertDeduplicator generates deterministic keys for same event", () => {
    const key1 = AlertDeduplicator.generateKey({
      userId: testUserA.id,
      farmId: farmA.id,
      cropId: cropA.id,
      eventType: "harvest_window_approaching",
      bucket: "2026-10-11",
    });
    const key2 = AlertDeduplicator.generateKey({
      userId: testUserA.id,
      farmId: farmA.id,
      cropId: cropA.id,
      eventType: "harvest_window_approaching",
      bucket: "2026-10-11",
    });
    assert.equal(key1, key2);
  });

  // Test 2: Quiet hours evaluation logic
  test("AlertDeduplicator accurately calculates quiet hours", () => {
    // Overnight quiet hours: 22:00 to 06:00
    const midnight = new Date("2026-10-11T02:30:00Z");
    midnight.setHours(2, 30);
    assert.equal(AlertDeduplicator.isQuietHours("22:00", "06:00", midnight), true);

    const noon = new Date("2026-10-11T12:00:00Z");
    noon.setHours(12, 0);
    assert.equal(AlertDeduplicator.isQuietHours("22:00", "06:00", noon), false);
  });

  // Test 3: AlertEngineService evaluates real farm data and creates notifications
  test("AlertEngineService.evaluateUserAlerts creates harvest and weather alerts", async () => {
    const result = await AlertEngineService.evaluateUserAlerts(testUserA.id);
    assert.ok(result.evaluatedFarms >= 1);
    assert.ok(result.evaluatedCrops >= 2);
    assert.ok(result.createdAlerts >= 1);

    const notifications = await prisma.notification.findMany({
      where: { userId: testUserA.id },
    });
    assert.ok(notifications.length >= 1);
    const harvestNotif = notifications.find((n) => n.type === "harvest");
    assert.ok(harvestNotif);
    assert.ok(harvestNotif.recommendedAction);
    assert.equal(harvestNotif.status, ALERT_LIFECYCLES.ACTIVE);
  });

  // Test 4: Deduplication idempotency - second evaluation run creates 0 duplicate notifications
  test("Subsequent evaluateUserAlerts execution does not produce duplicate alerts", async () => {
    const countBefore = await prisma.notification.count({ where: { userId: testUserA.id } });
    const result = await AlertEngineService.evaluateUserAlerts(testUserA.id);
    const countAfter = await prisma.notification.count({ where: { userId: testUserA.id } });

    assert.equal(result.createdAlerts, 0);
    assert.equal(countBefore, countAfter);
  });

  // Test 5: List notifications via API with unread count
  test("GET /api/v1/notifications lists user notifications with unread count", async () => {
    const res = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.unreadCount > 0);

    const item = body.data[0];
    assert.ok(item.id);
    assert.ok(item.title);
    assert.ok(item.severity);
    assert.ok(item.recommendedAction);
  });

  // Test 6: Unread count endpoint
  test("GET /api/v1/notifications/unread-count returns correct count", async () => {
    const res = await fetch(`${baseUrl}/api/v1/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.unreadCount > 0);
  });

  // Test 7: Mark single notification as read
  test("PATCH /api/v1/notifications/:id/read marks notification as read", async () => {
    const notif = await prisma.notification.findFirst({
      where: { userId: testUserA.id, isRead: false },
    });
    assert.ok(notif);

    const res = await fetch(`${baseUrl}/api/v1/notifications/${notif.id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.isRead, true);
    assert.ok(body.data.readAt);
  });

  // Test 8: Dismiss notification
  test("PATCH /api/v1/notifications/:id/dismiss marks notification as DISMISSED", async () => {
    const notif = await prisma.notification.findFirst({
      where: { userId: testUserA.id },
    });
    assert.ok(notif);

    const res = await fetch(`${baseUrl}/api/v1/notifications/${notif.id}/dismiss`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.status, "DISMISSED");
    assert.ok(body.data.dismissedAt);
  });

  // Test 9: Notification Preferences GET & PUT
  test("GET & PUT /api/v1/notifications/preferences manages user preferences", async () => {
    // GET initial
    const getRes = await fetch(`${baseUrl}/api/v1/notifications/preferences`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.equal(getBody.data.harvestWindowAlerts, true);

    // PUT updated
    const putRes = await fetch(`${baseUrl}/api/v1/notifications/preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        harvestWindowAlerts: false,
        minSeverity: "high",
        quietHoursStart: 23,
        quietHoursEnd: 5,
      }),
    });
    assert.equal(putRes.status, 200);
    const putBody = await putRes.json();
    assert.equal(putBody.data.harvestWindowAlerts, false);
    assert.equal(putBody.data.minSeverity, "high");
    assert.equal(putBody.data.quietHoursStart, 23);
  });

  // Test 10: Strict cross-user isolation
  test("User B cannot dismiss User A's notification", async () => {
    const notifA = await prisma.notification.findFirst({
      where: { userId: testUserA.id },
    });
    assert.ok(notifA);

    const res = await fetch(`${baseUrl}/api/v1/notifications/${notifA.id}/dismiss`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(res.status, 404);
  });
});
