/**
 * HarvestWindow Agronomic Crop-Duration Rules & Stage Template Registry
 *
 * Grounded in published agronomic research and extension guidelines from the
 * Indian Council of Agricultural Research (ICAR) and State Agricultural Universities (SAUs).
 *
 * Rules provide:
 * - Minimum, typical, and maximum maturity durations (in days from sowing).
 * - Multi-stage developmental timelines with normalized progress boundaries.
 * - Exact variety-specific rules where documented.
 * - Crop-level fallbacks when a specific variety is not specified or recognized.
 * - Provenance metadata and applicability constraints.
 */

export const STAGE_TEMPLATES = {
  cerealGrain: [
    "Sowing & establishment",
    "Vegetative growth",
    "Panicle / head initiation",
    "Flowering",
    "Grain filling",
    "Approaching maturity",
  ],
  wheat: [
    "Sowing & germination",
    "Tillering",
    "Stem extension",
    "Heading & flowering",
    "Grain filling",
    "Maturity (dough → hard)",
  ],
  fruitingVegetable: [
    "Transplant / establishment",
    "Vegetative growth",
    "Flowering",
    "Fruit set",
    "Fruit development",
    "Ripening",
  ],
  fibre: [
    "Sowing & emergence",
    "Vegetative growth",
    "Squaring",
    "Flowering & boll set",
    "Boll development",
    "Boll burst",
  ],
  pod: [
    "Sowing & emergence",
    "Vegetative growth",
    "Flowering",
    "Pegging",
    "Pod development",
    "Pod fill & maturity",
  ],
  cane: [
    "Sett planting",
    "Germination & tillering",
    "Grand growth",
    "Cane elongation",
    "Sugar accumulation",
    "Maturity",
  ],
};

/** Cumulative season progress fractions (0 = sowing, 1 = harvest window opens). */
export const TEMPLATE_BOUNDARIES = {
  cerealGrain: [0, 0.07, 0.26, 0.4, 0.5, 0.76, 0.92, 1],
  wheat: [0, 0.06, 0.2, 0.36, 0.5, 0.74, 0.92, 1],
  fruitingVegetable: [0, 0.08, 0.28, 0.42, 0.56, 0.78, 1],
  fibre: [0, 0.07, 0.24, 0.4, 0.55, 0.75, 1],
  pod: [0, 0.08, 0.3, 0.45, 0.6, 0.82, 1],
  cane: [0, 0.05, 0.16, 0.4, 0.64, 0.86, 1],
};

/**
 * Validated Crop-Duration Rules.
 * Each entry is documented with agricultural source and validity bounds.
 */
export const CROP_RULES = [
  // --- WHEAT ---
  {
    cropName: "Wheat",
    variety: "HD-3086",
    aliases: ["hd 3086", "pusa gautama"],
    minDays: 135,
    typicalDays: 142,
    maxDays: 152,
    stageTemplate: "wheat",
    source: "ICAR-Indian Agricultural Research Institute (IARI) package of practices for NWPZ",
    applicability: "North-Western Plains Zone, timely sown irrigated conditions",
    version: "1.0.0",
  },
  {
    cropName: "Wheat",
    variety: "HD-2967",
    aliases: ["hd 2967"],
    minDays: 138,
    typicalDays: 145,
    maxDays: 155,
    stageTemplate: "wheat",
    source: "PAU Ludhiana / ICAR-IARI agronomy guidelines",
    applicability: "Irrigated timely sown, medium to high fertility soils",
    version: "1.0.0",
  },
  {
    cropName: "Wheat",
    variety: "Lokwan",
    aliases: ["lok 1", "lokwan"],
    minDays: 110,
    typicalDays: 118,
    maxDays: 128,
    stageTemplate: "wheat",
    source: "MPKV Rahuri / ICAR Central Zone recommendations",
    applicability: "Central and Peninsular zones, early-maturing semi-dwarf bread wheat",
    version: "1.0.0",
  },
  {
    cropName: "Wheat",
    variety: null, // Crop-level fallback
    minDays: 125,
    typicalDays: 140,
    maxDays: 158,
    stageTemplate: "wheat",
    source: "ICAR-Indian Institute of Wheat and Barley Research (IIWBR)",
    applicability: "Standard Indian Rabi wheat cultivation across agro-climatic zones",
    version: "1.0.0",
  },

  // --- RICE (PADDY) ---
  {
    cropName: "Rice (Paddy)",
    variety: "Basmati",
    aliases: ["pusa basmati 1121", "pusa basmati 1509", "1121", "1509"],
    minDays: 115,
    typicalDays: 125,
    maxDays: 140,
    stageTemplate: "cerealGrain",
    source: "ICAR-NRRI Cuttack & Basmati Export Development Foundation (BEDF)",
    applicability: "Transplanted aromatic paddy in GI zones of Northern India",
    version: "1.0.0",
  },
  {
    cropName: "Rice (Paddy)",
    variety: "PR-126",
    aliases: ["pr 126", "pr126"],
    minDays: 93,
    typicalDays: 100,
    maxDays: 110,
    stageTemplate: "cerealGrain",
    source: "Punjab Agricultural University (PAU) short-duration variety release",
    applicability: "Kharif short-duration transplanted rice saving irrigation water",
    version: "1.0.0",
  },
  {
    cropName: "Rice (Paddy)",
    variety: null,
    minDays: 115,
    typicalDays: 130,
    maxDays: 150,
    stageTemplate: "cerealGrain",
    source: "ICAR-National Rice Research Institute (NRRI) agronomy guide",
    applicability: "Medium-duration lowland/irrigated rice crops across India",
    version: "1.0.0",
  },

  // --- MAIZE ---
  {
    cropName: "Maize",
    variety: null,
    minDays: 90,
    typicalDays: 105,
    maxDays: 125,
    stageTemplate: "cerealGrain",
    source: "ICAR-Indian Institute of Maize Research (IIMR), Ludhiana",
    applicability: "Single cross hybrids (Kharif and Rabi grain maize)",
    version: "1.0.0",
  },

  // --- COTTON ---
  {
    cropName: "Cotton",
    variety: null,
    minDays: 160,
    typicalDays: 178,
    maxDays: 200,
    stageTemplate: "fibre",
    source: "ICAR-Central Institute for Cotton Research (CICR), Nagpur",
    applicability: "Medium to long staple Bt hybrid cotton under rainfed/irrigated conditions",
    version: "1.0.0",
  },

  // --- TOMATO ---
  {
    cropName: "Tomato",
    variety: "Arka Rakshak",
    aliases: ["arka rakshak"],
    minDays: 70,
    typicalDays: 80,
    maxDays: 95,
    stageTemplate: "fruitingVegetable",
    source: "ICAR-Indian Institute of Horticultural Research (IIHR), Bengaluru",
    applicability: "Determinate F1 hybrid with triple disease resistance",
    version: "1.0.0",
  },
  {
    cropName: "Tomato",
    variety: null,
    minDays: 70,
    typicalDays: 85,
    maxDays: 100,
    stageTemplate: "fruitingVegetable",
    source: "ICAR-IIHR vegetable production manuals",
    applicability: "Transplanted field tomato (first commercial flush to main harvest)",
    version: "1.0.0",
  },

  // --- GROUNDNUT ---
  {
    cropName: "Groundnut",
    variety: null,
    minDays: 105,
    typicalDays: 115,
    maxDays: 130,
    stageTemplate: "pod",
    source: "ICAR-Directorate of Groundnut Research (DGR), Junagadh",
    applicability: "Spanish bunch and Virginia runner cultivars",
    version: "1.0.0",
  },

  // --- SOYBEAN ---
  {
    cropName: "Soybean",
    variety: null,
    minDays: 90,
    typicalDays: 102,
    maxDays: 118,
    stageTemplate: "pod",
    source: "ICAR-Indian Institute of Soybean Research (IISR), Indore",
    applicability: "Central India black soils Kharif soybean production",
    version: "1.0.0",
  },

  // --- CHICKPEA ---
  {
    cropName: "Chickpea",
    variety: null,
    minDays: 95,
    typicalDays: 110,
    maxDays: 125,
    stageTemplate: "pod",
    source: "ICAR-Indian Institute of Pulses Research (IIPR), Kanpur",
    applicability: "Desi and Kabuli Rabi chickpeas in Northern and Central India",
    version: "1.0.0",
  },

  // --- MUSTARD ---
  {
    cropName: "Mustard",
    variety: null,
    minDays: 105,
    typicalDays: 120,
    maxDays: 135,
    stageTemplate: "cerealGrain",
    source: "ICAR-Directorate of Rapeseed-Mustard Research (DRMR), Bharatpur",
    applicability: "Indian mustard (Brassica juncea) in Rabi season",
    version: "1.0.0",
  },

  // --- POTATO ---
  {
    cropName: "Potato",
    variety: null,
    minDays: 80,
    typicalDays: 95,
    maxDays: 110,
    stageTemplate: "fruitingVegetable",
    source: "ICAR-Central Potato Research Institute (CPRI), Shimla",
    applicability: "Indo-Gangetic plains main Rabi potato crop",
    version: "1.0.0",
  },

  // --- ONION ---
  {
    cropName: "Onion",
    variety: null,
    minDays: 95,
    typicalDays: 112,
    maxDays: 130,
    stageTemplate: "fruitingVegetable",
    source: "ICAR-Directorate of Onion and Garlic Research (DOGR), Pune",
    applicability: "Rabi and late Kharif bulb onions",
    version: "1.0.0",
  },

  // --- TURMERIC ---
  {
    cropName: "Turmeric",
    variety: null,
    minDays: 200,
    typicalDays: 225,
    maxDays: 250,
    stageTemplate: "cane",
    source: "ICAR-Indian Institute of Spices Research (IISR), Kozhikode",
    applicability: "Long-duration rhizome spice crop",
    version: "1.0.0",
  },

  // --- BAJRA (PEARL MILLET) ---
  {
    cropName: "Bajra (Pearl Millet)",
    variety: null,
    minDays: 75,
    typicalDays: 88,
    maxDays: 105,
    stageTemplate: "cerealGrain",
    source: "ICAR-All India Coordinated Research Project on Pearl Millet (AICRP-PM), Jodhpur",
    applicability: "Rainfed arid and semi-arid Kharif pearl millet hybrids",
    version: "1.0.0",
  },

  // --- SUGARCANE ---
  {
    cropName: "Sugarcane",
    variety: null,
    minDays: 320,
    typicalDays: 345,
    maxDays: 370,
    stageTemplate: "cane",
    source: "ICAR-Sugarcane Breeding Institute (SBI), Coimbatore",
    applicability: "Spring/autumn planted annual sugarcane in sub-tropical and tropical India",
    version: "1.0.0",
  },
];

/** Generic fallback range when no exact or crop-level match exists. */
export const GENERIC_FALLBACK_RULE = {
  cropName: "Generic Crop",
  variety: null,
  minDays: 100,
  typicalDays: 120,
  maxDays: 145,
  stageTemplate: "cerealGrain",
  source: "Agricultural benchmark default for unlisted annual cultivars",
  applicability: "Broad fallback; users should verify with local extension agents",
  version: "1.0.0",
};

/**
 * Normalizes user input for matching against crop and variety names.
 *
 * @param {string} str
 * @returns {string}
 */
export function normalizeKey(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .replace(/[()[\]{}_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves the most specific matching rule for a given crop and variety.
 *
 * Priority order:
 * 1. Exact crop AND variety match (or variety alias).
 * 2. Crop-level rule (variety is null).
 * 3. Generic fallback rule (if allowGenericFallback is true).
 * 4. null (when no defensible rule exists).
 *
 * @param {string} rawCropName
 * @param {string} [rawVariety]
 * @param {boolean} [allowGenericFallback=true]
 * @returns {{ rule: Object, matchType: 'EXACT_VARIETY' | 'CROP_LEVEL' | 'GENERIC_FALLBACK' } | null}
 */
export function resolveCropRule(rawCropName, rawVariety = null, allowGenericFallback = true) {
  const normCrop = normalizeKey(rawCropName);
  if (!normCrop) return null;

  const normVariety = normalizeKey(rawVariety);

  // 1. Try exact crop + variety match
  if (normVariety) {
    const varietyMatch = CROP_RULES.find((r) => {
      if (!r.variety) return false;
      const ruleNormCrop = normalizeKey(r.cropName);
      if (ruleNormCrop !== normCrop && !normCrop.includes(ruleNormCrop) && !ruleNormCrop.includes(normCrop)) {
        return false;
      }
      const ruleNormVariety = normalizeKey(r.variety);
      if (ruleNormVariety === normVariety || normVariety.includes(ruleNormVariety)) {
        return true;
      }
      if (Array.isArray(r.aliases)) {
        return r.aliases.some((alias) => normalizeKey(alias) === normVariety);
      }
      return false;
    });

    if (varietyMatch) {
      return { rule: varietyMatch, matchType: "EXACT_VARIETY" };
    }
  }

  // 2. Try crop-level rule
  const cropMatch = CROP_RULES.find((r) => {
    if (r.variety !== null) return false;
    const ruleNormCrop = normalizeKey(r.cropName);
    return (
      ruleNormCrop === normCrop ||
      normCrop.includes(ruleNormCrop) ||
      ruleNormCrop.includes(normCrop)
    );
  });

  if (cropMatch) {
    return { rule: cropMatch, matchType: "CROP_LEVEL" };
  }

  // 3. Fallback if enabled
  if (allowGenericFallback) {
    return { rule: GENERIC_FALLBACK_RULE, matchType: "GENERIC_FALLBACK" };
  }

  return null;
}
