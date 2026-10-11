import prisma from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { NOTIFICATION_TYPES } from "./notifications.constants.js";
import { getWeatherForFarm } from "../weather/weather.service.js";
import { getForecasts } from "../forecasts/forecasts.service.js";
import { AlertEngineService } from "./alertEngine.service.js";
import { ALERT_LIFECYCLES, ALERT_SEVERITIES } from "./alertRules.config.js";

/**
 * Normalizes notification database record for frontend presentation.
 * Compatible with AppNotification as well as standard persistent notification models.
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
    severity: item.severity || ALERT_SEVERITIES.INFO,
    recommendedAction: item.recommendedAction || undefined,
    actionUrl: item.actionUrl || item.link || undefined,
    status: item.status || ALERT_LIFECYCLES.ACTIVE,
    dedupKey: item.dedupKey || undefined,
    at: item.createdAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt ? item.updatedAt.toISOString() : item.createdAt.toISOString(),
    kind: item.type,
    type: item.type,
    isRead: Boolean(item.isRead),
    readAt: item.readAt ? item.readAt.toISOString() : null,
    dismissedAt: item.dismissedAt ? item.dismissedAt.toISOString() : null,
    expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
    link: item.link || item.actionUrl || undefined,
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
 */
export async function createNotification({
  userId,
  type = NOTIFICATION_TYPES.ACTIVITY,
  severity = ALERT_SEVERITIES.INFO,
  title,
  message,
  recommendedAction = null,
  actionUrl = null,
  farmId = null,
  cropId = null,
  link = null,
  dedupKey = null,
  expiresAt = null,
  status = ALERT_LIFECYCLES.ACTIVE,
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
        OR: [
          { dedupKey: effectiveDedupKey },
          { metadata: { contains: `"dedupKey":"${effectiveDedupKey}"` } },
        ],
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
      severity,
      title: title.trim(),
      message: message.trim(),
      recommendedAction: recommendedAction ? recommendedAction.trim() : null,
      actionUrl: actionUrl || link || null,
      link: link || actionUrl || null,
      dedupKey: effectiveDedupKey,
      status,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      farmId,
      cropId,
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
 */
export async function listNotifications(userId, query = {}) {
  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }

  const {
    page = 1,
    limit = 20,
    isRead,
    status,
    severity,
    type,
    farmId,
    cropId,
  } = query;

  const where = { userId };

  if (typeof isRead === "boolean") {
    where.isRead = isRead;
  }

  if (status) {
    where.status = status;
  } else {
    // By default, do not return dismissed notifications
    where.status = { not: ALERT_LIFECYCLES.DISMISSED || "DISMISSED" };
  }

  if (severity) {
    where.severity = severity;
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
    prisma.notification.count({
      where: {
        userId,
        isRead: false,
        status: { not: "DISMISSED" },
      },
    }),
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
 */
export async function getUnreadCount(userId) {
  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }

  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
      status: { not: "DISMISSED" },
    },
  });

  return { unreadCount };
}

/**
 * Marks a single notification as read, ensuring strict ownership.
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
 * Dismisses a single notification (soft dismiss).
 */
export async function dismissNotification(userId, id) {
  if (!userId) throw new AppError("Authentication required.", 401);
  if (!id) throw new AppError("Notification ID is required.", 400);

  const existing = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new AppError("Notification not found or access denied.", 404);
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: {
      status: "DISMISSED",
      dismissedAt: new Date(),
    },
    include: {
      farm: { select: { id: true, name: true } },
      crop: { select: { id: true, cropName: true } },
    },
  });

  return formatNotification(updated);
}

/**
 * Retrieves notification preferences for the user.
 */
export async function getNotificationPreferences(userId) {
  if (!userId) throw new AppError("Authentication required.", 401);

  let settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: {
        userId,
        harvestWindowAlerts: true,
        weatherCautions: true,
        predictionChangeAlerts: true,
        cropHealthAlerts: true,
        yieldAlerts: true,
        weeklySummary: false,
        minSeverity: "info",
      },
    });
  }

  return {
    harvestWindowAlerts: settings.harvestWindowAlerts,
    weatherCautions: settings.weatherCautions,
    predictionChangeAlerts: settings.predictionChangeAlerts,
    cropHealthAlerts: settings.cropHealthAlerts,
    yieldAlerts: settings.yieldAlerts,
    weeklySummary: settings.weeklySummary,
    quietHoursStart: settings.quietHoursStart,
    quietHoursEnd: settings.quietHoursEnd,
    minSeverity: settings.minSeverity || "info",
  };
}

/**
 * Updates notification preferences for the user.
 */
export async function updateNotificationPreferences(userId, updateData) {
  if (!userId) throw new AppError("Authentication required.", 401);

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {
      ...updateData,
    },
    create: {
      userId,
      ...updateData,
    },
  });

  return {
    harvestWindowAlerts: settings.harvestWindowAlerts,
    weatherCautions: settings.weatherCautions,
    predictionChangeAlerts: settings.predictionChangeAlerts,
    cropHealthAlerts: settings.cropHealthAlerts,
    yieldAlerts: settings.yieldAlerts,
    weeklySummary: settings.weeklySummary,
    quietHoursStart: settings.quietHoursStart,
    quietHoursEnd: settings.quietHoursEnd,
    minSeverity: settings.minSeverity || "info",
  };
}

/**
 * Synchronizes and evaluates alerts for user across both legacy weather/forecast
 * and the Phase AI-8 Alert Engine.
 */
export async function syncAlertsForUser(userId, preferences = {}) {
  if (!userId) return { generated: 0 };

  try {
    const ai8Result = await AlertEngineService.evaluateUserAlerts(userId);
    return { generated: ai8Result.createdAlerts, evaluated: ai8Result };
  } catch (err) {
    console.error("[NotificationService] syncAlertsForUser error:", err.message);
    return { generated: 0 };
  }
}
