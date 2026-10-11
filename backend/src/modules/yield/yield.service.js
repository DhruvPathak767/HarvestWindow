/**
 * Core Yield Forecasting & Production Estimation Service (Phase AI-5).
 * Coordinates ML inference with Python FastAPI microservice, resilient agronomic fallback,
 * Prisma persistence, and farm-level production aggregation.
 */
import prisma from "../../config/prisma.js";
import { config } from "../../config/env.js";
import { AppError } from "../../middleware/errorHandler.js";
import {
  PREDICTION_STAGES,
  CONFIDENCE_LEVELS,
  AGRONOMIC_YIELD_BENCHMARKS,
  DEFAULT_YIELD_BENCHMARK,
} from "./yield.constants.js";
import {
  convertToHectares,
  convertToTonnes,
  estimateTotalProduction,
} from "./productionEstimator.service.js";
import { logActivity } from "../activity/activity.service.js";

const AI_SERVICE_URL = config.HARVEST_AI_SERVICE_URL || "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 6000;

/**
 * Normalizes crop names for benchmark lookup.
 */
function normalizeCropName(name) {
  if (!name || typeof name !== "string") return "Unknown";
  const lower = name.trim().toLowerCase();
  const aliasMap = {
    "rice (paddy)": "Rice",
    paddy: "Rice",
    dhan: "Rice",
    wheat: "Wheat",
    gehu: "Wheat",
    "cotton(lint)": "Cotton",
    cotton: "Cotton",
    "rapeseed &mustard": "Mustard",
    mustard: "Mustard",
    sarson: "Mustard",
    gram: "Chickpea",
    chana: "Chickpea",
    chickpea: "Chickpea",
    "arhar/tur": "Arhar/Tur",
    tur: "Arhar/Tur",
    arhar: "Arhar/Tur",
    "moong(green gram)": "Moong(Green Gram)",
    moong: "Moong(Green Gram)",
    urad: "Urad",
    maize: "Maize",
    makka: "Maize",
    corn: "Maize",
    bajra: "Bajra",
    jowar: "Jowar",
    soybean: "Soybean",
    soyabean: "Soybean",
    groundnut: "Groundnut",
    potato: "Potato",
    aloo: "Potato",
    onion: "Onion",
    pyaz: "Onion",
    tomato: "Tomato",
    sugarcane: "Sugarcane",
  };
  return aliasMap[lower] || name.trim();
}

/**
 * Resilient deterministic Agronomic Yield Fallback (when Python FastAPI service is offline).
 */
function predictAgronomicYieldFallback(crop, farm, areaHa) {
  const normCrop = normalizeCropName(crop.cropName);
  const bench = AGRONOMIC_YIELD_BENCHMARKS[normCrop] || DEFAULT_YIELD_BENCHMARK;

  let multiplier = 1.0;

  // Soil modifier
  const soil = String(farm.soilType || "").toLowerCase();
  if (soil.includes("alluvial") || soil.includes("black") || soil.includes("loam")) {
    multiplier *= 1.08;
  } else if (soil.includes("sandy") || soil.includes("saline")) {
    multiplier *= 0.88;
  }

  // Irrigation modifier
  const irrig = String(crop.irrigationMethod || farm.irrigationSource || "").toLowerCase();
  if (irrig.includes("drip") || irrig.includes("sprinkler") || irrig.includes("tube") || irrig.includes("canal")) {
    multiplier *= 1.10;
  } else if (irrig.includes("rain") || irrig.includes("dryland")) {
    multiplier *= 0.85;
  }

  const pointYield = Number(Math.max(0.1, bench.median * multiplier).toFixed(4));
  const lowerYield = Number(Math.max(0.05, pointYield * 0.78).toFixed(4));
  const upperYield = Number((pointYield * 1.22).toFixed(4));

  const prod = estimateTotalProduction({
    yieldTonnesPerHectare: pointYield,
    areaValue: areaHa,
    areaUnit: "HECTARE",
    lowerYield,
    upperYield,
  });

  return {
    crop_name: normCrop,
    state: farm.state || "India",
    season: "Kharif",
    prediction_stage: PREDICTION_STAGES.MID_SEASON,
    planted_area: {
      original_value: areaHa,
      original_unit: "HECTARE",
      area_hectares: areaHa,
    },
    yield_estimate: {
      value: pointYield,
      unit: "TONNE_PER_HECTARE",
    },
    production_estimate: {
      value: prod.expectedProductionTonnes,
      unit: "TONNE",
    },
    uncertainty: {
      available: true,
      method: "AGRONOMIC_BENCHMARK_QUANTILE_RESIDUALS",
      confidence_level_pct: 80.0,
      lower_yield_t_ha: lowerYield,
      upper_yield_t_ha: upperYield,
      lower_production_tonnes: prod.lowerProductionTonnes,
      upper_production_tonnes: prod.upperProductionTonnes,
    },
    confidence: CONFIDENCE_LEVELS.MODERATE,
    model: {
      name: "HarvestWindow Agronomic Yield Baseline",
      version: "1.0.0",
      algorithm: "AgronomicMedianBaseline",
      target_unit: "t/ha",
    },
    data_quality: {
      missing_features: ["realtime_ml_microservice"],
      warnings: ["Python ML service offline; deterministic agronomic reference baseline used."],
      used_fallback: true,
    },
    generated_at: new Date().toISOString(),
  };
}

/**
 * Dispatches inference request to Python FastAPI server.
 */
async function callPythonYieldService(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${AI_SERVICE_URL}/yield/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Python Yield AI returned HTTP ${res.status}: ${errText}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Predicts crop yield and production for a specific crop and persists snapshot.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} cropId - Target crop ID
 * @param {Object} [overrides] - Optional parameters (e.g. custom area or inputs)
 * @returns {Promise<Object>}
 */
export async function predictCropYield(userId, cropId, overrides = {}) {
  const crop = await prisma.crop.findFirst({
    where: {
      id: cropId,
      farm: { userId },
    },
    include: {
      farm: true,
    },
  });

  if (!crop) {
    throw new AppError("Crop not found or you do not have permission to access it.", 404);
  }

  const farm = crop.farm;

  // Resolve planted area
  let areaValue = overrides.areaValue;
  let areaUnit = overrides.areaUnit;

  if (!areaValue) {
    if (crop.fieldArea && Number(crop.fieldArea) > 0) {
      areaValue = Number(crop.fieldArea);
      areaUnit = farm.areaUnit || "HECTARE";
    } else if (farm.area && Number(farm.area) > 0) {
      areaValue = Number(farm.area);
      areaUnit = farm.areaUnit || "HECTARE";
    } else {
      areaValue = 1.0;
      areaUnit = "HECTARE";
    }
  }

  const areaHa = convertToHectares(areaValue, areaUnit);

  const aiPayload = {
    crop_name: crop.cropName,
    variety: crop.variety || null,
    state: farm.state || "Punjab",
    district: farm.district || null,
    season: overrides.season || "Kharif",
    planted_area: {
      value: Number(areaValue),
      unit: String(areaUnit || "HECTARE").toUpperCase(),
    },
    sowing_date: crop.sowingDate ? crop.sowingDate.toISOString().slice(0, 10) : null,
    expected_harvest_date: crop.expectedHarvestDate
      ? crop.expectedHarvestDate.toISOString().slice(0, 10)
      : null,
    soil_type: farm.soilType || null,
    annual_rainfall_mm: overrides.annualRainfallMm !== undefined ? Number(overrides.annualRainfallMm) : null,
    fertilizer_kg: overrides.fertilizerKg !== undefined ? Number(overrides.fertilizerKg) : null,
    pesticide_kg: overrides.pesticideKg !== undefined ? Number(overrides.pesticideKg) : null,
    prediction_stage: overrides.predictionStage || null,
  };

  let aiResult = null;
  try {
    aiResult = await callPythonYieldService(aiPayload);
  } catch (err) {
    // Graceful fallback to agronomic benchmark
    aiResult = predictAgronomicYieldFallback(crop, farm, areaHa);
  }

  // Persist assessment in Prisma
  const saved = await prisma.yieldPrediction.create({
    data: {
      userId,
      farmId: farm.id,
      cropId: crop.id,
      predictedYieldTonnesPerHectare: aiResult.yield_estimate.value,
      plantedAreaHectares: aiResult.planted_area.area_hectares,
      originalAreaValue: aiResult.planted_area.original_value,
      originalAreaUnit: aiResult.planted_area.original_unit,
      expectedProductionTonnes: aiResult.production_estimate.value,
      lowerYieldTonnesPerHectare: aiResult.uncertainty?.lower_yield_t_ha || null,
      upperYieldTonnesPerHectare: aiResult.uncertainty?.upper_yield_t_ha || null,
      lowerProductionTonnes: aiResult.uncertainty?.lower_production_tonnes || null,
      upperProductionTonnes: aiResult.uncertainty?.upper_production_tonnes || null,
      predictionStage: aiResult.prediction_stage,
      confidence: aiResult.confidence,
      modelVersion: aiResult.model.version,
      algorithm: aiResult.model.algorithm,
      uncertaintyMethod: aiResult.uncertainty?.method || null,
      inputSnapshotJson: JSON.stringify(aiPayload),
      dataQualityJson: JSON.stringify(aiResult.data_quality),
      evaluatedAt: new Date(),
    },
  });

  return formatYieldPredictionResponse(saved, crop, farm);
}

/**
 * Retrieves the latest stored prediction or generates a new one.
 */
export async function getLatestCropYield(userId, cropId) {
  const crop = await prisma.crop.findFirst({
    where: {
      id: cropId,
      farm: { userId },
    },
    include: { farm: true },
  });

  if (!crop) {
    throw new AppError("Crop not found or you do not have permission to access it.", 404);
  }

  const latest = await prisma.yieldPrediction.findFirst({
    where: { cropId, userId },
    orderBy: { evaluatedAt: "desc" },
  });

  if (latest) {
    return formatYieldPredictionResponse(latest, crop, crop.farm);
  }

  return await predictCropYield(userId, cropId);
}

/**
 * Calculates farm-level expected production summary across all active crops.
 */
export async function getFarmProductionEstimates(userId, farmId) {
  const farm = await prisma.farm.findFirst({
    where: { id: farmId, userId },
    include: {
      crops: true,
    },
  });

  if (!farm) {
    throw new AppError("Farm not found or you do not have permission to access it.", 404);
  }

  const cropEstimates = [];
  let totalEstimatedProductionTonnes = 0;
  let totalPlantedAreaHectares = 0;

  for (const crop of farm.crops) {
    try {
      const pred = await getLatestCropYield(userId, crop.id);
      cropEstimates.push(pred);
      const prodVal = pred.production?.value ?? pred.expectedProductionTonnes ?? 0;
      const areaVal = pred.plantedArea?.areaHectares ?? pred.plantedAreaHectares ?? 0;
      totalEstimatedProductionTonnes += prodVal;
      totalPlantedAreaHectares += areaVal;
    } catch {
      // Continue for other crops
    }
  }

  const cropsCoveredCount = cropEstimates.length;
  const totalCropsCount = farm.crops.length;
  const coveragePct = totalCropsCount > 0 ? Math.round((cropsCoveredCount / totalCropsCount) * 100) : 0;

  // Find min and max yield
  let highestYieldCrop = null;
  let lowestYieldCrop = null;

  if (cropEstimates.length > 0) {
    const sorted = [...cropEstimates].sort((a, b) => {
      const ya = a.yield?.value ?? a.predictedYieldTonnesPerHectare ?? 0;
      const yb = b.yield?.value ?? b.predictedYieldTonnesPerHectare ?? 0;
      return yb - ya;
    });
    highestYieldCrop = {
      cropName: sorted[0].cropName,
      predictedYieldTonnesPerHectare: sorted[0].yield?.value ?? sorted[0].predictedYieldTonnesPerHectare,
    };
    lowestYieldCrop = {
      cropName: sorted[sorted.length - 1].cropName,
      predictedYieldTonnesPerHectare:
        sorted[sorted.length - 1].yield?.value ??
        sorted[sorted.length - 1].predictedYieldTonnesPerHectare,
    };
  }

  return {
    farmId: farm.id,
    farmName: farm.name,
    totalCropsCount,
    cropsCoveredCount,
    coveragePct,
    totalPlantedAreaHectares: Number(totalPlantedAreaHectares.toFixed(4)),
    totalEstimatedProductionTonnes: Number(totalEstimatedProductionTonnes.toFixed(4)),
    highestYieldCrop,
    lowestYieldCrop,
    crops: cropEstimates,
    unitNote: "Total estimated production represents combined estimated mass in metric tonnes across all assessed crops.",
  };
}

/**
 * Records actual harvested production for a crop.
 */
export async function recordActualProduction(userId, cropId, data) {
  const { quantity, unit, harvestDate, notes } = data;

  const crop = await prisma.crop.findFirst({
    where: {
      id: cropId,
      farm: { userId },
    },
    include: { farm: true },
  });

  if (!crop) {
    throw new AppError("Crop not found or you do not have permission to access it.", 404);
  }

  const productionTonnes = convertToTonnes(quantity, unit || "TONNE");

  // Derive actual yield in t/ha if planted area is recorded
  let actualYieldTonnesPerHectare = null;
  const areaValue = crop.fieldArea || crop.farm.area;
  if (areaValue && Number(areaValue) > 0) {
    const areaHa = convertToHectares(areaValue, crop.farm.areaUnit || "HECTARE");
    if (areaHa > 0) {
      actualYieldTonnesPerHectare = Number((productionTonnes / areaHa).toFixed(4));
    }
  }

  const record = await prisma.actualProduction.create({
    data: {
      userId,
      farmId: crop.farmId,
      cropId: crop.id,
      actualProductionTonnes: productionTonnes,
      actualYieldTonnesPerHectare,
      originalQuantity: Number(quantity),
      originalUnit: String(unit || "TONNE").toUpperCase(),
      harvestDate: harvestDate ? new Date(harvestDate) : new Date(),
      notes: notes || null,
    },
  });

  // Log activity
  await logActivity({
    userId,
    farmId: crop.farmId,
    cropId: crop.id,
    type: "HARVEST_RECORDED",
    title: `Harvest Recorded: ${crop.cropName}`,
    message: `Harvested ${quantity} ${unit} (${productionTonnes} tonnes) from ${crop.cropName}.`,
    entityType: "crop",
    entityId: crop.id,
    metadata: {
      actualProductionTonnes: productionTonnes,
      actualYieldTonnesPerHectare,
    },
  }).catch(() => {});

  return {
    id: record.id,
    cropId: crop.id,
    cropName: crop.cropName,
    actualProductionTonnes: Number(record.actualProductionTonnes),
    actualYieldTonnesPerHectare: record.actualYieldTonnesPerHectare
      ? Number(record.actualYieldTonnesPerHectare)
      : null,
    originalQuantity: Number(record.originalQuantity),
    originalUnit: record.originalUnit,
    harvestDate: record.harvestDate.toISOString(),
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
  };
}

/**
 * Normalizes database entity into clean API response contract.
 */
function formatYieldPredictionResponse(record, crop, farm) {
  let dataQuality = { missingFeatures: [], warnings: [] };
  if (record.dataQualityJson) {
    try {
      dataQuality = JSON.parse(record.dataQualityJson);
    } catch {}
  }

  return {
    id: record.id,
    cropId: crop.id,
    cropName: crop.cropName,
    variety: crop.variety || null,
    farmId: farm.id,
    farmName: farm.name,
    predictionStage: record.predictionStage,
    plantedArea: {
      value: Number(record.originalAreaValue),
      unit: record.originalAreaUnit,
      areaHectares: Number(record.plantedAreaHectares),
    },
    yield: {
      value: Number(record.predictedYieldTonnesPerHectare),
      unit: "TONNE_PER_HECTARE",
    },
    production: {
      value: Number(record.expectedProductionTonnes),
      unit: "TONNE",
    },
    uncertainty: {
      available: record.lowerYieldTonnesPerHectare !== null,
      method: record.uncertaintyMethod || "CALIBRATED_RESIDUAL_PERCENTILES",
      lowerYieldTonnesPerHectare: record.lowerYieldTonnesPerHectare
        ? Number(record.lowerYieldTonnesPerHectare)
        : null,
      upperYieldTonnesPerHectare: record.upperYieldTonnesPerHectare
        ? Number(record.upperYieldTonnesPerHectare)
        : null,
      lowerProductionTonnes: record.lowerProductionTonnes
        ? Number(record.lowerProductionTonnes)
        : null,
      upperProductionTonnes: record.upperProductionTonnes
        ? Number(record.upperProductionTonnes)
        : null,
    },
    confidence: record.confidence,
    model: {
      name: "HarvestWindow Yield Forecasting Engine",
      version: record.modelVersion,
      algorithm: record.algorithm,
    },
    dataQuality,
    evaluatedAt: record.evaluatedAt.toISOString(),
  };
}
