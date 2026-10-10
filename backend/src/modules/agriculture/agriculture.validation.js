import { z } from "zod";

export const listCropsQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  season: z.string().trim().optional(),
  state: z.string().trim().optional(),
  district: z.string().trim().optional(),
  hasGrowthProfile: z
    .string()
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const cropIdParamSchema = z.object({
  cropId: z.string().trim().min(1, "cropId is required"),
});

export const listRegionsQuerySchema = z.object({
  state: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const cropCalendarQuerySchema = z.object({
  cropId: z.string().trim().optional(),
  crop: z.string().trim().optional(),
  varietyId: z.string().trim().optional(),
  state: z.string().trim().optional(),
  district: z.string().trim().optional(),
  season: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
});

export const growthProfilesQuerySchema = z.object({
  cropId: z.string().trim().optional(),
  crop: z.string().trim().optional(),
  varietyId: z.string().trim().optional(),
});

export const suitabilityQuerySchema = z.object({
  cropId: z.string().trim().optional(),
  crop: z.string().trim().optional(),
});

export const batchIngestSchema = z.object({
  source: z.enum(["calendar", "kaggle", "hf_yield", "hf_disease", "all"]).default("calendar"),
  limit: z.coerce.number().int().positive().max(50000).optional(),
  dryRun: z.boolean().default(false),
});
