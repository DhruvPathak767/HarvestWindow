import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  createNotificationSchema,
  updatePreferencesSchema,
} from "./notifications.validation.js";
import {
  handleListNotifications,
  handleGetUnreadCount,
  handleMarkNotificationRead,
  handleMarkAllNotificationsRead,
  handleDismissNotification,
  handleSyncAlerts,
  handleCreateNotification,
  handleGetPreferences,
  handleUpdatePreferences,
} from "./notifications.controller.js";

const router = Router();

// All notification operations require authentication
router.use(authenticate);

// 1. Get unread notification count
router.get("/unread-count", handleGetUnreadCount);

// 2. Mark all notifications as read
router.patch("/read-all", handleMarkAllNotificationsRead);

// 3. User notification preferences
router.get("/preferences", handleGetPreferences);
router.put(
  "/preferences",
  validate(updatePreferencesSchema, "body"),
  handleUpdatePreferences
);

// 4. Synchronize live weather, forecast & AI-8 alerts
router.post("/evaluate", handleSyncAlerts);
router.post("/sync-alerts", handleSyncAlerts);

// 5. List notifications with server-side filtering & pagination
router.get(
  "/",
  validate(listNotificationsQuerySchema, "query"),
  handleListNotifications
);

// 6. Create a notification manually
router.post(
  "/",
  validate(createNotificationSchema, "body"),
  handleCreateNotification
);

// 7. Mark a single notification as read
router.patch(
  "/:id/read",
  validate(notificationIdParamSchema, "params"),
  handleMarkNotificationRead
);

// 8. Dismiss a single notification
router.patch(
  "/:id/dismiss",
  validate(notificationIdParamSchema, "params"),
  handleDismissNotification
);

export default router;
