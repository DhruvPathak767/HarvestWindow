import { z } from "zod";

const coordSchema = (min, max, label) =>
  z
    .union([z.number(), z.string()])
    .nullable()
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null;
      const num = Number(val);
      return Number.isNaN(num) ? NaN : num;
    })
    .refine(
      (val) => val === null || (!Number.isNaN(val) && val >= min && val <= max),
      {
        message: `${label} must be a number between ${min} and ${max}`,
      }
    );

const areaSchema = z
  .union([z.number(), z.string()])
  .transform((val) => {
    const num = Number(val);
    return Number.isNaN(num) ? NaN : num;
  })
  .refine((val) => !Number.isNaN(val) && val > 0, {
    message: "Field size must be a number greater than zero",
  })
  .refine((val) => val <= 100000, {
    message: "Area value looks larger than a real agricultural holding",
  });

/**
 * Validates the farmId route parameter.
 */
export const farmIdParamSchema = z.object({
  farmId: z.string().trim().min(1, "Farm ID is required"),
});

/**
 * Validates request payload for creating a new farm.
 */
export const createFarmSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Farm name must be at least 2 characters")
      .max(100, "Farm name cannot exceed 100 characters"),
    state: z
      .string()
      .trim()
      .min(2, "State must be at least 2 characters")
      .max(100, "State cannot exceed 100 characters"),
    district: z
      .string()
      .trim()
      .min(2, "District must be at least 2 characters")
      .max(100, "District cannot exceed 100 characters"),
    latitude: coordSchema(-90, 90, "Latitude"),
    longitude: coordSchema(-180, 180, "Longitude"),
    area: areaSchema,
    areaUnit: z.enum(["hectare", "acre"], {
      errorMap: () => ({ message: "Area unit must be either 'hectare' or 'acre'" }),
    }),
    notes: z
      .string()
      .trim()
      .max(500, "Notes cannot exceed 500 characters")
      .nullable()
      .optional()
      .transform((v) => (v ? v.trim() : null)),
  })
  .refine(
    (data) => {
      const hasLat = data.latitude !== null && data.latitude !== undefined;
      const hasLon = data.longitude !== null && data.longitude !== undefined;
      return (hasLat && hasLon) || (!hasLat && !hasLon);
    },
    {
      message: "Latitude and longitude must both be provided together",
      path: ["longitude"],
    }
  );

/**
 * Validates request payload for updating an existing farm.
 * Supports partial updates while maintaining field rules.
 */
export const updateFarmSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Farm name must be at least 2 characters")
      .max(100, "Farm name cannot exceed 100 characters")
      .optional(),
    state: z
      .string()
      .trim()
      .min(2, "State must be at least 2 characters")
      .max(100, "State cannot exceed 100 characters")
      .optional(),
    district: z
      .string()
      .trim()
      .min(2, "District must be at least 2 characters")
      .max(100, "District cannot exceed 100 characters")
      .optional(),
    latitude: coordSchema(-90, 90, "Latitude"),
    longitude: coordSchema(-180, 180, "Longitude"),
    area: areaSchema.optional(),
    areaUnit: z
      .enum(["hectare", "acre"], {
        errorMap: () => ({ message: "Area unit must be either 'hectare' or 'acre'" }),
      })
      .optional(),
    notes: z
      .string()
      .trim()
      .max(500, "Notes cannot exceed 500 characters")
      .nullable()
      .optional()
      .transform((v) => (v ? v.trim() : null)),
  })
  .refine(
    (data) => {
      // If either coordinate is explicitly supplied (and not null), both must be supplied
      const hasLat = data.latitude !== null && data.latitude !== undefined;
      const hasLon = data.longitude !== null && data.longitude !== undefined;
      if (hasLat || hasLon) {
        return hasLat && hasLon;
      }
      return true;
    },
    {
      message: "Latitude and longitude must both be provided together",
      path: ["longitude"],
    }
  );
