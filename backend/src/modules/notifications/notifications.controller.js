import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  createNotificationSchema,
  updatePreferencesSchema,
} from "./notifications.validation.js";
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  createNotification,
  syncAlertsForUser,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "./notifications.service.js";
import { AlertEngineService } from "./alertEngine.service.js";

/**
 * GET /api/v1/notifications
 * GET /api/notifications
 */
export async function handleListNotifications(req, res, next) {
  try {
    const validatedQuery = listNotificationsQuerySchema.parse(req.query);
    const result = await listNotifications(req.user.id, validatedQuery);

    return res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      data: result.items,
      unreadCount: result.unreadCount,
      pagination: result.pagination,
      items: result.items,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/notifications/unread-count
 * GET /api/notifications/unread-count
 */
export async function handleGetUnreadCount(req, res, next) {
  try {
    const result = await getUnreadCount(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Unread notification count retrieved",
      data: result,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 * PATCH /api/notifications/:id/read
 */
export async function handleMarkNotificationRead(req, res, next) {
  try {
    const { id } = notificationIdParamSchema.parse(req.params);
    const updated = await markNotificationRead(req.user.id, id);

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/notifications/read-all
 * PATCH /api/notifications/read-all
 */
export async function handleMarkAllNotificationsRead(req, res, next) {
  try {
    const result = await markAllNotificationsRead(req.user.id);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/notifications/:id/dismiss
 * PATCH /api/notifications/:id/dismiss
 */
export async function handleDismissNotification(req, res, next) {
  try {
    const { id } = notificationIdParamSchema.parse(req.params);
    const updated = await dismissNotification(req.user.id, id);

    return res.status(200).json({
      success: true,
      message: "Notification dismissed successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/notifications/preferences
 * GET /api/notifications/preferences
 */
export async function handleGetPreferences(req, res, next) {
  try {
    const prefs = await getNotificationPreferences(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Notification preferences retrieved successfully",
      data: prefs,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/notifications/preferences
 * PUT /api/notifications/preferences
 */
export async function handleUpdatePreferences(req, res, next) {
  try {
    const validated = updatePreferencesSchema.parse(req.body);
    const updated = await updateNotificationPreferences(req.user.id, validated);

    return res.status(200).json({
      success: true,
      message: "Notification preferences updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/notifications/evaluate
 * POST /api/notifications/evaluate
 * POST /api/v1/notifications/sync-alerts
 * POST /api/notifications/sync-alerts
 */
export async function handleSyncAlerts(req, res, next) {
  try {
    const result = await AlertEngineService.evaluateUserAlerts(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Alerts evaluated successfully",
      data: {
        ...result,
        generated: result.createdAlerts ?? 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/notifications
 * POST /api/notifications
 */
export async function handleCreateNotification(req, res, next) {
  try {
    const validated = createNotificationSchema.parse(req.body);
    const created = await createNotification({
      ...validated,
      userId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: created,
    });
  } catch (error) {
    next(error);
  }
}
