import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  createNotificationSchema,
} from "./notifications.validation.js";
import {
  handleListNotifications,
  handleGetUnreadCount,
  handleMarkNotificationRead,
  handleMarkAllNotificationsRead,
  handleSyncAlerts,
  handleCreateNotification,
} from "./notifications.controller.js";

const router = Router();

// All notification operations require authentication
router.use(authenticate);

// 1. Get unread notification count (registered before /:id)
router.get("/unread-count", handleGetUnreadCount);

// 2. Mark all notifications as read (registered before /:id)
router.patch("/read-all", handleMarkAllNotificationsRead);

// 3. Synchronize live weather & forecast alerts
router.post("/sync-alerts", handleSyncAlerts);

// 4. List notifications with server-side filtering & pagination
router.get(
  "/",
  validate(listNotificationsQuerySchema, "query"),
  handleListNotifications
);

// 5. Create a notification
router.post(
  "/",
  validate(createNotificationSchema, "body"),
  handleCreateNotification
);

// 6. Mark a single notification as read
router.patch(
  "/:id/read",
  validate(notificationIdParamSchema, "params"),
  handleMarkNotificationRead
);

export default router;
