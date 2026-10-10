import { z } from "zod";

/**
 * Validation schema for GET /api/forecasts query parameters.
 */
export const listForecastsQuerySchema = z.object({
  farmId: z.string().trim().min(1).optional(),
  cropId: z.string().trim().min(1).optional(),
  readinessStatus: z.string().trim().min(1).optional(),
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid startDate format (YYYY-MM-DD)").optional(),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid endDate format (YYYY-MM-DD)").optional(),
  dateFrom: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid dateFrom format (YYYY-MM-DD)").optional(),
  dateTo: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid dateTo format (YYYY-MM-DD)").optional(),
  sortBy: z.enum(["date", "name", "readiness"]).optional(),
  sort: z.string().optional(),
  chronological: z.string().optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
});

/**
 * Validation schema for POST /api/forecasts/refresh request body.
 */
export const refreshForecastsSchema = z.object({
  farmId: z.string().trim().min(1).optional(),
  cropId: z.string().trim().min(1).optional(),
});

/**
 * Validation schema for /:cropId route parameter.
 */
export const cropIdParamSchema = z.object({
  cropId: z.string().trim().min(1, "Crop ID is required"),
});
