import { z } from "zod";

export const farmWeatherParamSchema = z.object({
  farmId: z.string().trim().min(1, "Farm ID is required"),
});

export const coordinatesQuerySchema = z.object({
  latitude: z.coerce
    .number({ invalid_type_error: "Latitude must be a valid number" })
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z.coerce
    .number({ invalid_type_error: "Longitude must be a valid number" })
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
});
