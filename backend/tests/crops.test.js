import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { generateToken } from "../src/middleware/authenticate.js";
import {
  createCropSchema,
  updateCropSchema,
  cropIdParamSchema,
  listCropsQuerySchema,
  VALID_GROWTH_STAGES,
} from "../src/modules/crops/crops.validation.js";

describe("Phase 3 — Crop Management Module Tests", () => {
  let server;
  let baseUrl;

  const userA = {
    id: "user-crop-alpha-123",
    email: "crop_alpha@example.com",
    name: "Farmer Alpha",
    role: "FARMER",
  };
  const userB = {
    id: "user-crop-beta-456",
    email: "crop_beta@example.com",
    name: "Farmer Beta",
    role: "FARMER",
  };

  const tokenA = generateToken(userA);
  const tokenB = generateToken(userB);

  let farmA;
  let farmB;
  let testCropA;

  before(async () => {
    // 1. Ensure test users exist in DB
    await prisma.user.upsert({
      where: { id: userA.id },
      update: {},
      create: {
        id: userA.id,
        email: userA.email,
        name: userA.name,
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$demo_salt$demo_hash",
        role: "FARMER",
      },
    });

    await prisma.user.upsert({
      where: { id: userB.id },
      update: {},
      create: {
        id: userB.id,
        email: userB.email,
        name: userB.name,
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$demo_salt$demo_hash",
        role: "FARMER",
      },
    });

    // 2. Create test farms for each user
    farmA = await prisma.farm.create({
      data: {
        userId: userA.id,
        name: "Alpha Wheat Fields",
        state: "Punjab",
        district: "Ludhiana",
        area: 15.0,
        areaUnit: "HECTARE",
      },
    });

    farmB = await prisma.farm.create({
      data: {
        userId: userB.id,
        name: "Beta Mustard Fields",
        state: "Rajasthan",
        district: "Alwar",
        area: 8.5,
        areaUnit: "ACRE",
      },
    });

    // 3. Start test HTTP server
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

    // Cleanup created test records
    try {
      if (farmA) {
        await prisma.crop.deleteMany({ where: { farmId: farmA.id } });
        await prisma.farm.delete({ where: { id: farmA.id } });
      }
      if (farmB) {
        await prisma.crop.deleteMany({ where: { farmId: farmB.id } });
        await prisma.farm.delete({ where: { id: farmB.id } });
      }
      await prisma.user.deleteMany({
        where: { id: { in: [userA.id, userB.id] } },
      });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe("1. Input Validation Schemas (Zod)", () => {
    test("Enforces required fields for crop creation", () => {
      const res = createCropSchema.safeParse({});
      assert.strictEqual(res.success, false);
      const errors = res.error.errors.map((e) => e.path.join("."));
      assert.ok(errors.some((p) => p.includes("farmId")));
      assert.ok(errors.some((p) => p.includes("cropName")));
      assert.ok(errors.some((p) => p.includes("sowingDate")));
    });

    test("9. Reject invalid growth stages", () => {
      const badRes = createCropSchema.safeParse({
        farmId: "farm-123",
        cropName: "Wheat",
        sowingDate: "2026-10-10",
        growthStage: "INVALID_STAGE_NAME_123",
      });
      assert.strictEqual(badRes.success, false);
      assert.match(
        badRes.error.errors[0].message,
        /Invalid growth stage/i
      );

      const validRes = createCropSchema.safeParse({
        farmId: "farm-123",
        cropName: "Wheat",
        sowingDate: "2026-10-10",
        growthStage: "FLOWERING",
      });
      assert.strictEqual(validRes.success, true);
    });

    test("8. Reject invalid date ranges (expectedHarvestDate earlier than sowingDate)", () => {
      const res = createCropSchema.safeParse({
        farmId: "farm-123",
        cropName: "Wheat",
        sowingDate: "2026-10-10",
        expectedHarvestDate: "2026-09-01", // Earlier than sowingDate
      });
      assert.strictEqual(res.success, false);
      assert.match(
        res.error.errors[0].message,
        /Expected harvest date cannot be earlier than sowing date/i
      );
    });

    test("Accepts valid crop input with standard and optional fields", () => {
      const res = createCropSchema.safeParse({
        farmId: "farm-123",
        cropName: "Wheat",
        variety: "HD 2967",
        sowingDate: "2026-10-10",
        expectedHarvestDate: "2027-03-15",
        growthStage: "SOWN",
        irrigationMethod: "Drip",
        irrigationFrequency: "Every 7 days",
        notes: "Initial crop record",
      });
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.cropName, "Wheat");
      assert.strictEqual(res.data.growthStage, "SOWN");
    });
  });

  describe("2. Authentication & Authorization Enforcement", () => {
    test("11. Reject unauthenticated requests", async () => {
      const res = await fetch(`${baseUrl}/api/crops`);
      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test("12. Reject unauthorized farm access (creating crop on another user's farm)", async () => {
      // User A attempts to create a crop on User B's farm
      const res = await fetch(`${baseUrl}/api/crops`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farmId: farmB.id, // Farm owned by User B!
          cropName: "Intruder Crop",
          sowingDate: "2026-10-10",
        }),
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /permission/i);
    });

    test("10. Reject a nonexistent farm", async () => {
      const res = await fetch(`${baseUrl}/api/crops`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farmId: "nonexistent-farm-id-99999",
          cropName: "Barley",
          sowingDate: "2026-10-10",
        }),
      });
      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });
  });

  describe("3. Crop CRUD Operations & Ownership Isolation", () => {
    test("1. Create a crop with valid data", async () => {
      const res = await fetch(`${baseUrl}/api/crops`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farmId: farmA.id,
          cropName: "Wheat",
          variety: "HD 2967",
          sowingDate: "2026-10-10",
          expectedHarvestDate: "2027-03-15",
          growthStage: "SOWN",
          irrigationMethod: "Drip",
          irrigationFrequency: "Every 7 days",
          notes: "Alpha initial wheat block",
        }),
      });

      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.data.id);
      assert.strictEqual(body.data.cropName, "Wheat");
      assert.strictEqual(body.data.name, "Wheat");
      assert.strictEqual(body.data.variety, "HD 2967");
      assert.strictEqual(body.data.growthStage, "SOWN");
      assert.strictEqual(body.data.farmId, farmA.id);

      testCropA = body.data;
    });

    test("2. Retrieve all accessible crops (returns only user's crops)", async () => {
      // Create a crop for User B as well
      const bRes = await fetch(`${baseUrl}/api/crops`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenB}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farmId: farmB.id,
          cropName: "Mustard",
          variety: "Pusa Bold",
          sowingDate: "2026-10-15",
          growthStage: "PLANNED",
        }),
      });
      assert.strictEqual(bRes.status, 201);

      // User A lists crops
      const resA = await fetch(`${baseUrl}/api/crops`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(resA.status, 200);
      const bodyA = await resA.json();
      assert.strictEqual(bodyA.success, true);
      assert.ok(Array.isArray(bodyA.data));
      // All crops belong to User A's farm
      assert.ok(bodyA.data.every((c) => c.farmId === farmA.id));
      assert.ok(bodyA.data.some((c) => c.id === testCropA.id));

      // 13. Prevent users from reading another user's crops in list
      assert.ok(!bodyA.data.some((c) => c.farmId === farmB.id));
    });

    test("3. Retrieve a single crop", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${testCropA.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.id, testCropA.id);
      assert.strictEqual(body.data.cropName, "Wheat");
      assert.ok(body.data.farm);
      assert.strictEqual(body.data.farm.id, farmA.id);
    });

    test("13. Prevent users from reading another user's crops by ID", async () => {
      // User B attempts to get User A's crop
      const res = await fetch(`${baseUrl}/api/crops/${testCropA.id}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test("4. Update crop information (PATCH)", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${testCropA.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          growthStage: "VEGETATIVE",
          notes: "Updated block notes after vegetative emergence",
        }),
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.growthStage, "VEGETATIVE");
      assert.strictEqual(
        body.data.notes,
        "Updated block notes after vegetative emergence"
      );
      // Preserved omitted fields
      assert.strictEqual(body.data.cropName, "Wheat");
      assert.strictEqual(body.data.variety, "HD 2967");
    });

    test("14. Prevent users from updating another user's crops", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${testCropA.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenB}`, // User B!
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cropName: "Hacked Crop",
        }),
      });
      assert.ok([403, 404].includes(res.status));
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test("6. Filter crops by farm", async () => {
      const res = await fetch(`${baseUrl}/api/crops?farmId=${farmA.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.data.every((c) => c.farmId === farmA.id));
    });

    test("7. Filter crops by growth stage", async () => {
      const res = await fetch(`${baseUrl}/api/crops?growthStage=VEGETATIVE`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.data.every((c) => c.growthStage === "VEGETATIVE"));
    });

    test("15. Prevent users from deleting another user's crops", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${testCropA.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenB}` }, // User B!
      });
      assert.ok([403, 404].includes(res.status));
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test("5. Delete a crop & 16. Verify deleting crop does not delete its farm", async () => {
      const res = await fetch(`${baseUrl}/api/crops/${testCropA.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);

      // Verify crop is deleted
      const checkCrop = await fetch(`${baseUrl}/api/crops/${testCropA.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(checkCrop.status, 404);

      // Verify farm still exists
      const checkFarm = await prisma.farm.findUnique({
        where: { id: farmA.id },
      });
      assert.ok(checkFarm);
      assert.strictEqual(checkFarm.id, farmA.id);
    });

    test("17. Verify that Phase 2 farm endpoints continue to work", async () => {
      const res = await fetch(`${baseUrl}/api/farms`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.data.some((f) => f.id === farmA.id));
    });
  });
});
