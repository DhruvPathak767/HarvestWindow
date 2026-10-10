import prisma from "../../config/prisma.js";
import { config } from "../../config/env.js";
import { AppError } from "../../middleware/errorHandler.js";
import { predictHarvestWindow } from "./predictionEngine.js";
import { buildWeatherContext } from "./weatherContext.js";
import { getWeatherForFarm } from "../weather/weather.service.js";
import { logActivity } from "../activity/activity.service.js";

const AI_SERVICE_URL = config.HARVEST_AI_SERVICE_URL || "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 6000;

/**
 * Executes a prediction via the Python FastAPI service with timeout and resilient fallback.
 *
 * @param {Object} aiPayload
 * @returns {Promise<Object>}
 */
async function callPythonAiService(aiPayload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${AI_SERVICE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`AI service returned HTTP ${res.status}: ${errText}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Main prediction handler for POST /api/harvest-predictions.
 * Resolves farm & crop, checks ownership, executes prediction, and persists history.
 *
 * @param {string} userId - Authenticated user ID
 * @param {Object} input - Prediction parameters
 * @returns {Promise<Object>}
 */
export async function createHarvestPrediction(userId, input) {
  const { cropId, farmId, sowingDate, referenceDate, variety, observedGrowthStage } = input;

  if (!cropId && !farmId) {
    throw new AppError("Either cropId or farmId must be provided for harvest window prediction.", 400);
  }

  let crop = null;
  let farm = null;

  if (cropId) {
    crop = await prisma.crop.findFirst({
      where: {
        id: cropId,
        farm: {
          userId,
        },
      },
      include: {
        farm: true,
      },
    });

    if (!crop) {
      throw new AppError("Crop not found or you do not have permission to access it.", 404);
    }
    farm = crop.farm;
  } else if (farmId) {
    farm = await prisma.farm.findFirst({
      where: {
        id: farmId,
        userId,
      },
    });

    if (!farm) {
      throw new AppError("Farm not found or you do not have permission to access it.", 404);
    }
  }

  const effectiveCropName = crop ? crop.cropName : input.cropName;
  const effectiveVariety = variety || (crop ? crop.variety : null);
  const effectiveSowingDate = sowingDate || (crop && crop.sowingDate ? crop.sowingDate.toISOString().slice(0, 10) : null);
  const effectiveRefDate = referenceDate || new Date().toISOString().slice(0, 10);

  if (!effectiveCropName) {
    throw new AppError("Crop name is required for prediction.", 400);
  }

  if (!effectiveSowingDate) {
    return {
      status: "insufficient_data",
      message: `Sowing date is required to establish an active harvest window for ${effectiveCropName}. Please provide or record the crop's sowing date.`,
      prediction: null,
      missing_inputs: ["sowing_date"],
    };
  }

  const aiPayload = {
    crop_name: effectiveCropName,
    variety: effectiveVariety || undefined,
    sowing_date: effectiveSowingDate,
    farm_id: farm ? farm.id : undefined,
    crop_id: crop ? crop.id : undefined,
    state: farm ? farm.state : undefined,
    district: farm ? farm.district : undefined,
    latitude: farm && farm.latitude ? Number(farm.latitude) : undefined,
    longitude: farm && farm.longitude ? Number(farm.longitude) : undefined,
    observed_growth_stage: observedGrowthStage || (crop ? crop.growthStage : undefined),
    reference_date: effectiveRefDate,
  };

  let aiResult = null;
  let usedFallback = false;

  try {
    aiResult = await callPythonAiService(aiPayload);
  } catch (aiErr) {
    console.warn(`[HarvestPrediction] Python AI service unavailable (${aiErr.message}), using internal Node fallback engine.`);
    usedFallback = true;
  }

  // If AI service failed, execute internal Node prediction engine fallback
  if (usedFallback || !aiResult || aiResult.status !== "success") {
    if (aiResult && aiResult.status === "insufficient_data") {
      return aiResult;
    }

    // Build Node fallback
    let weatherCtx = null;
    if (farm && farm.latitude && farm.longitude) {
      try {
        const rawW = await getWeatherForFarm(userId, farm.id, { forceRefresh: false });
        weatherCtx = buildWeatherContext(rawW);
      } catch (e) {
        weatherCtx = buildWeatherContext({ farm, error: e.message });
      }
    }

    const fallbackPred = predictHarvestWindow({
      crop: {
        id: crop ? crop.id : "manual-query",
        cropName: effectiveCropName,
        variety: effectiveVariety,
        sowingDate: effectiveSowingDate,
        expectedHarvestDate: crop && crop.expectedHarvestDate ? crop.expectedHarvestDate.toISOString().slice(0, 10) : null,
        farmId: farm ? farm.id : "unknown",
      },
      referenceDate: new Date(effectiveRefDate),
      weatherContext: weatherCtx,
    });

    aiResult = {
      status: "success",
      prediction: {
        estimated_harvest_start: fallbackPred.harvestWindow.startDate,
        most_likely_harvest_date: fallbackPred.harvestWindow.optimalHarvestDate || fallbackPred.harvestWindow.startDate,
        estimated_harvest_end: fallbackPred.harvestWindow.endDate,
        days_until_harvest: fallbackPred.daysUntilHarvest,
        is_past_due: fallbackPred.isPastDue || false,
        prediction_method: "agronomic_baseline_fallback",
        model_version: "2.0.0-node-fallback",
        crop_name: effectiveCropName,
        variety: effectiveVariety,
        sowing_date: effectiveSowingDate,
        uncertainty: {
          type: "duration_range",
          lower_date: fallbackPred.harvestWindow.startDate,
          upper_date: fallbackPred.harvestWindow.endDate,
          range_days: fallbackPred.harvestWindow.windowDurationDays,
        },
        data_quality: {
          crop_profile_available: true,
          sowing_date_available: true,
          weather_data_available: weatherCtx ? weatherCtx.available : false,
          verified_gdd_available: false,
          historical_observations_count: 0,
          forecast_days_included: 0,
          missing_weather_days: 0,
        },
        gdd_metrics: null,
        weather_adjustment_days: fallbackPred.weatherAdjustmentDays || 0,
        explanation: fallbackPred.factors.map((f) => ({
          factor: f.code || "agronomic_baseline",
          impact: f.impact || "baseline",
          description: f.description,
        })),
        assumptions_and_limitations: [
          "Estimated via verified agricultural duration benchmarks.",
          "Python AI service was temporarily unreachable; Node agronomic fallback engine was utilized.",
        ],
        calculated_at: new Date().toISOString(),
      },
    };
  }

  // Persist prediction history to MySQL via Prisma if crop and farm exist
  if (crop && farm && aiResult.prediction) {
    const p = aiResult.prediction;
    try {
      await prisma.harvestPrediction.create({
        data: {
          userId,
          farmId: farm.id,
          cropId: crop.id,
          predictionDate: new Date(),
          estimatedHarvestStart: p.estimated_harvest_start ? new Date(p.estimated_harvest_start) : null,
          mostLikelyHarvestDate: new Date(p.most_likely_harvest_date),
          estimatedHarvestEnd: p.estimated_harvest_end ? new Date(p.estimated_harvest_end) : null,
          daysUntilHarvest: p.days_until_harvest || 0,
          isPastDue: p.is_past_due || false,
          predictionMethod: p.prediction_method,
          modelVersion: p.model_version,
          uncertaintyType: p.uncertainty ? p.uncertainty.type : null,
          uncertaintySpanDays: p.uncertainty ? p.uncertainty.range_days : null,
          baseTemperatureC: p.gdd_metrics ? p.gdd_metrics.base_temperature_c : null,
          accumulatedGdd: p.gdd_metrics ? p.gdd_metrics.accumulated_gdd : null,
          requiredGdd: p.gdd_metrics ? p.gdd_metrics.required_maturity_gdd : null,
          gddProgressPct: p.gdd_metrics ? p.gdd_metrics.progress_percentage : null,
          weatherAdjustDays: p.weather_adjustment_days || 0,
          weatherAvailable: p.data_quality ? p.data_quality.weather_data_available : false,
          dataQualityJson: JSON.stringify(p.data_quality),
          explanationJson: JSON.stringify(p.explanation),
          assumptionsJson: JSON.stringify(p.assumptions_and_limitations),
          inputSnapshotJson: JSON.stringify(aiPayload),
        },
      });

      // Update crop expectedHarvestDate if present
      if (p.most_likely_harvest_date) {
        await prisma.crop.update({
          where: { id: crop.id },
          data: { expectedHarvestDate: new Date(p.most_likely_harvest_date) },
        }).catch(() => null);
      }

      // Log activity
      await logActivity({
        userId,
        type: "forecast-refreshed",
        title: "Harvest prediction calculated",
        message: `Calculated ${p.prediction_method} harvest window for ${effectiveCropName} (${p.most_likely_harvest_date})`,
        entityType: "forecast",
        farmId: farm.id,
        cropId: crop.id,
      }).catch(() => null);
    } catch (dbErr) {
      console.warn("[HarvestPrediction] Could not save prediction record:", dbErr.message);
    }
  }

  return aiResult;
}

/**
 * Retrieves prediction history for a given crop.
 *
 * @param {string} userId
 * @param {string} cropId
 * @returns {Promise<Array>}
 */
export async function getPredictionHistory(userId, cropId) {
  const crop = await prisma.crop.findFirst({
    where: {
      id: cropId,
      farm: {
        userId,
      },
    },
  });

  if (!crop) {
    throw new AppError("Crop not found or unauthorized", 404);
  }

  const records = await prisma.harvestPrediction.findMany({
    where: {
      cropId,
      userId,
    },
    orderBy: {
      predictionDate: "desc",
    },
    take: 20,
  });

  return records.map((r) => ({
    id: r.id,
    predictionDate: r.predictionDate.toISOString(),
    estimatedHarvestStart: r.estimatedHarvestStart ? r.estimatedHarvestStart.toISOString().slice(0, 10) : null,
    mostLikelyHarvestDate: r.mostLikelyHarvestDate.toISOString().slice(0, 10),
    estimatedHarvestEnd: r.estimatedHarvestEnd ? r.estimatedHarvestEnd.toISOString().slice(0, 10) : null,
    daysUntilHarvest: r.daysUntilHarvest,
    isPastDue: r.isPastDue,
    predictionMethod: r.predictionMethod,
    modelVersion: r.modelVersion,
    weatherAdjustmentDays: r.weatherAdjustDays,
    weatherAvailable: r.weatherAvailable,
    gddMetrics: r.accumulatedGdd !== null ? {
      baseTemperatureC: Number(r.baseTemperatureC),
      accumulatedGdd: Number(r.accumulatedGdd),
      requiredGdd: Number(r.requiredGdd),
      progressPct: Number(r.gddProgressPct),
    } : null,
    dataQuality: r.dataQualityJson ? JSON.parse(r.dataQualityJson) : null,
    explanation: r.explanationJson ? JSON.parse(r.explanationJson) : [],
    assumptions: r.assumptionsJson ? JSON.parse(r.assumptionsJson) : [],
  }));
}
