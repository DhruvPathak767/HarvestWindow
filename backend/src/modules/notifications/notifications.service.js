import prisma from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { NOTIFICATION_TYPES } from "./notifications.constants.js";
import { getWeatherForFarm } from "../weather/weather.service.js";
import { getForecasts } from "../forecasts/forecasts.service.js";

/**
 * Normalizes notification database record for frontend presentation.
 * Compatible with AppNotification { id, title, body, at, kind, farmId, cropId }
 * as well as standard persistent notification models.
 *
 * @param {Object} item - Prisma notification record
 * @returns {Object}
 */
export function formatNotification(item) {
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
    title: item.title,
    body: item.message,
    message: item.message,
    at: item.createdAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    kind: item.type,
    type: item.type,
    isRead: Boolean(item.isRead),
    readAt: item.readAt ? item.readAt.toISOString() : null,
    link: item.link || undefined,
    farmId: item.farmId || undefined,
    cropId: item.cropId || undefined,
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
 * Creates a persistent notification for a user with optional deduplication.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.type - "weather" | "forecast" | "activity" | "recommendation"
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.farmId]
 * @param {string} [params.cropId]
 * @param {string} [params.link]
 * @param {string} [params.dedupKey] - Optional unique key to prevent duplicate alerts
 * @param {Object} [params.metadata]
 * @returns {Promise<Object>}
 */
export async function createNotification({
  userId,
  type = NOTIFICATION_TYPES.ACTIVITY,
  title,
  message,
  farmId = null,
  cropId = null,
  link = null,
  dedupKey = null,
  metadata = null,
}) {
  if (!userId || typeof userId !== "string") {
    throw new AppError("Valid user ID required to create notification.", 400);
  }
  if (!title || !message) {
    throw new AppError("Title and message are required for notifications.", 400);
  }

  const effectiveDedupKey = dedupKey || metadata?.dedupKey || null;

  // Deduplication check: avoid creating duplicate alerts
  if (effectiveDedupKey) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        metadata: {
          contains: `"dedupKey":"${effectiveDedupKey}"`,
        },
      },
      include: {
        farm: { select: { id: true, name: true } },
        crop: { select: { id: true, cropName: true } },
      },
    });

    if (existing) {
      return formatNotification(existing);
    }
  }

  // Sanitize metadata payload
  let metadataString = null;
  const metaObj = { ...(metadata || {}) };
  if (effectiveDedupKey) {
    metaObj.dedupKey = effectiveDedupKey;
  }
  if (Object.keys(metaObj).length > 0) {
    delete metaObj.password;
    delete metaObj.token;
    delete metaObj.secret;
    metadataString = JSON.stringify(metaObj);
  }

  const record = await prisma.notification.create({
    data: {
      userId,
      type,
      title: title.trim(),
      message: message.trim(),
      farmId,
      cropId,
      link,
      metadata: metadataString,
    },
    include: {
      farm: { select: { id: true, name: true } },
      crop: { select: { id: true, cropName: true } },
    },
  });

  return formatNotification(record);
}

/**
 * Retrieves the user's notifications with server-side filtering and pagination.
 *
 * @param {string} userId - Authenticated user ID
 * @param {Object} [query] - Filter and pagination options
 */
export async function listNotifications(userId, query = {}) {
  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }

  const {
    page = 1,
    limit = 20,
    isRead,
    type,
    farmId,
    cropId,
  } = query;

  const where = { userId };

  if (typeof isRead === "boolean") {
    where.isRead = isRead;
  }

  if (type) {
    where.type = type;
  }

  if (farmId) {
    where.farmId = farmId;
  }

  if (cropId) {
    where.cropId = cropId;
  }

  const skip = (page - 1) * limit;

  const [total, unreadCount, records] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        farm: { select: { id: true, name: true } },
        crop: { select: { id: true, cropName: true } },
      },
    }),
  ]);

  return {
    items: records.map(formatNotification),
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1),
    },
  };
}

/**
 * Gets the total number of unread notifications for a user.
 *
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<{ unreadCount: number }>}
 */
export async function getUnreadCount(userId) {
  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }

  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return { unreadCount };
}

/**
 * Marks a single notification as read, ensuring strict ownership by the authenticated user.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} id - Notification ID
 */
export async function markNotificationRead(userId, id) {
  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }
  if (!id) {
    throw new AppError("Notification ID is required.", 400);
  }

  const existing = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new AppError("Notification not found or access denied.", 404);
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
    include: {
      farm: { select: { id: true, name: true } },
      crop: { select: { id: true, cropName: true } },
    },
  });

  return formatNotification(updated);
}

/**
 * Marks all unread notifications for a user as read.
 *
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<{ updatedCount: number }>}
 */
export async function markAllNotificationsRead(userId) {
  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }

  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    updatedCount: result.count,
  };
}

/**
 * Synchronizes real weather and harvest alerts from live application data.
 * Adheres strictly to team safety rules:
 * - Real data only: evaluates Phase 4 weather cautions and Phase 5 harvest forecasts.
 * - Deduplicated by deterministic key per day/event.
 * - Never throws or breaks on missing weather coordinates or forecast errors.
 *
 * @param {string} userId - Authenticated user ID
 * @param {Object} [preferences] - User notification preferences
 * @returns {Promise<{ generated: number }>}
 */
export async function syncAlertsForUser(userId, preferences = {}) {
  if (!userId) return { generated: 0 };

  const weatherAlertsEnabled = preferences.weatherAlerts !== false;
  const harvestAlertsEnabled = preferences.harvestAlerts !== false;
  const todayStr = new Date().toISOString().slice(0, 10);
  let generated = 0;

  try {
    // 1. Process Weather Cautions if enabled
    if (weatherAlertsEnabled) {
      const farms = await prisma.farm.findMany({
        where: { userId },
        select: { id: true, name: true, latitude: true, longitude: true },
      });

      for (const farm of farms) {
        if (!farm.latitude || !farm.longitude) continue;

        try {
          const weather = await getWeatherForFarm(userId, farm.id);
          const warnings = weather?.warnings || weather?.cautions || [];

          for (const warn of warnings) {
            const warnId = warn.id || warn.type || "weather-risk";
            const dedupKey = `weather-${farm.id}-${warnId}-${todayStr}`;

            const notification = await createNotification({
              userId,
              type: NOTIFICATION_TYPES.WEATHER,
              title: warn.title || "Weather Alert",
              message: `${farm.name}: ${warn.description || warn.message || warn.detail || "Cautionary weather conditions detected."}`,
              farmId: farm.id,
              link: `/app/weather?farmId=${farm.id}`,
              dedupKey,
              metadata: {
                level: warn.level || warn.severity || "medium",
                dedupKey,
              },
            });

            if (notification) generated += 1;
          }
        } catch {
          // Gracefully continue to next farm if weather service fails
        }
      }
    }

    // 2. Process Harvest Forecast Alerts if enabled
    if (harvestAlertsEnabled) {
      try {
        const fcResult = await getForecasts(userId, { limit: 50 });
        const forecasts = fcResult?.forecasts || [];

        for (const fc of forecasts) {
          const isReady = fc.readinessStatus === "ready" || fc.readinessStatus === "approaching";
          if (isReady && fc.crop) {
            const dedupKey = `forecast-${fc.cropId}-${fc.readinessStatus}-${todayStr}`;
            const title = fc.readinessStatus === "ready"
              ? `Harvest Window Ready: ${fc.crop.cropName || "Crop"}`
              : `Harvest Window Approaching: ${fc.crop.cropName || "Crop"}`;

            const notification = await createNotification({
              userId,
              type: NOTIFICATION_TYPES.FORECAST,
              title,
              message: fc.summary || `Optimal harvest window estimated: ${fc.estimatedHarvestDate || "Review timeline"}`,
              farmId: fc.farmId || undefined,
              cropId: fc.cropId,
              link: `/app/crops/${fc.cropId}`,
              dedupKey,
              metadata: {
                readinessStatus: fc.readinessStatus,
                confidenceScore: fc.confidenceScore,
                dedupKey,
              },
            });

            if (notification) generated += 1;
          }
        }
      } catch {
        // Gracefully continue if forecast engine is not yet populated
      }
    }
  } catch (err) {
    console.error("[NotificationService] syncAlertsForUser encountered error:", err.message);
  }

  return { generated };
}
