import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { generateToken } from "../src/middleware/authenticate.js";
import { retrieveAgriculturalKnowledge } from "../src/modules/assistant/knowledge/retriever.js";
import { TOOL_REGISTRY } from "../src/modules/assistant/tools/farmTools.js";
import { LocalAgronomicEngine } from "../src/modules/assistant/providers/localAgronomicEngine.js";
import { seedKnowledgeBase } from "../src/modules/assistant/knowledge/ingestionPipeline.js";

describe("Phase AI-7: Agricultural AI Assistant Tests", () => {
  let server;
  let baseUrl;

  const testUserA = { id: "ai7-user-a-101", email: "ai7-farmer-a@harvestwindow.test", role: "FARMER" };
  const testUserB = { id: "ai7-user-b-202", email: "ai7-farmer-b@harvestwindow.test", role: "FARMER" };
  const tokenA = generateToken(testUserA);
  const tokenB = generateToken(testUserB);

  let farmA;
  let cropA;
  let activeConversationId;

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

    // 2. Ensure test users exist in DB
    await prisma.user.upsert({
      where: { id: testUserA.id },
      update: {},
      create: {
        id: testUserA.id,
        name: "Test Farmer Alpha",
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
        name: "Test Farmer Beta",
        email: testUserB.email,
        passwordHash: "$argon2id$dummy",
        role: "FARMER",
      },
    });

    // 3. Create test farm and crop for User A
    farmA = await prisma.farm.create({
      data: {
        userId: testUserA.id,
        name: "Alpha Green Fields",
        state: "Punjab",
        district: "Ludhiana",
        area: 4.5,
        areaUnit: "HECTARE",
        latitude: 30.901,
        longitude: 75.857,
      },
    });

    cropA = await prisma.crop.create({
      data: {
        farmId: farmA.id,
        cropName: "Wheat",
        variety: "HD-3086",
        growthStage: "grain_filling",
        sowingDate: new Date(Date.now() - 90 * 86400000),
        expectedHarvestDate: new Date(Date.now() + 10 * 86400000),
        fieldArea: 3.0,
      },
    });

    // 4. Create sample HarvestPrediction for cropA
    await prisma.harvestPrediction.create({
      data: {
        userId: testUserA.id,
        farmId: farmA.id,
        cropId: cropA.id,
        predictionMethod: "agronomic_baseline",
        modelVersion: "1.0.0",
        mostLikelyHarvestDate: new Date(Date.now() + 10 * 86400000),
        estimatedHarvestStart: new Date(Date.now() + 7 * 86400000),
        estimatedHarvestEnd: new Date(Date.now() + 14 * 86400000),
        daysUntilHarvest: 10,
      },
    });

    // 5. Seed knowledge base
    await seedKnowledgeBase();
  });

  after(async () => {
    // Cleanup test data
    try {
      await prisma.assistantMessage.deleteMany({
        where: { conversation: { userId: { in: [testUserA.id, testUserB.id] } } },
      });
      await prisma.assistantConversation.deleteMany({
        where: { userId: { in: [testUserA.id, testUserB.id] } },
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

  // Test 1: Status endpoint (public/operational)
  test("GET /api/v1/ai/assistant/status returns ready status and trusted sources", async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/assistant/status`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "ready");
    assert.ok(Array.isArray(body.data.trustedSources));
    assert.ok(body.data.trustedSources.includes("FAO"));
    assert.ok(body.data.trustedSources.includes("ICAR"));
  });

  // Test 2: Unauthenticated chat rejected
  test("POST /api/v1/ai/assistant/chat rejects unauthenticated requests with 401", async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/assistant/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "When should I harvest my wheat?" }),
    });
    assert.equal(res.status, 401);
  });

  // Test 3: Empty message validation
  test("POST /api/v1/ai/assistant/chat rejects empty message with 400", async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ message: "   " }),
    });
    assert.equal(res.status, 400);
  });

  // Test 4: RAG Retrieval unit check
  test("RAG Retriever fetches relevant chunks and verified citations for wheat harvest", async () => {
    const docs = await retrieveAgriculturalKnowledge({
      query: "wheat harvesting moisture grain drying storage",
      cropHint: "wheat",
      limit: 3,
    });
    assert.ok(Array.isArray(docs));
    assert.ok(docs.length > 0);
    const first = docs[0];
    assert.ok(first.title);
    assert.ok(first.sourceUrl);
    assert.ok(first.publisher);
    assert.ok(first.contentSnippet);
  });

  // Test 5: Server-Controlled Farm Tools authorization
  test("Server-controlled farm tool getUserFarms strictly respects user ID isolation", async () => {
    const farmsA = await TOOL_REGISTRY.getUserFarms.execute({}, { userId: testUserA.id });
    assert.equal(farmsA.farms.length, 1);
    assert.equal(farmsA.farms[0].name, "Alpha Green Fields");

    const farmsB = await TOOL_REGISTRY.getUserFarms.execute({}, { userId: testUserB.id });
    assert.equal(farmsB.farms.length, 0);
  });

  // Test 6: Zero-cost LocalAgronomicEngine synthesis
  test("LocalAgronomicEngine synthesizes grounded response with farm context and citations", async () => {
    const response = await LocalAgronomicEngine.generateResponse({
      message: "When is my wheat expected to be ready for harvest?",
      farmContext: {
        farm: { name: "Alpha Green Fields" },
        crops: [{ cropName: "Wheat", variety: "HD-3086", growthStage: "grain_filling" }],
        harvestPredictions: [{ daysUntilHarvest: 10, mostLikelyHarvestDate: new Date().toISOString() }],
      },
      knowledgeDocs: [
        {
          title: "Wheat Crop Management & Harvest Timing Guide",
          publisher: "ICAR / PAU",
          sourceUrl: "https://icar.org.in/wheat-guidelines",
          contentSnippet: "Wheat should be harvested when grain moisture drops below 14% to prevent lodging.",
        },
      ],
      language: "en",
    });

    assert.ok(response.answer.length > 50);
    assert.ok(response.answer.includes("Wheat"));
    assert.ok(response.sources.length > 0);
    assert.equal(response.sources[0].publisher, "ICAR / PAU");
  });

  // Test 7: Authenticated Chat conversation flow end-to-end
  test("POST /api/v1/ai/assistant/chat generates answer and stores conversation", async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        message: "When should I harvest my wheat and what are the weather risks?",
        farmId: farmA.id,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.conversationId);
    assert.ok(body.data.answer);
    assert.equal(body.data.farmContextUsed, true);
    assert.ok(Array.isArray(body.data.sources));

    activeConversationId = body.data.conversationId;
  });

  // Test 8: List conversations for authenticated user
  test("GET /api/v1/ai/assistant/conversations lists only User A's conversations", async () => {
    const resA = await fetch(`${baseUrl}/api/v1/ai/assistant/conversations`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resA.status, 200);
    const bodyA = await resA.json();
    assert.ok(bodyA.data.length >= 1);
    assert.ok(bodyA.data.some((c) => c.id === activeConversationId));

    // User B should see 0 conversations
    const resB = await fetch(`${baseUrl}/api/v1/ai/assistant/conversations`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(resB.status, 200);
    const bodyB = await resB.json();
    assert.equal(bodyB.data.length, 0);
  });

  // Test 9: Cross-user conversation access isolation
  test("GET /api/v1/ai/assistant/conversations/:id blocks unauthorized user access with 404", async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/assistant/conversations/${activeConversationId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(res.status, 404);
  });

  // Test 10: Delete conversation
  test("DELETE /api/v1/ai/assistant/conversations/:id deletes conversation for owner", async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/assistant/conversations/${activeConversationId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 200);

    // Subsequent retrieval should 404
    const checkRes = await fetch(`${baseUrl}/api/v1/ai/assistant/conversations/${activeConversationId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(checkRes.status, 404);
  });
});
