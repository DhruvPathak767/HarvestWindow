import { z } from "zod";

export const listActivityQuerySchema = z.object({
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
  type: z.string().trim().optional(),
  farmId: z.string().trim().optional(),
  cropId: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

export const activityIdParamSchema = z.object({
  id: z.string().trim().min(1, "Activity ID is required"),
});
