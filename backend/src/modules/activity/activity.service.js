import prisma from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { normalizeActivityType } from "./activity.constants.js";

/**
 * Normalizes activity record for frontend presentation.
 *
 * @param {Object} item - Prisma activity record
 * @returns {Object}
 */
export function formatActivity(item) {
  let parsedMetadata = null;
  if (item.metadata) {
    try {
      parsedMetadata = typeof item.metadata === "string" ? JSON.parse(item.metadata) : item.metadata;
    } catch {
      parsedMetadata = null;
    }
  }

  return {
    id: item.id,
    type: normalizeActivityType(item.type),
    title: item.title,
    message: item.message,
    at: item.createdAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    farmId: item.farmId || undefined,
    cropId: item.cropId || undefined,
    entityType: item.entityType || undefined,
    entityId: item.entityId || undefined,
    metadata: parsedMetadata || undefined,
    farm: item.farm
      ? {
          id: item.farm.id,
          name: item.farm.name,
        }
      : undefined,
    crop: item.crop
      ? {
          id: item.crop.id,
          name: item.crop.cropName,
        }
      : undefined,
  };
}

/**
 * Centralized activity logging service function.
 * Called across farm, crop, weather, forecast, and recommendation modules.
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated user ID
 * @param {string} params.type - Event type (e.g. "crop-added", "FARM_CREATED")
 * @param {string} [params.title] - Human-readable title
 * @param {string} params.message - Descriptive event message
 * @param {string} [params.entityType] - Entity kind ("farm" | "crop" | "forecast" | "recommendation")
 * @param {string} [params.entityId] - Target entity identifier
 * @param {string} [params.farmId] - Optional associated farm ID
 * @param {string} [params.cropId] - Optional associated crop ID
 * @param {Object} [params.metadata] - Optional metadata payload (sanitized)
 * @returns {Promise<Object>} Formatted activity record
 */
export async function logActivity({
  userId,
  type,
  title,
  message,
  entityType = null,
  entityId = null,
  farmId = null,
  cropId = null,
  metadata = null,
}) {
  if (!userId || typeof userId !== "string") {
    console.warn("[ActivityService] Attempted to log activity without valid userId");
    return null;
  }

  const normalizedType = normalizeActivityType(type);
  const eventTitle = title || message || "Activity recorded";
  const eventMessage = message || eventTitle;

  // Sanitize metadata to never persist sensitive tokens or credentials
  let metadataString = null;
  if (metadata && typeof metadata === "object") {
    const sanitized = { ...metadata };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.authorization;
    metadataString = JSON.stringify(sanitized);
  }

  try {
    const activity = await prisma.activity.create({
      data: {
        userId,
        type: normalizedType,
        title: eventTitle,
        message: eventMessage,
        entityType,
        entityId,
        farmId,
        cropId,
        metadata: metadataString,
      },
      include: {
        farm: {
          select: { id: true, name: true },
        },
        crop: {
          select: { id: true, cropName: true },
        },
      },
    });

    return formatActivity(activity);
  } catch (err) {
    // Non-blocking resilience: activity logging failure must not abort core agricultural workflow
    console.error("[ActivityService] Failed to record activity:", err.message);
    return null;
  }
}

/**
 * Retrieves the activity feed for the authenticated user with server-side filtering & pagination.
 *
 * @param {string} userId - Authenticated user ID
 * @param {Object} [query] - Filtering and pagination options
 */
export async function listActivities(userId, query = {}) {
  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }

  const {
    page = 1,
    limit = 20,
    type,
    farmId,
    cropId,
    startDate,
    endDate,
  } = query;

  const where = {
    userId,
  };

  if (type) {
    const norm = normalizeActivityType(type);
    where.type = {
      in: [type, norm],
    };
  }

  if (farmId) {
    where.farmId = farmId;
  }

  if (cropId) {
    where.cropId = cropId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) where.createdAt.gte = d;
    }
    if (endDate) {
      const d = new Date(endDate);
      if (!isNaN(d.getTime())) where.createdAt.lte = d;
    }
  }

  const skip = (page - 1) * limit;

  const [total, records] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        farm: {
          select: { id: true, name: true },
        },
        crop: {
          select: { id: true, cropName: true },
        },
      },
    }),
  ]);

  return {
    items: records.map(formatActivity),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1),
    },
  };
}

/**
 * Retrieves a single activity record ensuring authenticated user ownership.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} id - Activity ID
 */
export async function getActivityById(userId, id) {
  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }
  if (!id) {
    throw new AppError("Activity ID is required.", 400);
  }

  const activity = await prisma.activity.findFirst({
    where: {
      id,
      userId,
    },
    include: {
      farm: {
        select: { id: true, name: true },
      },
      crop: {
        select: { id: true, cropName: true },
      },
    },
  });

  if (!activity) {
    throw new AppError("Activity not found or you do not have permission to access it.", 404);
  }

  return formatActivity(activity);
}
