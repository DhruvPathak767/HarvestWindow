import prisma from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { getWeatherForFarm } from "../weather/weather.service.js";
import { buildWeatherContext } from "./weatherContext.js";
import { predictHarvestWindow } from "./predictionEngine.js";
import { logActivity } from "../activity/activity.service.js";

/**
 * Helper to retrieve weather contexts for unique farms efficiently in batch.
 * Guarantees that multiple crops on the same farm share a single weather context fetch.
 *
 * @param {string} userId - Authenticated user ID
 * @param {Array<Object>} farms - List of unique farm objects { id, latitude, longitude }
 * @param {Object} [options] - Options passed to getWeatherForFarm ({ forceRefresh })
 * @returns {Promise<Map<string, Object>>} Map of farmId -> WeatherContext
 */
async function fetchWeatherContextsForFarms(userId, farms, options = {}) {
  const contexts = new Map();
  const uniqueFarmMap = new Map();

  for (const f of farms) {
    if (f && f.id && !uniqueFarmMap.has(f.id)) {
      uniqueFarmMap.set(f.id, f);
    }
  }

  await Promise.all(
    Array.from(uniqueFarmMap.values()).map(async (farm) => {
      const lat = farm.latitude !== null && farm.latitude !== undefined ? Number(farm.latitude) : null;
      const lon = farm.longitude !== null && farm.longitude !== undefined ? Number(farm.longitude) : null;

      if (lat === null || lon === null || Number.isNaN(lat) || Number.isNaN(lon)) {
        contexts.set(farm.id, buildWeatherContext({ farm }));
        return;
      }

      try {
        const rawWeather = await getWeatherForFarm(userId, farm.id, options);
        contexts.set(farm.id, buildWeatherContext(rawWeather));
      } catch (err) {
        // If weather provider fails or times out, gracefully construct fallback context preserving baseline
        contexts.set(
          farm.id,
          buildWeatherContext({
            farm,
            error: err.message,
          })
        );
      }
    })
  );

  return contexts;
}

/**
 * Retrieves harvest window forecasts for all crops accessible to the user.
 * Integrates validated Phase 4 weather contexts where available.
 *
 * @param {string} userId - ID of the authenticated user
 * @param {Object} [filters] - Optional query filters (farmId, cropId, readinessStatus, page, limit)
 * @returns {Promise<{ forecasts: Array, total: number }>}
 */
export async function getForecasts(userId, filters = {}) {
  const where = {
    farm: {
      userId,
    },
  };

  // If farmId is specified, ensure it belongs to the user
  if (filters.farmId) {
    where.farmId = filters.farmId;
  }

  // If cropId is specified, ensure it belongs to user's farm
  if (filters.cropId) {
    where.id = filters.cropId;
  }

  const crops = await prisma.crop.findMany({
    where,
    include: {
      farm: {
        select: {
          id: true,
          name: true,
          state: true,
          district: true,
          latitude: true,
          longitude: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Batch retrieve weather contexts for unique farms
  const farmList = crops.map((c) => c.farm).filter(Boolean);
  const weatherContexts = await fetchWeatherContextsForFarms(userId, farmList, { forceRefresh: false });

  const now = new Date();
  let forecasts = crops.map((crop) =>
    predictHarvestWindow({
      crop: {
        ...crop,
        sowingDate: crop.sowingDate ? crop.sowingDate.toISOString().slice(0, 10) : null,
        expectedHarvestDate: crop.expectedHarvestDate
          ? crop.expectedHarvestDate.toISOString().slice(0, 10)
          : null,
      },
      referenceDate: now,
      weatherContext: crop.farmId ? weatherContexts.get(crop.farmId) : null,
    })
  );

  // Apply readiness status filter if requested
  if (filters.readinessStatus) {
    const targetStatus = filters.readinessStatus.toLowerCase().trim();
    forecasts = forecasts.filter(
      (f) =>
        f.readinessStatus.toLowerCase() === targetStatus ||
        f.readinessLevel.toLowerCase() === targetStatus
    );
  }

  const total = forecasts.length;

  // Pagination support
  if (filters.page && filters.limit) {
    const skip = (filters.page - 1) * filters.limit;
    forecasts = forecasts.slice(skip, skip + filters.limit);
  }

  return { forecasts, total };
}

/**
 * Retrieves a single harvest forecast by crop ID with weather context.
 *
 * @param {string} userId
 * @param {string} cropId
 * @returns {Promise<Object>}
 */
export async function getForecastByCropId(userId, cropId) {
  const crop = await prisma.crop.findFirst({
    where: {
      id: cropId,
      farm: {
        userId,
      },
    },
    include: {
      farm: {
        select: {
          id: true,
          name: true,
          state: true,
          district: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  if (!crop) {
    throw new AppError("Crop not found or you do not have permission to view it.", 404);
  }

  let weatherContext = null;
  if (crop.farm) {
    const contexts = await fetchWeatherContextsForFarms(userId, [crop.farm], { forceRefresh: false });
    weatherContext = contexts.get(crop.farm.id) || null;
  }

  return predictHarvestWindow({
    crop: {
      ...crop,
      sowingDate: crop.sowingDate ? crop.sowingDate.toISOString().slice(0, 10) : null,
      expectedHarvestDate: crop.expectedHarvestDate
        ? crop.expectedHarvestDate.toISOString().slice(0, 10)
        : null,
    },
    referenceDate: new Date(),
    weatherContext,
  });
}

/**
 * Recalculates forecasts across an optional scope (crop, farm, or all accessible crops).
 * Refreshes weather data from provider, re-evaluating baseline and weather adjustments from scratch.
 *
 * @param {string} userId - ID of the authenticated user
 * @param {Object} [scope] - Optional scope parameters { farmId, cropId }
 * @returns {Promise<{ processed: number, updated: number, failed: number, forecasts: Array }>}
 */
export async function refreshForecasts(userId, scope = {}) {
  const where = {
    farm: {
      userId,
    },
  };

  // If a specific farmId is requested, verify ownership
  if (scope.farmId) {
    const farmExists = await prisma.farm.findFirst({
      where: {
        id: scope.farmId,
        userId,
      },
    });

    if (!farmExists) {
      throw new AppError("Farm not found or you do not have permission to access it.", 404);
    }

    where.farmId = scope.farmId;
  }

  // If a specific cropId is requested, verify ownership
  if (scope.cropId) {
    const cropExists = await prisma.crop.findFirst({
      where: {
        id: scope.cropId,
        farm: {
          userId,
        },
      },
    });

    if (!cropExists) {
      throw new AppError("Crop not found or you do not have permission to access it.", 404);
    }

    where.id = scope.cropId;
  }

  // Fetch all crops in the authorized scope
  const crops = await prisma.crop.findMany({
    where,
    include: {
      farm: {
        select: {
          id: true,
          name: true,
          state: true,
          district: true,
          latitude: true,
          longitude: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Force-refresh weather contexts for all unique farms in scope
  const farmList = crops.map((c) => c.farm).filter(Boolean);
  const weatherContexts = await fetchWeatherContextsForFarms(userId, farmList, { forceRefresh: true });

  const now = new Date();
  const refreshed = crops.map((crop) =>
    predictHarvestWindow({
      crop: {
        ...crop,
        sowingDate: crop.sowingDate ? crop.sowingDate.toISOString().slice(0, 10) : null,
        expectedHarvestDate: crop.expectedHarvestDate
          ? crop.expectedHarvestDate.toISOString().slice(0, 10)
          : null,
      },
      referenceDate: now,
      weatherContext: crop.farmId ? weatherContexts.get(crop.farmId) : null,
    })
  );

  if (refreshed.length > 0) {
    await logActivity({
      userId,
      type: "forecast-refreshed",
      title: "Harvest forecasts refreshed",
      message: `Refreshed harvest predictions for ${refreshed.length} crop${refreshed.length === 1 ? "" : "s"}`,
      entityType: "forecast",
      farmId: scope.farmId || undefined,
      cropId: scope.cropId || undefined,
    }).catch(() => null);
  }

  return {
    processed: refreshed.length,
    updated: refreshed.length,
    failed: 0,
    forecasts: refreshed,
  };
}
