import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import { generateToken } from "../src/middleware/authenticate.js";
import {
  farmWeatherParamSchema,
  coordinatesQuerySchema,
} from "../src/modules/weather/weather.validation.js";
import { generateWeatherWarnings } from "../src/modules/weather/weather.warnings.js";
import { resolveWeatherCode } from "../src/modules/weather/weather.constants.js";
import { WeatherCache } from "../src/modules/weather/weather.cache.js";
import { normalizeWeatherPayload } from "../src/modules/weather/weather.provider.js";
import { createFarm } from "../src/modules/farms/farms.service.js";

describe("Phase 4 — Weather Integration Module Tests", () => {
  let server;
  let baseUrl;
  const userA = { id: "weather-user-a-111", email: "weather-a@example.com", role: "FARMER" };
  const userB = { id: "weather-user-b-222", email: "weather-b@example.com", role: "FARMER" };
  const tokenA = generateToken(userA);
  const tokenB = generateToken(userB);

  let farmWithCoords;
  let farmWithoutCoords;

  before(async () => {
    // Setup test HTTP server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Create a farm with valid coordinates for User A
    farmWithCoords = await createFarm(userA.id, {
      name: "Valley Green Farm",
      state: "Karnataka",
      district: "Hassan",
      latitude: 12.9716,
      longitude: 77.5946,
      area: 10,
      areaUnit: "hectare",
    });

    // Create a farm without coordinates for User A
    farmWithoutCoords = await createFarm(userA.id, {
      name: "Unmapped Plot",
      state: "Karnataka",
      district: "Mysuru",
      area: 5,
      areaUnit: "acre",
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe("1. Validation & WMO Mapping", () => {
    test("farmWeatherParamSchema requires non-empty farmId", () => {
      assert.strictEqual(farmWeatherParamSchema.safeParse({ farmId: "abc" }).success, true);
      assert.strictEqual(farmWeatherParamSchema.safeParse({ farmId: "" }).success, false);
      assert.strictEqual(farmWeatherParamSchema.safeParse({}).success, false);
    });

    test("coordinatesQuerySchema validates latitude (-90 to 90) and longitude (-180 to 180)", () => {
      assert.strictEqual(
        coordinatesQuerySchema.safeParse({ latitude: "12.97", longitude: "77.59" }).success,
        true
      );
      assert.strictEqual(
        coordinatesQuerySchema.safeParse({ latitude: "95.0", longitude: "77.59" }).success,
        false
      );
      assert.strictEqual(
        coordinatesQuerySchema.safeParse({ latitude: "12.97", longitude: "200.0" }).success,
        false
      );
      assert.strictEqual(
        coordinatesQuerySchema.safeParse({ latitude: "invalid", longitude: "77.59" }).success,
        false
      );
    });

    test("resolveWeatherCode maps WMO codes to correct condition and label", () => {
      const clear = resolveWeatherCode(0);
      assert.strictEqual(clear.condition, "clear");
      assert.strictEqual(clear.label, "Clear sky");

      const rain = resolveWeatherCode(65);
      assert.strictEqual(rain.condition, "rain");
      assert.strictEqual(rain.label, "Heavy rain");

      const storm = resolveWeatherCode(95);
      assert.strictEqual(storm.condition, "storm");
      assert.strictEqual(storm.label, "Thunderstorm");

      const unknown = resolveWeatherCode(9999);
      assert.strictEqual(unknown.condition, "partly-cloudy");
    });
  });

  describe("2. Agricultural Weather Warnings Generation", () => {
    test("Generates heavy rainfall warning when daily precipitation >= 20mm", () => {
      const daily = [
        { date: "2026-10-15", precipitationMm: 28, maxTempC: 30, minTempC: 22 },
        { date: "2026-10-16", precipitationMm: 2, maxTempC: 29, minTempC: 21 },
      ];
      const warnings = generateWeatherWarnings(daily);
      const rainWarn = warnings.find((w) => w.type === "RAIN" && w.severity === "HIGH");
      assert.ok(rainWarn, "Expected high severity rainfall warning");
      assert.strictEqual(rainWarn.value, 28);
      assert.strictEqual(rainWarn.date, "2026-10-15");
      assert.strictEqual(rainWarn.unit, "mm");
    });

    test("Generates extreme heat warning when max temperature >= 38°C", () => {
      const daily = [
        { date: "2026-10-18", precipitationMm: 0, maxTempC: 40.5, minTempC: 26 },
      ];
      const warnings = generateWeatherWarnings(daily);
      const heatWarn = warnings.find((w) => w.type === "TEMPERATURE" && w.severity === "HIGH");
      assert.ok(heatWarn, "Expected extreme heat warning");
      assert.strictEqual(heatWarn.value, 40.5);
      assert.strictEqual(heatWarn.date, "2026-10-18");
    });

    test("Generates frost risk alert when min temperature <= 5°C", () => {
      const daily = [
        { date: "2026-12-20", precipitationMm: 0, maxTempC: 18, minTempC: 3.5 },
      ];
      const warnings = generateWeatherWarnings(daily);
      const coldWarn = warnings.find((w) => w.type === "TEMPERATURE" && w.severity === "HIGH");
      assert.ok(coldWarn, "Expected frost risk alert");
      assert.strictEqual(coldWarn.value, 3.5);
    });

    test("Generates multi-day wet spell warning for 3+ consecutive rainy days", () => {
      const daily = [
        { date: "2026-10-11", precipitationMm: 8, maxTempC: 28, minTempC: 22 },
        { date: "2026-10-12", precipitationMm: 12, maxTempC: 27, minTempC: 21 },
        { date: "2026-10-13", precipitationMm: 9, maxTempC: 26, minTempC: 21 },
      ];
      const warnings = generateWeatherWarnings(daily);
      const wetSpell = warnings.find((w) => w.title.includes("Multi-day wet spell"));
      assert.ok(wetSpell, "Expected multi-day wet spell warning");
      assert.strictEqual(wetSpell.date, "2026-10-11");
    });

    test("Returns empty warnings array when all conditions are mild", () => {
      const mildDaily = [
        { date: "2026-10-11", precipitationMm: 0, maxTempC: 27, minTempC: 19 },
        { date: "2026-10-12", precipitationMm: 1, maxTempC: 28, minTempC: 20 },
      ];
      const warnings = generateWeatherWarnings(mildDaily);
      assert.strictEqual(warnings.length, 0);
    });
  });

  describe("3. In-Memory Bounded Weather Cache", () => {
    test("Correctly caches, retrieves, and checks isCached flag", () => {
      const cache = new WeatherCache(5, 5000);
      assert.strictEqual(cache.get(12.9716, 77.5946), null);

      const payload = { temp: 25 };
      cache.set(12.9716, 77.5946, payload);

      const retrieved = cache.get(12.9716, 77.5946);
      assert.ok(retrieved);
      assert.strictEqual(retrieved.isCached, true);
      assert.deepStrictEqual(retrieved.data, payload);
    });

    test("Evicts oldest entry when reaching max capacity", () => {
      const cache = new WeatherCache(2, 60000);
      cache.set(10.0, 10.0, { id: 1 });
      cache.set(20.0, 20.0, { id: 2 });
      assert.strictEqual(cache.size, 2);

      // Third insertion should evict oldest (10.0, 10.0)
      cache.set(30.0, 30.0, { id: 3 });
      assert.strictEqual(cache.size, 2);
      assert.strictEqual(cache.get(10.0, 10.0), null);
      assert.ok(cache.get(20.0, 20.0));
      assert.ok(cache.get(30.0, 30.0));
    });
  });

  describe("4. Weather API Endpoints (/api/v1/weather & /api/weather)", () => {
    test("Rejects unauthenticated request to /api/v1/weather/:farmId with 401", async () => {
      const res = await fetch(`${baseUrl}/api/v1/weather/${farmWithCoords.id}`);
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.success, false);
    });

    test("Returns 404 when requested farm does not exist", async () => {
      const res = await fetch(`${baseUrl}/api/v1/weather/non-existent-farm-id`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 404);
      const json = await res.json();
      assert.strictEqual(json.success, false);
    });

    test("Enforces farm ownership: User B cannot access User A's farm weather", async () => {
      const res = await fetch(`${baseUrl}/api/v1/weather/${farmWithCoords.id}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.strictEqual(res.status, 404);
      const json = await res.json();
      assert.strictEqual(json.success, false);
    });

    test("Returns 400 with descriptive error when farm coordinates are missing", async () => {
      const res = await fetch(`${baseUrl}/api/v1/weather/${farmWithoutCoords.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.match(json.message, /coordinates are missing/i);
    });

    test("Successfully retrieves real live weather for farm with valid coordinates", async () => {
      const res = await fetch(`${baseUrl}/api/v1/weather/${farmWithCoords.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.farm);
      assert.strictEqual(json.data.farm.id, farmWithCoords.id);
      assert.ok(json.data.current);
      assert.strictEqual(typeof json.data.current.temperatureC, "number");
      assert.strictEqual(typeof json.data.current.condition, "string");
      assert.ok(Array.isArray(json.data.dailyForecast));
      assert.ok(json.data.dailyForecast.length >= 10, "Forecast must contain at least 10 days");
      assert.ok(Array.isArray(json.data.warnings));
      assert.ok(
        json.data.provider.includes("WeatherAPI") || json.data.provider === "Open-Meteo",
        `Unexpected provider: ${json.data.provider}`
      );
    });

    test("Accepts live location endpoint /api/v1/weather/current with valid query coords", async () => {
      const res = await fetch(`${baseUrl}/api/v1/weather/current?latitude=12.9716&longitude=77.5946`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.location);
      assert.ok(json.data.current);
      assert.ok(Array.isArray(json.data.dailyForecast));
      assert.ok(json.data.dailyForecast.length >= 10);
    });

    test("Rejects live location endpoint /api/v1/weather/current with out-of-bounds coords", async () => {
      const res = await fetch(`${baseUrl}/api/v1/weather/current?latitude=999&longitude=77.5946`);
      assert.strictEqual(res.status, 400); // Bad Request validation error
      const json = await res.json();
      assert.strictEqual(json.success, false);
    });
  });
});
