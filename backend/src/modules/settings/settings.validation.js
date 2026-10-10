import { z } from "zod";

export const patchSettingsSchema = z
  .object({
    areaUnit: z
      .enum(["hectare", "acre"], {
        errorMap: () => ({ message: "Area unit must be either 'hectare' or 'acre'." }),
      })
      .optional(),
    temperatureUnit: z
      .enum(["celsius", "fahrenheit"], {
        errorMap: () => ({ message: "Temperature unit must be either 'celsius' or 'fahrenheit'." }),
      })
      .optional(),
    language: z
      .enum(["en", "hi", "kn", "ta"], {
        errorMap: () => ({ message: "Language must be one of 'en', 'hi', 'kn', 'ta'." }),
      })
      .optional(),
    defaultFarmId: z.string().nullable().optional(),
    notifications: z
      .object({
        harvestWindowAlerts: z.boolean().optional(),
        weatherCautions: z.boolean().optional(),
        weeklySummary: z.boolean().optional(),
      })
      .optional(),
  })
  .strict({
    message: "Unexpected fields provided in settings update.",
  });
