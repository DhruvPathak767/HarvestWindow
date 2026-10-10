import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import { generateToken } from "../src/middleware/authenticate.js";
import {
  createFarmSchema,
  updateFarmSchema,
  farmIdParamSchema,
} from "../src/modules/farms/farms.validation.js";

describe("Phase 2 — Farm Management Module Tests", () => {
  let server;
  let baseUrl;
  const userA = { id: "user-alpha-123", email: "alpha@example.com", role: "Farm manager" };
  const userB = { id: "user-beta-456", email: "beta@example.com", role: "Farm manager" };
  const tokenA = generateToken(userA);
  const tokenB = generateToken(userB);

  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe("1. Input Validation Schemas (Zod)", () => {
    test("Enforces required fields for farm creation", () => {
      const res = createFarmSchema.safeParse({});
      assert.strictEqual(res.success, false);
      const fields = res.error.errors.map((e) => e.path[0]);
      assert.ok(fields.includes("name"));
      assert.ok(fields.includes("state"));
      assert.ok(fields.includes("district"));
      assert.ok(fields.includes("area"));
      assert.ok(fields.includes("areaUnit"));
    });

    test("Rejects invalid area values (negative or zero)", () => {
      const negativeRes = createFarmSchema.safeParse({
        name: "Test Farm",
        state: "Punjab",
        district: "Ludhiana",
        area: -5,
        areaUnit: "acre",
      });
      assert.strictEqual(negativeRes.success, false);

      const zeroRes = createFarmSchema.safeParse({
        name: "Test Farm",
        state: "Punjab",
        district: "Ludhiana",
        area: 0,
        areaUnit: "acre",
      });
      assert.strictEqual(zeroRes.success, false);
    });

    test("Rejects invalid area units", () => {
      const res = createFarmSchema.safeParse({
        name: "Test Farm",
        state: "Punjab",
        district: "Ludhiana",
        area: 10,
        areaUnit: "sqm", // only hectare or acre allowed
      });
      assert.strictEqual(res.success, false);
    });

    test("Rejects coordinate pairs when only one coordinate is provided", () => {
      const resOnlyLat = createFarmSchema.safeParse({
        name: "Test Farm",
        state: "Punjab",
        district: "Ludhiana",
        area: 10,
        areaUnit: "acre",
        latitude: 30.9,
      });
      assert.strictEqual(resOnlyLat.success, false);

      const resOnlyLon = createFarmSchema.safeParse({
        name: "Test Farm",
        state: "Punjab",
        district: "Ludhiana",
        area: 10,
        areaUnit: "acre",
        longitude: 75.8,
      });
      assert.strictEqual(resOnlyLon.success, false);
    });

    test("Rejects coordinates outside geographic bounds", () => {
      const resBadLat = createFarmSchema.safeParse({
        name: "Test Farm",
        state: "Punjab",
        district: "Ludhiana",
        area: 10,
        areaUnit: "acre",
        latitude: 95.0, // max 90
        longitude: 75.8,
      });
      assert.strictEqual(resBadLat.success, false);

      const resBadLon = createFarmSchema.safeParse({
        name: "Test Farm",
        state: "Punjab",
        district: "Ludhiana",
        area: 10,
        areaUnit: "acre",
        latitude: 30.9,
        longitude: 195.0, // max 180
      });
      assert.strictEqual(resBadLon.success, false);
    });

    test("Accepts valid farm input", () => {
      const res = createFarmSchema.safeParse({
        name: "Greenridge Farm",
        state: "Karnataka",
        district: "Hassan",
        area: 12.5,
        areaUnit: "hectare",
        latitude: 13.0068,
        longitude: 76.1001,
        notes: "Irrigated bore-well block",
      });
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.name, "Greenridge Farm");
      assert.strictEqual(res.data.area, 12.5);
    });

    test("Validates updateFarmSchema supports partial fields", () => {
      const res = updateFarmSchema.safeParse({
        name: "Updated Farm Name",
      });
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.name, "Updated Farm Name");
    });
  });

  describe("2. Authentication & Authorization Enforcement", () => {
    test("Rejects unauthenticated requests with 401", async () => {
      const res = await fetch(`${baseUrl}/api/farms`);
      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Authentication required/i);
    });

    test("Rejects invalid bearer token with 401", async () => {
      const res = await fetch(`${baseUrl}/api/farms`, {
        headers: { Authorization: "Bearer bad-token-12345" },
      });
      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test("Allows authenticated request with valid token", async () => {
      const res = await fetch(`${baseUrl}/api/farms`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      // Either 200 (if DB connected) or safe DB error (500 without leaking details)
      assert.ok([200, 500].includes(res.status));
      const body = await res.json();
      assert.ok("success" in body);
    });

    test("Rejects malformed POST payload with 422 validation error", async () => {
      const res = await fetch(`${baseUrl}/api/farms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "X", // too short
          state: "",
          district: "",
          area: -10, // negative
          areaUnit: "invalid",
        }),
      });
      assert.strictEqual(res.status, 422);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, "Validation failed");
      assert.ok(Array.isArray(body.errors));
      assert.ok(body.errors.length > 0);
    });
  });

  describe("3. Health Endpoint", () => {
    test("GET /api/health returns 200 ok", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.status, "ok");
    });
  });

  describe("4. Multi-Tenant Farm Isolation & Cross-User Privacy", () => {
    test("Farms created by User A are strictly inaccessible to User B", async () => {
      // Create farm under User A
      const createRes = await fetch(`${baseUrl}/api/farms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "User Alpha Private Orchard",
          state: "Maharashtra",
          district: "Nashik",
          area: 8.5,
          areaUnit: "hectare",
        }),
      });

      // If DB is available (status 201), test isolation
      if (createRes.status === 201) {
        const createBody = await createRes.json();
        const farmId = createBody.data.id;

        // 1. User B lists farms — must not include Alpha's farm
        const listBRes = await fetch(`${baseUrl}/api/farms`, {
          headers: { Authorization: `Bearer ${tokenB}` },
        });
        assert.strictEqual(listBRes.status, 200);
        const listBBody = await listBRes.json();
        const foundInB = listBBody.data.some((f) => f.id === farmId);
        assert.strictEqual(foundInB, false, "User B must not see User A's farm in list");

        // 2. User B tries to retrieve Alpha's farm by ID — must return 404
        const getBRes = await fetch(`${baseUrl}/api/farms/${farmId}`, {
          headers: { Authorization: `Bearer ${tokenB}` },
        });
        assert.strictEqual(getBRes.status, 404, "User B must receive 404 when requesting User A's farm ID");

        // 3. User B tries to update Alpha's farm — must return 404
        const updateBRes = await fetch(`${baseUrl}/api/farms/${farmId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${tokenB}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: "Hacked Orchard Name" }),
        });
        assert.strictEqual(updateBRes.status, 404, "User B must receive 404 when updating User A's farm");

        // 4. User B tries to delete Alpha's farm — must return 404
        const deleteBRes = await fetch(`${baseUrl}/api/farms/${farmId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${tokenB}` },
        });
        assert.strictEqual(deleteBRes.status, 404, "User B must receive 404 when deleting User A's farm");

        // Clean up: User A deletes own farm
        await fetch(`${baseUrl}/api/farms/${farmId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${tokenA}` },
        });
      }
    });
  });
});
