/**
 * Phase AI-3: Crop-Specific Weather Sensitivity & Agronomic Thresholds Configuration
 * Grounded in verified institutional benchmarks (ICAR, SAUs, IMD Agromet Advisory Service).
 * Includes conservative generic baseline for unverified crops with transparent labeling.
 */

export const CROP_RISK_CONFIGS = [
  // --- WHEAT (Triticum aestivum) ---
  {
    cropName: "Wheat",
    aliases: ["wheat", "gehun", "gehu", "sharbati"],
    category: "Cereals",
    rainfall: {
      lightMm: 5.0,
      moderateMm: 12.0,
      heavyMm: 22.0,
      harvestDamageThresholdMm: 8.0, // Wet mature ears suffer kernel discoloration, sprouting, and high moisture
      consecutiveWetDays: 2,
    },
    humidity: {
      dryingRiskThresholdPercent: 78,
      consecutiveDays: 2,
    },
    wind: {
      lodgingSpeedMps: 10.5, // ~38 km/h sustained wind lodges top-heavy ripe wheat heads
      gustSpeedMps: 14.5,
    },
    temperature: {
      heatDamageC: 38.0, // Terminal heat stress causes forced desiccation and grain shattering
      frostDamageC: 4.0,
      workerSafetyC: 40.0,
    },
    evidenceSource: "ICAR-IIWBR Karnal / Punjab Agricultural University (PAU) Wheat Package",
    isGeneric: false,
    notes: "Late-stage rainfall within 7 days of harvest causes grain lodging, pre-harvest sprouting, and fungal black point.",
  },

  // --- PADDY / RICE (Oryza sativa) ---
  {
    cropName: "Paddy",
    aliases: ["paddy", "rice", "dhan", "chawal", "basmati"],
    category: "Cereals",
    rainfall: {
      lightMm: 6.0,
      moderateMm: 15.0,
      heavyMm: 25.0,
      harvestDamageThresholdMm: 12.0, // Standing ripe crop lodges into standing water; grain discoloration
      consecutiveWetDays: 2,
    },
    humidity: {
      dryingRiskThresholdPercent: 82,
      consecutiveDays: 3,
    },
    wind: {
      lodgingSpeedMps: 11.0,
      gustSpeedMps: 15.0,
    },
    temperature: {
      heatDamageC: 39.0,
      frostDamageC: 8.0,
      workerSafetyC: 41.0,
    },
    evidenceSource: "ICAR-National Rice Research Institute (NRRI) Cuttack",
    isGeneric: false,
    notes: "Wet conditions during harvest prevent combine harvester movement, cause grain shattering, and trigger mill yield reduction.",
  },

  // --- COTTON (Gossypium hirsutum) ---
  {
    cropName: "Cotton",
    aliases: ["cotton", "kapas"],
    category: "Commercial",
    rainfall: {
      lightMm: 3.0,
      moderateMm: 8.0,
      heavyMm: 15.0,
      harvestDamageThresholdMm: 5.0, // Open boll wetting stains lint, causes fungal rot, drops grade
      consecutiveWetDays: 1,
    },
    humidity: {
      dryingRiskThresholdPercent: 72,
      consecutiveDays: 2,
    },
    wind: {
      lodgingSpeedMps: 9.0, // Strong winds blow open lint to ground
      gustSpeedMps: 13.0,
    },
    temperature: {
      heatDamageC: 42.0,
      frostDamageC: 6.0,
      workerSafetyC: 42.0,
    },
    evidenceSource: "ICAR-Central Institute for Cotton Research (CICR) Nagpur",
    isGeneric: false,
    notes: "Even light showers during open boll picking severely degrade fiber color, staple strength, and market value.",
  },

  // --- MUSTARD / RAPESEED (Brassica juncea) ---
  {
    cropName: "Mustard",
    aliases: ["mustard", "sarson", "rai", "rapeseed"],
    category: "Oilseeds",
    rainfall: {
      lightMm: 4.0,
      moderateMm: 10.0,
      heavyMm: 18.0,
      harvestDamageThresholdMm: 6.0, // Mature siliquae shatter upon raindrop impact
      consecutiveWetDays: 1,
    },
    humidity: {
      dryingRiskThresholdPercent: 75,
      consecutiveDays: 2,
    },
    wind: {
      lodgingSpeedMps: 8.5, // High pod shattering risk in standing dry mustard
      gustSpeedMps: 12.0,
    },
    temperature: {
      heatDamageC: 36.0,
      frostDamageC: 3.5, // Sensitive to late frost
      workerSafetyC: 39.0,
    },
    evidenceSource: "ICAR-Directorate of Rapeseed-Mustard Research (DRMR) Bharatpur",
    isGeneric: false,
    notes: "Dry pods shatter easily under rain or turbulent wind gusts, leading to up to 40% seed loss.",
  },

  // --- MAIZE / CORN (Zea mays) ---
  {
    cropName: "Maize",
    aliases: ["maize", "corn", "makka", "makai"],
    category: "Cereals",
    rainfall: {
      lightMm: 6.0,
      moderateMm: 15.0,
      heavyMm: 28.0,
      harvestDamageThresholdMm: 14.0,
      consecutiveWetDays: 3,
    },
    humidity: {
      dryingRiskThresholdPercent: 80,
      consecutiveDays: 3,
    },
    wind: {
      lodgingSpeedMps: 12.0, // High stalk breakage risk
      gustSpeedMps: 16.0,
    },
    temperature: {
      heatDamageC: 40.0,
      frostDamageC: 5.0,
      workerSafetyC: 41.0,
    },
    evidenceSource: "ICAR-Indian Institute of Maize Research (IIMR) Ludhiana",
    isGeneric: false,
    notes: "Excessive moisture at maturity promotes cob ear rot and Aspergillus flavus / aflatoxin formation.",
  },

  // --- SOYBEAN (Glycine max) ---
  {
    cropName: "Soybean",
    aliases: ["soybean", "soya", "soyabean"],
    category: "Oilseeds",
    rainfall: {
      lightMm: 5.0,
      moderateMm: 12.0,
      heavyMm: 20.0,
      harvestDamageThresholdMm: 8.0,
      consecutiveWetDays: 2,
    },
    humidity: {
      dryingRiskThresholdPercent: 76,
      consecutiveDays: 2,
    },
    wind: {
      lodgingSpeedMps: 9.5,
      gustSpeedMps: 13.5,
    },
    temperature: {
      heatDamageC: 38.0,
      frostDamageC: 5.0,
      workerSafetyC: 40.0,
    },
    evidenceSource: "ICAR-Indian Institute of Soybean Research (IISR) Indore",
    isGeneric: false,
    notes: "Rainfall on mature standing pods triggers pod dehiscence (shattering) and germination on the plant.",
  },

  // --- CHICKPEA / GRAM (Cicer arietinum) ---
  {
    cropName: "Chickpea",
    aliases: ["chickpea", "gram", "chana", "bengal gram"],
    category: "Pulses",
    rainfall: {
      lightMm: 4.0,
      moderateMm: 10.0,
      heavyMm: 16.0,
      harvestDamageThresholdMm: 6.0,
      consecutiveWetDays: 1,
    },
    humidity: {
      dryingRiskThresholdPercent: 74,
      consecutiveDays: 2,
    },
    wind: {
      lodgingSpeedMps: 9.0,
      gustSpeedMps: 13.0,
    },
    temperature: {
      heatDamageC: 37.0,
      frostDamageC: 4.0,
      workerSafetyC: 39.0,
    },
    evidenceSource: "ICAR-Indian Institute of Pulses Research (IIPR) Kanpur",
    isGeneric: false,
    notes: "Wet pods at maturity discolor seed coats and encourage fungal decay.",
  },

  // --- POTATO (Solanum tuberosum) ---
  {
    cropName: "Potato",
    aliases: ["potato", "aloo", "alu"],
    category: "Vegetables",
    rainfall: {
      lightMm: 5.0,
      moderateMm: 12.0,
      heavyMm: 20.0,
      harvestDamageThresholdMm: 10.0, // Waterlogged soil prevents digging and causes tuber rotting
      consecutiveWetDays: 2,
    },
    humidity: {
      dryingRiskThresholdPercent: 85,
      consecutiveDays: 3,
    },
    wind: {
      lodgingSpeedMps: 12.0,
      gustSpeedMps: 16.0,
    },
    temperature: {
      heatDamageC: 32.0, // High temperature during harvest causes soft rot and black heart in transit
      frostDamageC: 2.0,
      workerSafetyC: 38.0,
    },
    evidenceSource: "ICAR-Central Potato Research Institute (CPRI) Shimla",
    isGeneric: false,
    notes: "Harvesting wet soil leaves tubers coated in mud, promotes Erwinia soft rot, and compromises skin curing.",
  },

  // --- TOMATO (Solanum lycopersicum) ---
  {
    cropName: "Tomato",
    aliases: ["tomato", "tamatar"],
    category: "Vegetables",
    rainfall: {
      lightMm: 4.0,
      moderateMm: 10.0,
      heavyMm: 18.0,
      harvestDamageThresholdMm: 7.0, // Fruit cracking and blossom end rot
      consecutiveWetDays: 1,
    },
    humidity: {
      dryingRiskThresholdPercent: 85,
      consecutiveDays: 2,
    },
    wind: {
      lodgingSpeedMps: 9.0,
      gustSpeedMps: 13.0,
    },
    temperature: {
      heatDamageC: 36.0,
      frostDamageC: 3.0,
      workerSafetyC: 39.0,
    },
    evidenceSource: "ICAR-Indian Institute of Horticultural Research (IIHR) Bengaluru",
    isGeneric: false,
    notes: "Rainfall on mature fruit triggers skin micro-cracks and rapid post-harvest bacterial decay.",
  },
];

/**
 * Conservative generic agricultural fallback for crops without verified specialized benchmarks.
 */
export const GENERIC_RISK_CONFIG = {
  cropName: "Generic Crop",
  category: "General Agriculture",
  rainfall: {
    lightMm: 5.0,
    moderateMm: 12.0,
    heavyMm: 20.0,
    harvestDamageThresholdMm: 10.0,
    consecutiveWetDays: 2,
  },
  humidity: {
    dryingRiskThresholdPercent: 80,
    consecutiveDays: 2,
  },
  wind: {
    lodgingSpeedMps: 10.0,
    gustSpeedMps: 14.0,
  },
  temperature: {
    heatDamageC: 38.0,
    frostDamageC: 5.0,
    workerSafetyC: 40.0,
  },
  evidenceSource: "Conservative Agrometeorological Baseline (IMD / FAO General Guidance)",
  isGeneric: true,
  notes: "Standard agricultural thresholds applied due to unverified crop-specific weather parameters.",
};

/**
 * Resolves crop-specific thresholds by matching crop name and aliases.
 *
 * @param {string} cropName - Name of the crop
 * @param {string} [variety] - Optional variety name
 * @returns {Object} Configured threshold object with provenance
 */
export function resolveCropRiskConfig(cropName, variety = null) {
  if (!cropName || typeof cropName !== "string") {
    return GENERIC_RISK_CONFIG;
  }

  const clean = cropName.trim().toLowerCase();

  for (const cfg of CROP_RISK_CONFIGS) {
    if (cfg.cropName.toLowerCase() === clean) return cfg;
    if (cfg.aliases.some((alias) => clean.includes(alias) || alias.includes(clean))) {
      return cfg;
    }
  }

  return {
    ...GENERIC_RISK_CONFIG,
    cropName: cropName.trim(),
  };
}
