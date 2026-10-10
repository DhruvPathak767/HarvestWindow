import { z } from "zod";

export const VALID_RECOMMENDATION_STATUSES = ["open", "completed", "dismissed"];
export const VALID_RECOMMENDATION_PRIORITIES = ["high", "medium", "low"];
export const VALID_RECOMMENDATION_CATEGORIES = [
  "weather",
  "timing",
  "logistics",
  "monitoring",
];

export const recommendationIdParamSchema = z.object({
  id: z.string().trim().min(1, "Recommendation ID is required"),
});

export const updateRecommendationStatusSchema = z.object({
  status: z
    .string()
    .trim()
    .toLowerCase()
    .refine((val) => VALID_RECOMMENDATION_STATUSES.includes(val), {
      message: `Status must be one of: ${VALID_RECOMMENDATION_STATUSES.join(", ")}`,
    }),
});

export const listRecommendationsQuerySchema = z.object({
  status: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .refine(
      (val) => !val || val === "all" || VALID_RECOMMENDATION_STATUSES.includes(val),
      {
        message: `Status must be one of: ${VALID_RECOMMENDATION_STATUSES.join(", ")}, or 'all'`,
      }
    ),
  priority: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .refine(
      (val) => !val || val === "all" || VALID_RECOMMENDATION_PRIORITIES.includes(val),
      {
        message: `Priority must be one of: ${VALID_RECOMMENDATION_PRIORITIES.join(", ")}, or 'all'`,
      }
    ),
  category: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .refine(
      (val) => !val || val === "all" || VALID_RECOMMENDATION_CATEGORIES.includes(val),
      {
        message: `Category must be one of: ${VALID_RECOMMENDATION_CATEGORIES.join(", ")}, or 'all'`,
      }
    ),
  farmId: z.string().trim().optional(),
  cropId: z.string().trim().optional(),
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
  includeCompleted: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") return val.toLowerCase() === "true" || val === "1";
      return undefined;
    }),
});

export const refreshRecommendationsSchema = z.object({
  farmId: z.string().trim().optional(),
});
