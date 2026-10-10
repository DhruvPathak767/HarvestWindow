import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { generateToken } from "../src/middleware/authenticate.js";

describe("Phase 8 — User Settings & Profile Module Tests", () => {
  let server;
  let baseUrl;
  let userA;
  let userB;
  let farmA;
  let farmB;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();

    // Create User A
    const uA = await prisma.user.create({
      data: {
        name: "Settings Farmer A",
        email: `settings-a-${timestamp}@example.com`,
        passwordHash: "hash-settings-a",
        role: "FARMER",
      },
    });
    userA = { ...uA, token: generateToken(uA) };

    // Create User B
    const uB = await prisma.user.create({
      data: {
        name: "Settings Farmer B",
        email: `settings-b-${timestamp}@example.com`,
        passwordHash: "hash-settings-b",
        role: "FARMER",
      },
    });
    userB = { ...uB, token: generateToken(uB) };

    // Farm for User A
    farmA = await prisma.farm.create({
      data: {
        userId: userA.id,
        name: "Farm Alpha Settings",
        state: "Maharashtra",
        district: "Nashik",
        area: 10.0,
        areaUnit: "HECTARE",
      },
    });

    // Farm for User B
    farmB = await prisma.farm.create({
      data: {
        userId: userB.id,
        name: "Farm Beta Settings",
        state: "Gujarat",
        district: "Anand",
        area: 8.0,
        areaUnit: "ACRE",
      },
    });
  });

  after(async () => {
    // Cleanup
    await prisma.userSettings.deleteMany({
      where: { userId: { in: [userA?.id, userB?.id].filter(Boolean) } },
    });
    await prisma.farm.deleteMany({
      where: { id: { in: [farmA?.id, farmB?.id].filter(Boolean) } },
    });
    if (userA) await prisma.user.delete({ where: { id: userA.id } });
    if (userB) await prisma.user.delete({ where: { id: userB.id } });

    await new Promise((resolve) => server.close(resolve));
  });

  test("1. Rejects unauthenticated request to GET /api/settings with 401", async () => {
    const res = await fetch(`${baseUrl}/api/settings`);
    assert.equal(res.status, 401);
  });

  test("2. GET /api/settings returns default preferences for a user without prior settings", async () => {
    const res = await fetch(`${baseUrl}/api/settings`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.profile.name, "Settings Farmer A");
    assert.equal(body.data.profile.email, userA.email);
    assert.equal(body.data.preferences.areaUnit, "hectare");
    assert.equal(body.data.preferences.temperatureUnit, "celsius");
    assert.equal(body.data.preferences.language, "en");
    assert.equal(body.data.preferences.defaultFarmId, null);
    assert.equal(body.data.preferences.notifications.harvestWindowAlerts, true);
  });

  test("3. PATCH /api/settings updates valid preference fields and persists", async () => {
    const patchPayload = {
      areaUnit: "acre",
      temperatureUnit: "fahrenheit",
      language: "hi",
      defaultFarmId: farmA.id,
      notifications: {
        weeklySummary: true,
      },
    };

    const res = await fetch(`${baseUrl}/api/settings`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${userA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patchPayload),
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.preferences.areaUnit, "acre");
    assert.equal(body.data.preferences.temperatureUnit, "fahrenheit");
    assert.equal(body.data.preferences.language, "hi");
    assert.equal(body.data.preferences.defaultFarmId, farmA.id);
    assert.equal(body.data.preferences.notifications.weeklySummary, true);
    assert.equal(body.data.preferences.notifications.harvestWindowAlerts, true); // Preserved

    // Verify persistence via GET /api/settings
    const getRes = await fetch(`${baseUrl}/api/settings`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.equal(getBody.data.preferences.areaUnit, "acre");
    assert.equal(getBody.data.preferences.language, "hi");
    assert.equal(getBody.data.preferences.defaultFarmId, farmA.id);
  });

  test("4. Rejects invalid enum values with 422 validation error", async () => {
    const invalidPayload = {
      areaUnit: "square_kilometers",
    };

    const res = await fetch(`${baseUrl}/api/settings`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${userA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidPayload),
    });
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message.includes("Area unit"));
  });

  test("5. Rejects setting another user's farm as defaultFarmId with 400", async () => {
    // User A attempts to set User B's farm (farmB) as their default farm
    const res = await fetch(`${baseUrl}/api/settings`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${userA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ defaultFarmId: farmB.id }),
    });
    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message.includes("permission"));
  });

  test("6. Allows clearing defaultFarmId with null", async () => {
    const res = await fetch(`${baseUrl}/api/settings`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${userA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ defaultFarmId: null }),
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.data.preferences.defaultFarmId, null);
  });

  test("7. Profile update via PATCH /api/users/profile updates user display name", async () => {
    const res = await fetch(`${baseUrl}/api/users/profile`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${userA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Updated Farmer Alpha" }),
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.name, "Updated Farmer Alpha");

    // Check that GET /api/settings reflects the updated name
    const settingsRes = await fetch(`${baseUrl}/api/settings`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const settingsBody = await settingsRes.json();
    assert.equal(settingsBody.data.profile.name, "Updated Farmer Alpha");
  });
});
