import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { generateToken } from "../src/middleware/authenticate.js";

describe("Phase AI-6 — Crop Disease & Health Detection Tests", () => {
  let server;
  let baseUrl;

  const userA = { id: "user-ai6-test-a-101", email: "ai6-a@example.com", role: "FARMER" };
  const userB = { id: "user-ai6-test-b-202", email: "ai6-b@example.com", role: "FARMER" };
  const tokenA = generateToken(userA);
  const tokenB = generateToken(userB);

  let farmA;
  let cropPotato;

  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });

    // Cleanup prior test artifacts
    await prisma.cropHealthAnalysis.deleteMany({
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

    // Create users
    await prisma.user.createMany({
      data: [
        {
          id: userA.id,
          name: "Farmer AI6 Alpha",
          email: userA.email,
          passwordHash: "hash-test-pwd",
          role: "FARMER",
        },
        {
          id: userB.id,
          name: "Farmer AI6 Beta",
          email: userB.email,
          passwordHash: "hash-test-pwd",
          role: "FARMER",
        },
      ],
    });

    // Create farm for User A
    farmA = await prisma.farm.create({
      data: {
        userId: userA.id,
        name: "Green Valley Farm",
        state: "Punjab",
        district: "Jalandhar",
        area: 4.5,
        areaUnit: "HECTARE",
      },
    });

    // Create crop for User A
    cropPotato = await prisma.crop.create({
      data: {
        farmId: farmA.id,
        cropName: "Potato",
        variety: "Kufri Jyoti",
        sowingDate: new Date("2026-10-01"),
        fieldArea: 2.0,
      },
    });
  });

  after(async () => {
    await prisma.cropHealthAnalysis.deleteMany({
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
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe("1. Public Status & Authentication Controls", () => {
    test("GET /api/crop-health/status returns public model availability metadata", async () => {
      const res = await fetch(`${baseUrl}/api/crop-health/status`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.model_version, "1.0.0");
      assert.ok(data.data.supported_crops.includes("Potato"));
    });

    test("POST /api/crop-health/analyze rejects unauthenticated request with 401", async () => {
      const res = await fetch(`${baseUrl}/api/crop-health/analyze`, {
        method: "POST",
      });
      assert.strictEqual(res.status, 401);
    });

    test("POST /api/crop-health/analyze rejects request without image with 400", async () => {
      const formData = new FormData();
      formData.append("cropId", cropPotato.id);

      const res = await fetch(`${baseUrl}/api/crop-health/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenA}` },
        body: formData,
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.message.includes("No image file provided"));
    });
  });

  describe("2. Image Analysis & Ownership Enforcement", () => {
    let createdAnalysisId;

    // Helper: generate 100x100 dummy JPEG bytes
    const createDummyImageBlob = () => {
      // Small minimal valid JPEG header
      const header = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
        0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
        0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
        0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
        0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x20,
        0x00, 0x20, 0x01, 0x01, 0x11, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3f, 0x00, 0x37, 0xff, 0xd9,
      ]);
      return new Blob([header], { type: "image/jpeg" });
    };

    test("POST /api/crop-health/analyze enforces crop ownership: User B cannot analyze User A's crop (404)", async () => {
      const formData = new FormData();
      formData.append("image", createDummyImageBlob(), "potato_leaf.jpg");
      formData.append("cropId", cropPotato.id);

      const res = await fetch(`${baseUrl}/api/crop-health/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenB}` },
        body: formData,
      });

      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.ok(data.message.includes("not found or you are not authorized"));
    });

    test("POST /api/crop-health/analyze successfully analyzes image for User A and creates record", async () => {
      const formData = new FormData();
      formData.append("image", createDummyImageBlob(), "potato_blight.jpg");
      formData.append("cropId", cropPotato.id);

      const res = await fetch(`${baseUrl}/api/crop-health/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenA}` },
        body: formData,
      });

      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      const d = body.data;

      assert.ok(d.id);
      createdAnalysisId = d.id;
      assert.strictEqual(d.cropName, "Potato");
      assert.ok(["HEALTHY", "DISEASED", "UNFAMILIAR", "INCONCLUSIVE"].includes(d.status));
      assert.ok(d.confidencePct > 0);
      assert.ok(Array.isArray(d.symptoms));
      assert.ok(d.recommendations);
      assert.ok(d.imageUrl.startsWith("/uploads/crop-health/"));
      assert.strictEqual(d.cropId, cropPotato.id);
    });

    test("GET /api/crop-health/analyses/:id retrieves analysis for authorized User A", async () => {
      const res = await fetch(`${baseUrl}/api/crop-health/analyses/${createdAnalysisId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.data.id, createdAnalysisId);
      assert.strictEqual(body.data.cropName, "Potato");
    });

    test("GET /api/crop-health/analyses/:id isolates User B from User A's analysis (404)", async () => {
      const res = await fetch(`${baseUrl}/api/crop-health/analyses/${createdAnalysisId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.strictEqual(res.status, 404);
    });

    test("GET /api/crop-health/history returns paginated analysis history for User A", async () => {
      const res = await fetch(`${baseUrl}/api/crop-health/history?cropId=${cropPotato.id}&limit=10`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.data.total >= 1);
      assert.strictEqual(body.data.analyses[0].id, createdAnalysisId);
    });

    test("DELETE /api/crop-health/analyses/:id rejects User B (404) and succeeds for User A", async () => {
      // User B unauthorized delete
      const resB = await fetch(`${baseUrl}/api/crop-health/analyses/${createdAnalysisId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.strictEqual(resB.status, 404);

      // User A authorized delete
      const resA = await fetch(`${baseUrl}/api/crop-health/analyses/${createdAnalysisId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(resA.status, 200);

      // Verify deletion from database
      const check = await prisma.cropHealthAnalysis.findUnique({
        where: { id: createdAnalysisId },
      });
      assert.strictEqual(check, null);
    });
  });
});
