import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  createNotificationSchema,
} from "./notifications.validation.js";
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
  syncAlertsForUser,
} from "./notifications.service.js";

/**
 * GET /api/v1/notifications
 * GET /api/notifications
 *
 * Retrieves the authenticated user's notifications.
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
 *
 * Retrieves the count of unread notifications for the authenticated user.
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
 *
 * Marks a specific notification as read.
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
 *
 * Marks all notifications for the authenticated user as read.
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
 * POST /api/v1/notifications/sync-alerts
 * POST /api/notifications/sync-alerts
 *
 * Scans active weather cautions and harvest window predictions to generate persistent alerts.
 */
export async function handleSyncAlerts(req, res, next) {
  try {
    const result = await syncAlertsForUser(req.user.id, req.body?.preferences || {});

    return res.status(200).json({
      success: true,
      message: "Alerts synchronized successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/notifications
 * POST /api/notifications
 *
 * Manually posts a notification for the current user.
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
