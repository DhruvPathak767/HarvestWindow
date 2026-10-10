import prisma from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { predictHarvestWindow } from "./predictionEngine.js";

/**
 * Retrieves harvest window forecasts for all crops accessible to the user.
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
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

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
 * Retrieves a single harvest forecast by crop ID.
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
        },
      },
    },
  });

  if (!crop) {
    throw new AppError("Crop not found or you do not have permission to view it.", 404);
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
  });
}

/**
 * Recalculates forecasts across an optional scope (crop, farm, or all accessible crops).
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
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

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
    })
  );

  return {
    processed: refreshed.length,
    updated: refreshed.length,
    failed: 0,
    forecasts: refreshed,
  };
}
