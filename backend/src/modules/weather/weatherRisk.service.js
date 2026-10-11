import prisma from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { getWeatherForFarm } from "./weather.service.js";
import { evaluateHarvestWeatherRisk } from "./weatherRisk.engine.js";
import { saveWeatherAssessment, findLatestAssessmentForCrop } from "./weatherRisk.repository.js";

/**
 * Retrieves latest weather intelligence and harvest risk assessment for a specific crop.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} cropId - Target crop ID
 * @param {Object} [options]
 * @param {boolean} [options.forceRefresh=false]
 */
export async function getCropWeatherRisk(userId, cropId, options = {}) {
  if (!userId) throw new AppError("Authentication required.", 401);
  if (!cropId) throw new AppError("Crop ID is required.", 400);

  // 1. Load Crop and associated Farm, enforcing user ownership
  const crop = await prisma.crop.findFirst({
    where: {
      id: cropId,
      farm: {
        userId,
      },
    },
    include: {
      farm: true,
      harvestPredictions: {
        orderBy: { predictionDate: "desc" },
        take: 1,
      },
    },
  });

  if (!crop) {
    throw new AppError("Crop not found or you do not have permission to access it.", 404);
  }

  const farm = crop.farm;
  if (!farm) {
    throw new AppError("Associated farm record could not be found.", 404);
  }

  // 2. Fetch live or cached weather for farm
  const weatherRes = await getWeatherForFarm(userId, farm.id, {
    forceRefresh: Boolean(options.forceRefresh),
  });

  // Extract normalized records
  const forecastRecords = weatherRes.normalizedRecords || weatherRes.dailyForecast || [];
  const latestPrediction = crop.harvestPredictions?.[0] || null;

  // 3. Evaluate risk using the deterministic engine
  const assessment = evaluateHarvestWeatherRisk({
    crop: {
      id: crop.id,
      cropName: crop.cropName,
      variety: crop.variety,
      sowingDate: crop.sowingDate ? crop.sowingDate.toISOString().slice(0, 10) : null,
      expectedHarvestDate: crop.expectedHarvestDate ? crop.expectedHarvestDate.toISOString().slice(0, 10) : null,
      growthStage: crop.growthStage,
    },
    harvestPrediction: latestPrediction,
    forecastRecords,
    dataQuality: weatherRes.dataQuality || {},
    source: {
      provider: weatherRes.provider,
      fetchedAt: weatherRes.fetchedAt,
    },
  });

  // 4. Persist assessment snapshot in database asynchronously or safely
  try {
    await saveWeatherAssessment(userId, farm.id, crop.id, assessment);
  } catch (dbErr) {
    console.warn("[WeatherRiskService] Could not persist assessment snapshot:", dbErr.message);
  }

  return {
    ...assessment,
    farm: {
      id: farm.id,
      name: farm.name,
      district: farm.district,
      state: farm.state,
      latitude: Number(farm.latitude),
      longitude: Number(farm.longitude),
    },
  };
}

/**
 * Retrieves weather risk assessments for all crops in a specific farm.
 * Fetches weather once for the farm coordinates to avoid duplicate calls.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} farmId - Target farm ID
 * @param {Object} [options]
 */
export async function getFarmWeatherRisk(userId, farmId, options = {}) {
  if (!userId) throw new AppError("Authentication required.", 401);
  if (!farmId) throw new AppError("Farm ID is required.", 400);

  const farm = await prisma.farm.findFirst({
    where: {
      id: farmId,
      userId,
    },
    include: {
      crops: {
        include: {
          harvestPredictions: {
            orderBy: { predictionDate: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!farm) {
    throw new AppError("Farm not found or you do not have permission to access it.", 404);
  }

  // Fetch weather once for the farm location
  const weatherRes = await getWeatherForFarm(userId, farm.id, {
    forceRefresh: Boolean(options.forceRefresh),
  });

  const forecastRecords = weatherRes.normalizedRecords || weatherRes.dailyForecast || [];

  // Assess each crop on this farm
  const cropAssessments = [];
  let favorableCount = 0;
  let cautionCount = 0;
  let unfavorableCount = 0;
  let highUrgencyCount = 0;
  let criticalUrgencyCount = 0;

  for (const crop of farm.crops) {
    const latestPred = crop.harvestPredictions?.[0] || null;
    const assessment = evaluateHarvestWeatherRisk({
      crop: {
        id: crop.id,
        cropName: crop.cropName,
        variety: crop.variety,
        sowingDate: crop.sowingDate ? crop.sowingDate.toISOString().slice(0, 10) : null,
        expectedHarvestDate: crop.expectedHarvestDate ? crop.expectedHarvestDate.toISOString().slice(0, 10) : null,
        growthStage: crop.growthStage,
      },
      harvestPrediction: latestPred,
      forecastRecords,
      dataQuality: weatherRes.dataQuality || {},
      source: {
        provider: weatherRes.provider,
        fetchedAt: weatherRes.fetchedAt,
      },
    });

    if (assessment.harvestSuitability === "FAVORABLE") favorableCount++;
    else if (assessment.harvestSuitability === "CAUTION") cautionCount++;
    else if (assessment.harvestSuitability === "UNFAVORABLE") unfavorableCount++;

    if (assessment.urgency === "HIGH") highUrgencyCount++;
    else if (assessment.urgency === "CRITICAL") criticalUrgencyCount++;

    cropAssessments.push(assessment);
  }

  // Derive overall farm weather posture
  let overallFarmSuitability = "FAVORABLE";
  if (unfavorableCount > 0) overallFarmSuitability = "UNFAVORABLE";
  else if (cautionCount > 0) overallFarmSuitability = "CAUTION";
  else if (cropAssessments.length === 0) overallFarmSuitability = "INSUFFICIENT_DATA";

  return {
    farm: {
      id: farm.id,
      name: farm.name,
      district: farm.district,
      state: farm.state,
      latitude: Number(farm.latitude),
      longitude: Number(farm.longitude),
    },
    summary: {
      totalCropsAssessed: cropAssessments.length,
      favorableCount,
      cautionCount,
      unfavorableCount,
      highUrgencyCount,
      criticalUrgencyCount,
      overallFarmSuitability,
    },
    crops: cropAssessments,
    weather: {
      current: weatherRes.current,
      dailyForecast: weatherRes.dailyForecast,
      provider: weatherRes.provider,
      fetchedAt: weatherRes.fetchedAt,
    },
  };
}

/**
 * Explicitly triggers a fresh weather risk assessment for a crop.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} cropId - Target crop ID
 */
export async function refreshCropWeatherRisk(userId, cropId) {
  return await getCropWeatherRisk(userId, cropId, { forceRefresh: true });
}

/**
 * Aggregates weather intelligence and harvest risk metrics across all user crops for the dashboard.
 *
 * @param {string} userId - Authenticated user ID
 */
export async function getDashboardWeatherRisk(userId) {
  if (!userId) throw new AppError("Authentication required.", 401);

  const farms = await prisma.farm.findMany({
    where: { userId },
    include: {
      crops: {
        include: {
          harvestPredictions: {
            orderBy: { predictionDate: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  let totalCropsAssessed = 0;
  let favorableCount = 0;
  let cautionCount = 0;
  let unfavorableCount = 0;
  let criticalCount = 0;
  let highUrgencyCount = 0;

  const urgentCrops = [];
  const upcomingAdverseEvents = [];
  const harvestOpportunities = [];

  for (const farm of farms) {
    if (!farm.latitude || !farm.longitude) continue;

    let weatherRes;
    try {
      weatherRes = await getWeatherForFarm(userId, farm.id, { forceRefresh: false });
    } catch {
      continue;
    }

    const forecastRecords = weatherRes.normalizedRecords || weatherRes.dailyForecast || [];

    for (const crop of farm.crops) {
      totalCropsAssessed++;
      const latestPred = crop.harvestPredictions?.[0] || null;

      const assessment = evaluateHarvestWeatherRisk({
        crop: {
          id: crop.id,
          cropName: crop.cropName,
          variety: crop.variety,
          sowingDate: crop.sowingDate ? crop.sowingDate.toISOString().slice(0, 10) : null,
          expectedHarvestDate: crop.expectedHarvestDate ? crop.expectedHarvestDate.toISOString().slice(0, 10) : null,
          growthStage: crop.growthStage,
        },
        harvestPrediction: latestPred,
        forecastRecords,
        dataQuality: weatherRes.dataQuality || {},
        source: {
          provider: weatherRes.provider,
          fetchedAt: weatherRes.fetchedAt,
        },
      });

      if (assessment.harvestSuitability === "FAVORABLE") favorableCount++;
      else if (assessment.harvestSuitability === "CAUTION") cautionCount++;
      else if (assessment.harvestSuitability === "UNFAVORABLE") unfavorableCount++;

      if (assessment.urgency === "CRITICAL") {
        criticalCount++;
        urgentCrops.push({
          cropId: crop.id,
          cropName: crop.cropName,
          farmName: farm.name,
          urgency: "CRITICAL",
          suitability: assessment.harvestSuitability,
          overallScore: assessment.overallRiskScore,
          primaryRisk: assessment.risks[0]?.category || "WEATHER",
          recommendedAction: assessment.recommendations[0] || null,
        });
      } else if (assessment.urgency === "HIGH") {
        highUrgencyCount++;
        urgentCrops.push({
          cropId: crop.id,
          cropName: crop.cropName,
          farmName: farm.name,
          urgency: "HIGH",
          suitability: assessment.harvestSuitability,
          overallScore: assessment.overallRiskScore,
          primaryRisk: assessment.risks[0]?.category || "WEATHER",
          recommendedAction: assessment.recommendations[0] || null,
        });
      }

      if (assessment.harvestSuitability === "FAVORABLE" && assessment.harvestWindow) {
        harvestOpportunities.push({
          cropId: crop.id,
          cropName: crop.cropName,
          farmName: farm.name,
          windowStart: assessment.harvestWindow.start,
          windowEnd: assessment.harvestWindow.end,
          score: assessment.overallRiskScore,
        });
      }

      // Collect distinct adverse events
      for (const r of assessment.risks) {
        if (r.severity === "HIGH" || r.severity === "CRITICAL") {
          upcomingAdverseEvents.push({
            farmName: farm.name,
            cropName: crop.cropName,
            category: r.category,
            severity: r.severity,
            eventStart: r.eventStart,
            eventEnd: r.eventEnd,
            message: r.explanation[0] || "Adverse weather event expected",
          });
        }
      }
    }
  }

  return {
    summary: {
      totalCropsAssessed,
      favorableCount,
      cautionCount,
      unfavorableCount,
      criticalCount,
      highUrgencyCount,
      assessedAt: new Date().toISOString(),
    },
    urgentCrops: urgentCrops.slice(0, 10),
    upcomingAdverseEvents: upcomingAdverseEvents.slice(0, 10),
    harvestOpportunities: harvestOpportunities.slice(0, 10),
  };
}
