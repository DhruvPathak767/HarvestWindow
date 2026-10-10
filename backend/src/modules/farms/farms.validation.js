import { z } from "zod";

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
  "Chandigarh",
];

export const SOIL_TYPES = [
  "Alluvial",
  "Black/Regur",
  "Red & Yellow",
  "Laterite",
  "Sandy",
  "Clay Loam",
  "Peaty",
];

export const IRRIGATION_SOURCES = [
  "Canal",
  "Borewell/Tube-well",
  "Drip",
  "Sprinkler",
  "Rainfed",
  "Open Well",
  "Mixed",
];

const normalizeSoilType = (val) => {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  if (/black/i.test(str)) return "Black/Regur";
  if (/alluvial/i.test(str)) return "Alluvial";
  if (/red/i.test(str)) return "Red & Yellow";
  if (/laterite/i.test(str)) return "Laterite";
  if (/sandy/i.test(str) || /arid/i.test(str)) return "Sandy";
  if (/clay/i.test(str)) return "Clay Loam";
  if (/peat/i.test(str)) return "Peaty";
  return str;
};

const normalizeIrrigationSource = (val) => {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  if (/borewell/i.test(str) || /tube/i.test(str)) return "Borewell/Tube-well";
  if (/canal/i.test(str)) return "Canal";
  if (/drip/i.test(str)) return "Drip";
  if (/sprinkler/i.test(str)) return "Sprinkler";
  if (/rain/i.test(str)) return "Rainfed";
  if (/open\s*well/i.test(str) || /pond/i.test(str)) return "Open Well";
  if (/mixed/i.test(str)) return "Mixed";
  return str;
};

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

const areaUnitSchema = z
  .string({ required_error: "Area unit is required" })
  .trim()
  .refine(
    (v) => ["hectare", "hectares", "acre", "acres"].includes(v.toLowerCase()),
    {
      message: "Area unit must be either Hectare or Acre",
    }
  )
  .transform((v) => {
    const lower = String(v).toLowerCase();
    return lower.startsWith("acre") ? "ACRE" : "HECTARE";
  });

const postalCodeSchema = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v === "" ? null : v))
  .refine(
    (v) => v === null || v === undefined || /^\d{6}$/.test(v),
    {
      message: "Postal code must be a valid 6-digit Indian PIN code",
    }
  );

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
      .max(120, "Farm name cannot exceed 120 characters"),
    state: z
      .string()
      .trim()
      .min(2, "State must be at least 2 characters")
      .max(100, "State cannot exceed 100 characters")
      .refine(
        (val) => INDIAN_STATES.some((s) => s.toLowerCase() === val.toLowerCase()),
        { message: "State must be a supported Indian state or territory" }
      ),
    district: z
      .string()
      .trim()
      .min(2, "District must be at least 2 characters")
      .max(100, "District cannot exceed 100 characters"),
    villageOrTaluka: z
      .string()
      .trim()
      .max(120, "Village / Taluka cannot exceed 120 characters")
      .nullable()
      .optional()
      .transform((v) => (v ? v.trim() : null)),
    village: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional(),
    postalCode: postalCodeSchema,
    pincode: postalCodeSchema,
    soilType: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform(normalizeSoilType)
      .refine(
        (v) => v === null || v === undefined || SOIL_TYPES.includes(v),
        { message: `Soil type must be one of: ${SOIL_TYPES.join(", ")}` }
      ),
    irrigationSource: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform(normalizeIrrigationSource)
      .refine(
        (v) => v === null || v === undefined || IRRIGATION_SOURCES.includes(v),
        { message: `Primary irrigation source must be one of: ${IRRIGATION_SOURCES.join(", ")}` }
      ),
    latitude: coordSchema(-90, 90, "Latitude"),
    longitude: coordSchema(-180, 180, "Longitude"),
    area: areaSchema,
    areaUnit: areaUnitSchema,
    notes: z
      .string()
      .trim()
      .max(500, "Notes cannot exceed 500 characters")
      .nullable()
      .optional()
      .transform((v) => (v ? v.trim() : null)),
  })
  .transform((data) => ({
    ...data,
    villageOrTaluka: data.villageOrTaluka || data.village || null,
    postalCode: data.postalCode || data.pincode || null,
  }))
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
 */
export const updateFarmSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Farm name must be at least 2 characters")
      .max(120, "Farm name cannot exceed 120 characters")
      .optional(),
    state: z
      .string()
      .trim()
      .min(2, "State must be at least 2 characters")
      .max(100, "State cannot exceed 100 characters")
      .refine(
        (val) => !val || INDIAN_STATES.some((s) => s.toLowerCase() === val.toLowerCase()),
        { message: "State must be a supported Indian state or territory" }
      )
      .optional(),
    district: z
      .string()
      .trim()
      .min(2, "District must be at least 2 characters")
      .max(100, "District cannot exceed 100 characters")
      .optional(),
    villageOrTaluka: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional()
      .transform((v) => (v ? v.trim() : null)),
    village: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional(),
    postalCode: postalCodeSchema,
    pincode: postalCodeSchema,
    soilType: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform(normalizeSoilType)
      .refine(
        (v) => v === null || v === undefined || SOIL_TYPES.includes(v),
        { message: `Soil type must be one of: ${SOIL_TYPES.join(", ")}` }
      ),
    irrigationSource: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform(normalizeIrrigationSource)
      .refine(
        (v) => v === null || v === undefined || IRRIGATION_SOURCES.includes(v),
        { message: `Primary irrigation source must be one of: ${IRRIGATION_SOURCES.join(", ")}` }
      ),
    latitude: coordSchema(-90, 90, "Latitude"),
    longitude: coordSchema(-180, 180, "Longitude"),
    area: areaSchema.optional(),
    areaUnit: areaUnitSchema.optional(),
    notes: z
      .string()
      .trim()
      .max(500, "Notes cannot exceed 500 characters")
      .nullable()
      .optional()
      .transform((v) => (v ? v.trim() : null)),
  })
  .transform((data) => ({
    ...data,
    villageOrTaluka: data.villageOrTaluka !== undefined ? data.villageOrTaluka : data.village !== undefined ? data.village : undefined,
    postalCode: data.postalCode !== undefined ? data.postalCode : data.pincode !== undefined ? data.pincode : undefined,
  }))
  .refine(
    (data) => {
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
