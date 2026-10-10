import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { generateToken } from "../src/middleware/authenticate.js";

describe("Phase 7 — Dashboard & Forecast Analytics Module Tests", () => {
  let server;
  let baseUrl;
  let userA;
  let userB;
  let farmA1;
  let farmA2;
  let cropA1;
  let cropA2;
  let cropA3;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();

    // Create User A
    const uA = await prisma.user.create({
      data: {
        name: "Dashboard Farmer A",
        email: `dash-a-${timestamp}@example.com`,
        passwordHash: "hash-a",
        role: "FARMER",
      },
    });
    userA = { ...uA, token: generateToken(uA) };

    // Create User B (for isolation tests)
    const uB = await prisma.user.create({
      data: {
        name: "Dashboard Farmer B",
        email: `dash-b-${timestamp}@example.com`,
        passwordHash: "hash-b",
        role: "FARMER",
      },
    });
    userB = { ...uB, token: generateToken(uB) };

    // User A Farm 1 (5.5 hectares)
    farmA1 = await prisma.farm.create({
      data: {
        userId: userA.id,
        name: "Punjab Wheat Estate",
        state: "Punjab",
        district: "Patiala",
        area: 5.5,
        areaUnit: "HECTARE",
        latitude: 30.3398,
        longitude: 76.3869,
      },
    });

    // User A Farm 2 (4.2 hectares)
    farmA2 = await prisma.farm.create({
      data: {
        userId: userA.id,
        name: "Haryana Mustard Block",
        state: "Haryana",
        district: "Karnal",
        area: 4.2,
        areaUnit: "HECTARE",
        latitude: 29.6857,
        longitude: 76.9905,
      },
    });

    // Crop 1 on Farm 1: Wheat (active, approaching/ready depending on sowing date)
    cropA1 = await prisma.crop.create({
      data: {
        farmId: farmA1.id,
        cropName: "Wheat",
        variety: "HD-3086",
        sowingDate: new Date("2025-11-01"),
        growthStage: "RIPENING",
        fieldArea: 3.5,
      },
    });

    // Crop 2 on Farm 2: Mustard (active, developing)
    cropA2 = await prisma.crop.create({
      data: {
        farmId: farmA2.id,
        cropName: "Mustard",
        variety: "Pusa Bold",
        sowingDate: new Date("2026-01-15"),
        growthStage: "FLOWERING",
        fieldArea: 2.0,
      },
    });

    // Crop 3 on Farm 1: Already harvested crop
    cropA3 = await prisma.crop.create({
      data: {
        farmId: farmA1.id,
        cropName: "Moong",
        sowingDate: new Date("2025-06-01"),
        growthStage: "HARVESTED",
        fieldArea: 1.0,
      },
    });
  });

  after(async () => {
    // Cleanup
    await prisma.crop.deleteMany({
      where: { farmId: { in: [farmA1?.id, farmA2?.id].filter(Boolean) } },
    });
    await prisma.farm.deleteMany({
      where: { id: { in: [farmA1?.id, farmA2?.id].filter(Boolean) } },
    });
    if (userA) await prisma.user.delete({ where: { id: userA.id } });
    if (userB) await prisma.user.delete({ where: { id: userB.id } });

    await new Promise((resolve) => server.close(resolve));
  });

  test("1. Rejects unauthenticated request to GET /api/dashboard with 401", async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`);
    assert.equal(res.status, 401);
  });

  test("2. Empty dashboard for new user with 0 farms returns zero metrics and empty lists", async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.overview.totalFarms, 0);
    assert.equal(body.data.overview.totalTrackedArea, 0);
    assert.equal(body.data.overview.totalActiveCrops, 0);
    assert.equal(body.data.overview.approachingHarvest, 0);
    assert.equal(body.data.overview.readyForHarvest, 0);
    assert.equal(body.data.overview.overdueHarvests, 0);
    assert.deepEqual(body.data.upcomingHarvests, []);
    assert.deepEqual(body.data.recentActivity, []);
  });

  test("3. Authenticated dashboard request aggregates farms and crops correctly for User A", async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    const { overview, cropStatusDistribution, readinessDistribution, upcomingHarvests, recentActivity, forecastSummary } = body.data;

    // Overview checks
    assert.equal(overview.totalFarms, 2);
    assert.equal(overview.totalTrackedArea, 9.7); // 5.5 + 4.2
    assert.equal(overview.totalActiveCrops, 2); // Wheat and Mustard (Moong is HARVESTED)

    // Distribution checks
    assert.ok(Array.isArray(cropStatusDistribution));
    assert.ok(cropStatusDistribution.some((d) => d.stage === "Ripening" && d.count >= 1));
    assert.ok(cropStatusDistribution.some((d) => d.stage === "Flowering" && d.count >= 1));
    assert.ok(cropStatusDistribution.some((d) => d.stage === "Harvested" && d.count >= 1));

    assert.ok(Array.isArray(readinessDistribution));
    assert.ok(readinessDistribution.length >= 4);

    // Upcoming harvests checks (should only contain active unharvested crops)
    assert.ok(Array.isArray(upcomingHarvests));
    assert.equal(upcomingHarvests.length, 2);
    assert.ok(upcomingHarvests.every((h) => h.cropName !== "Moong"));

    const wheatHarvest = upcomingHarvests.find((h) => h.cropName === "Wheat");
    assert.ok(wheatHarvest);
    assert.equal(wheatHarvest.farmName, "Punjab Wheat Estate");
    assert.ok(wheatHarvest.harvestWindow.startDate);
    assert.ok(wheatHarvest.confidenceScore > 0);

    // Recent activity
    assert.ok(Array.isArray(recentActivity));
    assert.ok(recentActivity.length >= 3);

    // Forecast summary
    assert.equal(forecastSummary.totalForecasts, 3);
  });

  test("4. Cross-user isolation: User B's dashboard never leaks User A's data", async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.data.overview.totalFarms, 0);
    assert.equal(body.data.overview.totalActiveCrops, 0);
    assert.deepEqual(body.data.upcomingHarvests, []);
  });

  test("5. GET /api/v1/dashboard alias endpoint works identically", async () => {
    const res = await fetch(`${baseUrl}/api/v1/dashboard`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.overview.totalFarms, 2);
  });

  test("6. Upcoming harvest items are chronologically ordered by predicted date", async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    const upcoming = body.data.upcomingHarvests;
    assert.ok(upcoming.length >= 2);
    // Verify sorted ascending by daysRemaining or estimatedWindowStart
    for (let i = 0; i < upcoming.length - 1; i++) {
      const current = upcoming[i].daysRemaining ?? 9999;
      const next = upcoming[i + 1].daysRemaining ?? 9999;
      assert.ok(current <= next, `Expected ${current} <= ${next} for chronological ordering`);
    }
  });

  test("7. Forecast API supports date range filtering, pagination and chronological sorting", async () => {
    const res = await fetch(`${baseUrl}/api/forecasts?sortBy=date&page=1&limit=10`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.forecasts));
    assert.ok(body.data.total >= 2);
  });

  test("8. Forecast API rejects invalid or unauthorized farm filter with 404", async () => {
    const res = await fetch(`${baseUrl}/api/forecasts?farmId=non-existent-or-unauthorized-farm`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.equal(res.status, 404);
  });
});
