import { z } from "zod";

/**
 * Validation schema for GET /api/forecasts query parameters.
 */
export const listForecastsQuerySchema = z.object({
  farmId: z.string().trim().min(1).optional(),
  cropId: z.string().trim().min(1).optional(),
  readinessStatus: z.string().trim().min(1).optional(),
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
