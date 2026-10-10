import { z } from "zod";

export const VALID_GROWTH_STAGES = [
  "PLANNED",
  "SOWN",
  "GERMINATION",
  "SEEDLING",
  "VEGETATIVE",
  "FLOWERING",
  "FRUITING",
  "MATURING",
  "HARVESTED",
];

const growthStageSchema = z
  .string()
  .trim()
  .max(50)
  .nullable()
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    if (val === null || val === "" || val === "Not recorded yet") {
      return null;
    }
    const upper = val.toUpperCase();
    if (VALID_GROWTH_STAGES.includes(upper)) {
      return upper;
    }
    // Map common frontend template stages
    if (/sow|plant/i.test(val)) return "SOWN";
    if (/germin/i.test(val)) return "GERMINATION";
    if (/seedl|transplant|sett/i.test(val)) return "SEEDLING";
    if (/vegetat|tiller|stem|grand/i.test(val)) return "VEGETATIVE";
    if (/flower|head|panicle|squar/i.test(val)) return "FLOWERING";
    if (/fruit|grain|peg|pod|boll/i.test(val)) return "FRUITING";
    if (/matur|ripen|dough|sugar/i.test(val)) return "MATURING";
    if (/harvest/i.test(val)) return "HARVESTED";
    return "__INVALID__";
  })
  .refine((val) => val === undefined || val === null || val !== "__INVALID__", {
    message: `Invalid growth stage. Must be one of: ${VALID_GROWTH_STAGES.join(", ")}`,
  });

const dateValueSchema = (label) =>
  z
    .union([z.string(), z.date()])
    .nullable()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (val === null || val === "") return null;
      const d = val instanceof Date ? val : new Date(val);
      return Number.isNaN(d.getTime()) ? NaN : d;
    })
    .refine(
      (val) => val === undefined || val === null || val instanceof Date,
      {
        message: `${label} must be a valid date`,
      }
    );

const optionalTrimmed = (max, label) =>
  z
    .string()
    .trim()
    .max(max, label ? `${label} cannot exceed ${max} characters` : undefined)
    .nullable()
    .optional()
    .transform((v) =>
      v === undefined ? undefined : v === null || v === "" ? null : v.trim()
    );

/**
 * Validates the cropId route parameter.
 */
export const cropIdParamSchema = z.object({
  cropId: z.string().trim().min(1, "Crop ID is required"),
});

/**
 * Validates query parameters for listing crops.
 */
export const listCropsQuerySchema = z.object({
  farmId: z.string().trim().optional(),
  cropName: z.string().trim().optional(),
  name: z.string().trim().optional(),
  variety: z.string().trim().optional(),
  growthStage: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : undefined)),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * Validates request payload for creating a new crop.
 */
export const createCropSchema = z
  .preprocess(
    (val) => {
      if (val && typeof val === "object") {
        const copy = { ...val };
        if (!copy.cropName && copy.name) {
          copy.cropName = copy.name;
        }
        if (!copy.sowingDate && copy.plantingDate) {
          copy.sowingDate = copy.plantingDate;
        }
        return copy;
      }
      return val;
    },
    z.object({
      farmId: z
        .string({ required_error: "Farm ID is required" })
        .trim()
        .min(1, "Farm ID is required"),
      cropName: z
        .string({ required_error: "Crop name is required" })
        .trim()
        .min(2, "Crop name must be at least 2 characters")
        .max(120, "Crop name cannot exceed 120 characters"),
      name: z.string().trim().max(120).optional(),
      variety: optionalTrimmed(100, "Variety"),
      sowingDate: z.preprocess(
        (v) => {
          if (v === null || v === undefined || v === "") return undefined;
          const d = v instanceof Date ? v : new Date(v);
          return Number.isNaN(d.getTime()) ? NaN : d;
        },
        z
          .date({
            required_error: "Sowing date is required",
            invalid_type_error: "Sowing date must be a valid date",
          })
          .refine((v) => !Number.isNaN(v.getTime()), {
            message: "Sowing date must be a valid date",
          })
      ),
      plantingDate: dateValueSchema("Planting date"),
      expectedHarvestDate: dateValueSchema("Expected harvest date"),
      growthStage: growthStageSchema,
      irrigationMethod: optionalTrimmed(100, "Irrigation method"),
      irrigation: optionalTrimmed(100, "Irrigation"),
      irrigationFrequency: optionalTrimmed(100, "Irrigation frequency"),
      fieldArea: z
        .union([z.number(), z.string()])
        .nullable()
        .optional()
        .transform((val) => {
          if (val === undefined) return undefined;
          if (val === null || val === "") return null;
          const num = Number(val);
          return Number.isNaN(num) ? NaN : num;
        })
        .refine(
          (val) => val === undefined || val === null || (!Number.isNaN(val) && val > 0),
          {
            message: "Field area must be a number greater than zero",
          }
        ),
      expectedYield: optionalTrimmed(100, "Expected yield"),
      notes: optionalTrimmed(1000, "Notes"),
    })
  )
  .refine(
    (data) => {
      const sowing = data.sowingDate;
      const harvest = data.expectedHarvestDate;
      if (sowing instanceof Date && harvest instanceof Date) {
        return harvest.getTime() >= sowing.getTime();
      }
      return true;
    },
    {
      message: "Expected harvest date cannot be earlier than sowing date",
      path: ["expectedHarvestDate"],
    }
  );

/**
 * Validates request payload for updating a crop.
 */
export const updateCropSchema = z
  .object({
    farmId: z.string().trim().min(1).optional(),
    cropName: z
      .string()
      .trim()
      .min(2, "Crop name must be at least 2 characters")
      .max(120, "Crop name cannot exceed 120 characters")
      .optional(),
    name: z
      .string()
      .trim()
      .min(2, "Crop name must be at least 2 characters")
      .max(120, "Crop name cannot exceed 120 characters")
      .optional(),
    variety: optionalTrimmed(100, "Variety"),
    sowingDate: dateValueSchema("Sowing date"),
    plantingDate: dateValueSchema("Planting date"),
    expectedHarvestDate: dateValueSchema("Expected harvest date"),
    growthStage: growthStageSchema,
    irrigationMethod: optionalTrimmed(100, "Irrigation method"),
    irrigation: optionalTrimmed(100, "Irrigation"),
    irrigationFrequency: optionalTrimmed(100, "Irrigation frequency"),
    fieldArea: z
      .union([z.number(), z.string()])
      .nullable()
      .optional()
      .transform((val) => {
        if (val === undefined) return undefined;
        if (val === null || val === "") return null;
        const num = Number(val);
        return Number.isNaN(num) ? NaN : num;
      })
      .refine(
        (val) => val === undefined || val === null || (!Number.isNaN(val) && val > 0),
        {
          message: "Field area must be a number greater than zero",
        }
      ),
    expectedYield: optionalTrimmed(100, "Expected yield"),
    notes: optionalTrimmed(1000, "Notes"),
  })
  .refine(
    (data) => {
      const sowing = data.sowingDate || data.plantingDate;
      const harvest = data.expectedHarvestDate;
      if (sowing instanceof Date && harvest instanceof Date) {
        return harvest.getTime() >= sowing.getTime();
      }
      return true;
    },
    {
      message: "Expected harvest date cannot be earlier than sowing date",
      path: ["expectedHarvestDate"],
    }
  );
