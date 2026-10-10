import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { generateToken } from "../src/middleware/authenticate.js";
import { createFarm } from "../src/modules/farms/farms.service.js";
import { createCrop } from "../src/modules/crops/crops.service.js";
import { logActivity, listActivities, getActivityById } from "../src/modules/activity/activity.service.js";
import {
  createNotification,
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  syncAlertsForUser,
} from "../src/modules/notifications/notifications.service.js";

describe("Phase 9 — Activity Feed & Notifications Module Tests", () => {
  let server;
  let baseUrl;

  const userA = { id: "p9-user-a-101", email: "p9-a@example.com", role: "FARMER" };
  const userB = { id: "p9-user-b-202", email: "p9-b@example.com", role: "FARMER" };
  const tokenA = generateToken(userA);
  const tokenB = generateToken(userB);

  let farmA;
  let cropA;

  before(async () => {
    // Start test server on ephemeral port
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Ensure test users exist
    await prisma.user.upsert({
      where: { id: userA.id },
      update: {},
      create: {
        id: userA.id,
        name: "Test Farmer A",
        email: userA.email,
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy",
        role: "FARMER",
      },
    });

    await prisma.user.upsert({
      where: { id: userB.id },
      update: {},
      create: {
        id: userB.id,
        name: "Test Farmer B",
        email: userB.email,
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy",
        role: "FARMER",
      },
    });

    // Clean up any existing activity or notification records for test users
    await prisma.activity.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });

    // Create a farm and crop for User A to test integration
    farmA = await createFarm(userA.id, {
      name: "Valley Green Agro",
      state: "Punjab",
      district: "Ludhiana",
      area: 12.0,
      areaUnit: "acre",
      latitude: 30.901,
      longitude: 75.8573,
    });

    cropA = await createCrop(userA.id, {
      name: "Wheat Sharbati",
      variety: "HD-2967",
      farmId: farmA.id,
      plantingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      growthStage: "Tillering",
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe("1. Central Activity Logging Service & Persistence", () => {
    test("Logs and persists supported activity events with sanitized metadata", async () => {
      const activity = await logActivity({
        userId: userA.id,
        type: "FARM_CREATED",
        title: "Farm Created",
        message: "Valley Green Agro created successfully",
        entityType: "farm",
        entityId: farmA.id,
        farmId: farmA.id,
        metadata: {
          area: 12.0,
          token: "secret-token-must-be-removed",
          password: "plain-password",
        },
      });

      assert.ok(activity);
      assert.ok(activity.id);
      assert.equal(activity.type, "farm-added");
      assert.equal(activity.title, "Farm Created");
      assert.equal(activity.farmId, farmA.id);
      assert.ok(activity.at);
      // Ensure sensitive keys were stripped from metadata
      assert.equal(activity.metadata?.token, undefined);
      assert.equal(activity.metadata?.password, undefined);
      assert.equal(activity.metadata?.area, 12.0);
    });

    test("Non-blocking resilience: invalid userId returns null without throwing", async () => {
      const result = await logActivity({
        userId: null,
        type: "crop-added",
        title: "Test",
        message: "Should not throw",
      });
      assert.equal(result, null);
    });

    test("Direct service listing supports server-side pagination and type filtering", async () => {
      await logActivity({
        userId: userA.id,
        type: "crop-added",
        title: "Crop added",
        message: "Wheat Sharbati added to Valley Green Agro",
        cropId: cropA.id,
        farmId: farmA.id,
      });

      const feed = await listActivities(userA.id, { limit: 10 });
      assert.ok(feed.items.length >= 2);
      assert.ok(feed.pagination.total >= 2);

      const filtered = await listActivities(userA.id, { type: "crop-added" });
      assert.ok(filtered.items.every((it) => it.type === "crop-added"));
    });
  });

  describe("2. Activity API Endpoints (/api/activity & /api/v1/activity)", () => {
    test("GET /api/activity requires authentication", async () => {
      const res = await fetch(`${baseUrl}/api/activity`);
      assert.equal(res.status, 401);
    });

    test("GET /api/activity returns the authenticated user's activity feed sorted newest first", async () => {
      const res = await fetch(`${baseUrl}/api/activity?limit=5`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
      assert.ok(json.data.length > 0);

      // Verify newest first chronological ordering
      for (let i = 0; i < json.data.length - 1; i++) {
        const timeA = new Date(json.data[i].at).getTime();
        const timeB = new Date(json.data[i + 1].at).getTime();
        assert.ok(timeA >= timeB, "Activities must be sorted newest first");
      }
    });

    test("GET /api/activity/:id retrieves a single owned activity record", async () => {
      const feedRes = await fetch(`${baseUrl}/api/activity`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const feedJson = await feedRes.json();
      const firstId = feedJson.data[0].id;

      const singleRes = await fetch(`${baseUrl}/api/activity/${firstId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(singleRes.status, 200);
      const singleJson = await singleRes.json();
      assert.equal(singleJson.success, true);
      assert.equal(singleJson.data.id, firstId);
    });

    test("Cross-User Isolation: User B cannot access User A's activities", async () => {
      // User B initially has an empty feed
      const feedBRes = await fetch(`${baseUrl}/api/activity`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.equal(feedBRes.status, 200);
      const feedBJson = await feedBRes.json();
      assert.equal(feedBJson.data.length, 0, "User B should not have User A's activities");

      // User B attempts to look up User A's activity ID
      const feedARes = await fetch(`${baseUrl}/api/activity`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const feedAJson = await feedARes.json();
      const targetId = feedAJson.data[0].id;

      const forbiddenRes = await fetch(`${baseUrl}/api/activity/${targetId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.equal(forbiddenRes.status, 404, "User B must receive 404 attempting to view User A's activity");
    });
  });

  describe("3. Notification Service & Alert Management", () => {
    let notif1;
    let notif2;

    test("Creates persistent notifications and computes accurate unread counts", async () => {
      notif1 = await createNotification({
        userId: userA.id,
        type: "weather",
        title: "Heavy Rainfall Warning",
        message: "Valley Green Agro: Precipitation exceeding 45mm expected.",
        farmId: farmA.id,
        link: "/app/weather",
      });

      notif2 = await createNotification({
        userId: userA.id,
        type: "forecast",
        title: "Harvest Window Approaching",
        message: "Wheat Sharbati is approaching optimal harvest stage.",
        cropId: cropA.id,
        farmId: farmA.id,
        link: `/app/crops/${cropA.id}`,
      });

      assert.ok(notif1.id);
      assert.equal(notif1.isRead, false);
      assert.equal(notif1.kind, "weather");

      const count = await getUnreadCount(userA.id);
      assert.ok(count.unreadCount >= 2);
    });

    test("Deduplicates repeated alerts using deterministic dedupKey", async () => {
      const dedupKey = `test-alert-key-${Date.now()}`;

      const first = await createNotification({
        userId: userA.id,
        type: "weather",
        title: "Heat Stress Advisory",
        message: "Daytime temperatures exceeding 38C.",
        dedupKey,
      });

      const duplicate = await createNotification({
        userId: userA.id,
        type: "weather",
        title: "Heat Stress Advisory",
        message: "Daytime temperatures exceeding 38C.",
        dedupKey,
      });

      assert.equal(first.id, duplicate.id, "Duplicate alert with identical dedupKey must not produce a new notification");
    });

    test("PATCH /api/notifications/:id/read marks single notification as read", async () => {
      const res = await fetch(`${baseUrl}/api/notifications/${notif1.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.isRead, true);
      assert.ok(json.data.readAt);
    });

    test("Cross-User Isolation: User B cannot mark User A's notification as read", async () => {
      const res = await fetch(`${baseUrl}/api/notifications/${notif2.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.equal(res.status, 404, "User B should receive 404 modifying User A's notification");
    });

    test("GET /api/notifications/unread-count returns accurate unread count", async () => {
      const res = await fetch(`${baseUrl}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(typeof json.unreadCount === "number");
    });

    test("PATCH /api/notifications/read-all marks all user notifications as read", async () => {
      const res = await fetch(`${baseUrl}/api/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(typeof json.data.updatedCount === "number");

      // Verify unread count is now 0
      const countRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const countJson = await countRes.json();
      assert.equal(countJson.unreadCount, 0);
    });
  });

  describe("4. Harvest and Weather Alert Sync Engine", () => {
    test("syncAlertsForUser evaluates real application data without errors", async () => {
      const result = await syncAlertsForUser(userA.id);
      assert.ok(typeof result.generated === "number");
    });

    test("POST /api/notifications/sync-alerts endpoint triggers background sync", async () => {
      const res = await fetch(`${baseUrl}/api/notifications/sync-alerts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preferences: { weatherAlerts: true, harvestAlerts: true },
        }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(typeof json.data.generated === "number");
    });
  });

  describe("5. End-to-End Agricultural Event Integration", () => {
    test("Creating a farm via API logs a 'farm-added' activity event automatically", async () => {
      const createRes = await fetch(`${baseUrl}/api/farms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Riverbed Citrus Farm",
          state: "Maharashtra",
          district: "Nagpur",
          area: 5.5,
          areaUnit: "acre",
        }),
      });
      assert.equal(createRes.status, 201);
      const farmData = (await createRes.json()).data;

      // Check activity feed
      const actRes = await fetch(`${baseUrl}/api/activity?type=farm-added`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const actJson = await actRes.json();
      const found = actJson.data.find((a) => a.entityId === farmData.id || a.farmId === farmData.id);
      assert.ok(found, "Activity feed must reflect newly created farm");
      assert.equal(found.type, "farm-added");
    });
  });
});
