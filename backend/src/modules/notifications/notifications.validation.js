import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  page: z
    .coerce
    .number()
    .int()
    .min(1, "Page must be at least 1")
    .optional()
    .default(1),
  limit: z
    .coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(20),
  isRead: z
    .preprocess((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return undefined;
    }, z.boolean().optional())
    .optional(),
  type: z.string().trim().optional(),
  farmId: z.string().trim().optional(),
  cropId: z.string().trim().optional(),
});

export const notificationIdParamSchema = z.object({
  id: z.string().trim().min(1, "Notification ID is required"),
});

export const createNotificationSchema = z.object({
  type: z.string().trim().min(1, "Notification type is required"),
  title: z.string().trim().min(1, "Title is required"),
  message: z.string().trim().min(1, "Message is required"),
  farmId: z.string().trim().optional().nullable(),
  cropId: z.string().trim().optional().nullable(),
  link: z.string().trim().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});
