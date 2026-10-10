import prisma from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { getWeatherForFarm } from "../weather/weather.service.js";
import { evaluateCropRules } from "./recommendations.rules.js";

/**
 * Normalizes recommendation item for API responses and frontend compatibility.
 *
 * @param {Object} item - Prisma recommendation object
 * @returns {Object}
 */
export function formatRecommendation(item) {
  return {
    id: item.id,
    cropId: item.cropId || "",
    farmId: item.farmId || "",
    title: item.title,
    reason: item.reason,
    priority: item.priority,
    suggestedAction: item.suggestedAction,
    status: item.status,
    category: item.category,
    relevantDate: item.relevantDate ? item.relevantDate.toISOString() : undefined,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt ? item.updatedAt.toISOString() : undefined,
    completedAt: item.completedAt ? item.completedAt.toISOString() : undefined,
    dismissedAt: item.dismissedAt ? item.dismissedAt.toISOString() : undefined,
    farm: item.farm
      ? {
          id: item.farm.id,
          name: item.farm.name,
          state: item.farm.state,
          district: item.farm.district,
        }
      : undefined,
    crop: item.crop
      ? {
          id: item.crop.id,
          name: item.crop.cropName,
          cropName: item.crop.cropName,
          variety: item.crop.variety,
          growthStage: item.crop.growthStage,
        }
      : undefined,
  };
}

/**
 * Priority sort ordering index
 */
const PRIORITY_ORDER = {
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Re-evaluates agricultural rules on real user farms, crops, and live weather,
 * reconciling them with existing recommendations to avoid unwanted duplicates.
 *
 * @param {string} userId - Authenticated user ID
 * @param {Object} [options]
 * @param {string} [options.farmId] - Optional specific farm to refresh
 * @param {Date} [options.referenceDate] - Optional reference date for rule calculations
 * @returns {Promise<{ created: number, updated: number, retained: number, skipped: number, total: number }>}
 */
export async function refreshRecommendations(userId, options = {}) {
  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }

  // Find user's farms and crops
  const farmWhere = { userId };
  if (options.farmId) {
    farmWhere.id = options.farmId;
  }

  const farms = await prisma.farm.findMany({
    where: farmWhere,
    include: {
      crops: true,
    },
  });

  if (options.farmId && farms.length === 0) {
    throw new AppError("Farm not found or you do not have permission to access it.", 404);
  }

  const allCandidates = [];

  for (const farm of farms) {
    // Attempt to retrieve weather forecast for farm
    let weather = null;
    try {
      if (farm.latitude !== null && farm.longitude !== null) {
        weather = await getWeatherForFarm(userId, farm.id);
      }
    } catch {
      // Graceful fallback: Rule G ensures missing weather data does not crash recommendations
      weather = null;
    }

    // Evaluate rules for each crop
    for (const crop of farm.crops) {
      const candidates = evaluateCropRules({
        farm,
        crop,
        weather,
        referenceDate: options.referenceDate || new Date(),
      });
      allCandidates.push(...candidates);
    }
  }

  // Retrieve existing recommendations for user
  const existingRecommendations = await prisma.recommendation.findMany({
    where: {
      userId,
      ...(options.farmId ? { farmId: options.farmId } : {}),
    },
  });

  const existingMap = new Map();
  for (const rec of existingRecommendations) {
    existingMap.set(rec.ruleKey, rec);
  }

  let created = 0;
  let updated = 0;
  let retained = 0;
  let skipped = 0;

  for (const candidate of allCandidates) {
    const existing = existingMap.get(candidate.ruleKey);

    if (existing) {
      // Preserve completed and dismissed records without altering status
      if (existing.status === "completed" || existing.status === "dismissed") {
        retained++;
        continue;
      }

      // Check if update is needed for open recommendation
      const needsUpdate =
        existing.title !== candidate.title ||
        existing.reason !== candidate.reason ||
        existing.suggestedAction !== candidate.suggestedAction ||
        existing.priority !== candidate.priority ||
        existing.category !== candidate.category;

      if (needsUpdate) {
        await prisma.recommendation.update({
          where: { id: existing.id },
          data: {
            title: candidate.title,
            reason: candidate.reason,
            suggestedAction: candidate.suggestedAction,
            priority: candidate.priority,
            category: candidate.category,
            relevantDate: candidate.relevantDate,
            sourceContext: candidate.sourceContext,
          },
        });
        updated++;
      } else {
        retained++;
      }
    } else {
      // Create new open recommendation
      await prisma.recommendation.create({
        data: {
          userId,
          farmId: candidate.farmId,
          cropId: candidate.cropId,
          ruleKey: candidate.ruleKey,
          title: candidate.title,
          reason: candidate.reason,
          suggestedAction: candidate.suggestedAction,
          category: candidate.category,
          priority: candidate.priority,
          status: "open",
          relevantDate: candidate.relevantDate,
          sourceContext: candidate.sourceContext,
        },
      });
      created++;
    }
  }

  return {
    created,
    updated,
    retained,
    skipped,
    total: allCandidates.length,
  };
}

/**
 * Lists recommendations for the authenticated user with server-side filtering,
 * pagination, and multi-tenant scoping.
 *
 * @param {string} userId - Authenticated user ID
 * @param {Object} query - Filter & pagination options
 */
export async function listRecommendations(userId, query = {}) {
  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }

  const {
    status,
    priority,
    category,
    farmId,
    cropId,
    page = 1,
    limit = 20,
    includeCompleted,
  } = query;

  const where = {
    userId,
  };

  if (status && status !== "all") {
    where.status = status.toLowerCase();
  } else if (includeCompleted === false) {
    where.status = "open";
  }

  if (priority && priority !== "all") {
    where.priority = priority.toLowerCase();
  }

  if (category && category !== "all") {
    where.category = category.toLowerCase();
  }

  if (farmId) {
    where.farmId = farmId;
  }

  if (cropId) {
    where.cropId = cropId;
  }

  const skip = (page - 1) * limit;

  // Retrieve matching count & items
  const [total, items] = await Promise.all([
    prisma.recommendation.count({ where }),
    prisma.recommendation.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { createdAt: "desc" },
      ],
      include: {
        farm: {
          select: {
            id: true,
            name: true,
            state: true,
            district: true,
          },
        },
        crop: {
          select: {
            id: true,
            cropName: true,
            variety: true,
            growthStage: true,
          },
        },
      },
    }),
  ]);

  // Sort items deterministically by priority rank if not explicitly sorted otherwise
  const sortedItems = [...items].sort((a, b) => {
    const rankA = PRIORITY_ORDER[a.priority] || 99;
    const rankB = PRIORITY_ORDER[b.priority] || 99;
    if (rankA !== rankB) return rankA - rankB;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const formattedItems = sortedItems.map(formatRecommendation);

  return {
    items: formattedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1),
    },
  };
}

/**
 * Retrieves a single recommendation by ID, ensuring user ownership.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} id - Recommendation ID
 */
export async function getRecommendationById(userId, id) {
  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }
  if (!id) {
    throw new AppError("Recommendation ID is required.", 400);
  }

  const recommendation = await prisma.recommendation.findFirst({
    where: {
      id,
      userId,
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
      crop: {
        select: {
          id: true,
          cropName: true,
          variety: true,
          growthStage: true,
        },
      },
    },
  });

  if (!recommendation) {
    throw new AppError("Recommendation not found or you do not have permission to access it.", 404);
  }

  return formatRecommendation(recommendation);
}

/**
 * Updates a recommendation's status ("open" | "completed" | "dismissed")
 * with ownership verification and timestamp handling.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} id - Recommendation ID
 * @param {string} status - Target status
 */
export async function updateRecommendationStatus(userId, id, status) {
  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }
  if (!id) {
    throw new AppError("Recommendation ID is required.", 400);
  }

  const normalizedStatus = status.toLowerCase().trim();
  if (!["open", "completed", "dismissed"].includes(normalizedStatus)) {
    throw new AppError("Status must be one of: open, completed, dismissed", 400);
  }

  const existing = await prisma.recommendation.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!existing) {
    throw new AppError("Recommendation not found or you do not have permission to access it.", 404);
  }

  // If status is identical, return early without recording redundant update
  if (existing.status === normalizedStatus) {
    return formatRecommendation(existing);
  }

  const updateData = {
    status: normalizedStatus,
  };

  if (normalizedStatus === "completed") {
    updateData.completedAt = new Date();
    updateData.dismissedAt = null;
  } else if (normalizedStatus === "dismissed") {
    updateData.dismissedAt = new Date();
    updateData.completedAt = null;
  } else {
    // Reopened
    updateData.completedAt = null;
    updateData.dismissedAt = null;
  }

  const updated = await prisma.recommendation.update({
    where: { id },
    data: updateData,
    include: {
      farm: {
        select: {
          id: true,
          name: true,
          state: true,
          district: true,
        },
      },
      crop: {
        select: {
          id: true,
          cropName: true,
          variety: true,
          growthStage: true,
        },
      },
    },
  });

  return formatRecommendation(updated);
}
