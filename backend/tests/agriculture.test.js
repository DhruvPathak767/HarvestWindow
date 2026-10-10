import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";

describe("Phase AI-1 — Agricultural Knowledge Base & Data Foundation Tests", () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  async function request(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  }

  test("1. GET /api/v1/agriculture/crops returns paginated canonical crops", async () => {
    const { status, body } = await request("/api/v1/agriculture/crops?limit=5");
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.items));
    assert.ok(body.data.items.length > 0);
    assert.ok(body.data.pagination);
    assert.ok(body.data.pagination.total >= body.data.items.length);

    const first = body.data.items[0];
    assert.ok(first.id);
    assert.ok(first.name);
    assert.ok(first.category);
    assert.ok(typeof first.counts === "object");
  });

  test("2. GET /api/v1/agriculture/crops supports filtering by category and search", async () => {
    const { status, body } = await request("/api/v1/agriculture/crops?category=Cereals");
    assert.strictEqual(status, 200);
    assert.ok(body.data.items.every((c) => c.category === "Cereals"));

    const searchRes = await request("/api/v1/agriculture/crops?search=Wheat");
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchRes.body.data.items.some((c) => c.name.toLowerCase().includes("wheat")));
  });

  test("3. GET /api/v1/agriculture/crops/:cropId returns complete crop details and returns 404 for invalid ID", async () => {
    const listRes = await request("/api/v1/agriculture/crops?limit=1");
    const cropId = listRes.body.data.items[0].id;

    const { status, body } = await request(`/api/v1/agriculture/crops/${cropId}`);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.id, cropId);
    assert.ok(Array.isArray(body.data.varieties));
    assert.ok(Array.isArray(body.data.calendars));
    assert.ok(Array.isArray(body.data.growthProfiles));
    assert.ok(Array.isArray(body.data.suitabilities));

    const notFound = await request("/api/v1/agriculture/crops/nonexistent-crop-id-999");
    assert.strictEqual(notFound.status, 404);
  });

  test("4. GET /api/v1/agriculture/seasons returns canonical Indian seasons", async () => {
    const { status, body } = await request("/api/v1/agriculture/seasons");
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    const names = body.data.map((s) => s.name);
    assert.ok(names.includes("Kharif"));
    assert.ok(names.includes("Rabi"));
  });

  test("5. GET /api/v1/agriculture/regions returns indexed states and districts", async () => {
    const { status, body } = await request("/api/v1/agriculture/regions?limit=10");
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.data.items));
    assert.ok(body.data.items.length > 0);
    assert.ok(body.data.items[0].state);
  });

  test("6. GET /api/v1/agriculture/crop-calendar returns regional sowing and harvest dates", async () => {
    const { status, body } = await request("/api/v1/agriculture/crop-calendar?limit=5");
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.data.items));
    assert.ok(body.data.items.length > 0);

    const first = body.data.items[0];
    assert.ok(first.sowingStartMonth >= 1 && first.sowingStartMonth <= 12);
    assert.ok(first.sowingEndMonth >= 1 && first.sowingEndMonth <= 12);
    assert.ok(first.crop);
    assert.ok(first.region);
    assert.ok(first.season);
  });

  test("7. GET /api/v1/agriculture/crop-growth-profiles returns verified durations and GDD", async () => {
    const { status, body } = await request("/api/v1/agriculture/crop-growth-profiles");
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);

    const withGdd = body.data.find((p) => p.gddRequirementTypical !== null);
    assert.ok(withGdd, "Expected at least one crop with verified GDD requirement");
    assert.ok(withGdd.baseTemperature !== null);
    assert.ok(withGdd.minDurationDays <= withGdd.typicalDurationDays);
    assert.ok(withGdd.typicalDurationDays <= withGdd.maxDurationDays);
  });

  test("8. GET /api/v1/agriculture/crop-suitability returns soil, pH, and climate constraints", async () => {
    const { status, body } = await request("/api/v1/agriculture/crop-suitability");
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);

    const first = body.data[0];
    assert.ok(first.crop);
    assert.ok(first.soilTypes || first.soilPhMin || first.tempMinC);
  });

  test("9. GET /api/v1/agriculture/data-sources returns provenance audit registry", async () => {
    const { status, body } = await request("/api/v1/agriculture/data-sources");
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);

    const first = body.data[0];
    assert.ok(first.sourceName);
    assert.ok(first.dataOrigin);
    assert.ok(first.verificationStatus);
  });

  test("10. GET /api/v1/agriculture/data-quality returns completeness and verification metrics", async () => {
    const { status, body } = await request("/api/v1/agriculture/data-quality");
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.completeness);
    assert.ok(body.data.completeness.totalCrops >= 10);
    assert.ok(body.data.completeness.totalCalendars >= 20);
    assert.ok(body.data.completeness.gddAvailabilityCount > 0);
    assert.ok(body.data.verificationDistribution);
    assert.ok(body.data.provenanceStatus.isVerifiedReferenceAvailable);
  });
});
