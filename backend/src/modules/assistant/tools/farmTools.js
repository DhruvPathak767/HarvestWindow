/**
 * Phase AI-7: Server-Controlled Farm Data Tools
 * Validated, authorized read-only tool functions for the Agricultural AI Assistant.
 * Strictly verifies userId ownership at every step to prevent cross-user data leakage.
 */

import prisma from "../../../config/prisma.js";
import { retrieveAgriculturalKnowledge } from "../knowledge/retriever.js";

/**
 * 1. Retrieve all farms owned by the authenticated user.
 */
export async function getUserFarms({ userId }) {
  if (!userId) return { error: "Authentication required." };

  const farms = await prisma.farm.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      state: true,
      district: true,
      villageOrTaluka: true,
      soilType: true,
      irrigationSource: true,
      area: true,
      areaUnit: true,
      _count: { select: { crops: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    farmsCount: farms.length,
    farms: farms.map((f) => ({
      id: f.id,
      name: f.name,
      location: `${f.district}, ${f.state}`,
      area: `${Number(f.area)} ${f.areaUnit}`,
      soilType: f.soilType || "Unrecorded",
      irrigationSource: f.irrigationSource || "Unrecorded",
      cropsPlanted: f._count.crops,
    })),
  };
}

/**
 * 2. Retrieve detailed summary of a specific farm owned by the user.
 */
export async function getFarmSummary({ userId, farmId }) {
  if (!userId || !farmId) return { error: "User ID and Farm ID are required." };

  const farm = await prisma.farm.findFirst({
    where: { id: farmId, userId },
    include: {
      crops: {
        select: {
          id: true,
          cropName: true,
          variety: true,
          sowingDate: true,
          expectedHarvestDate: true,
          growthStage: true,
          fieldArea: true,
        },
      },
    },
  });

  if (!farm) {
    return { error: `Farm '${farmId}' not found or unauthorized for this user.` };
  }

  return {
    id: farm.id,
    name: farm.name,
    location: `${farm.district}, ${farm.state}`,
    area: `${Number(farm.area)} ${farm.areaUnit}`,
    soilType: farm.soilType || "Unrecorded",
    irrigationSource: farm.irrigationSource || "Unrecorded",
    crops: farm.crops.map((c) => ({
      id: c.id,
      cropName: c.cropName,
      variety: c.variety || "Standard variety",
      growthStage: c.growthStage || "Mid Season",
      sowingDate: c.sowingDate ? c.sowingDate.toISOString().split("T")[0] : null,
      expectedHarvestDate: c.expectedHarvestDate ? c.expectedHarvestDate.toISOString().split("T")[0] : null,
    })),
  };
}

/**
 * 3. Retrieve details of a specific crop owned by the user.
 */
export async function getCropDetails({ userId, cropId }) {
  if (!userId || !cropId) return { error: "User ID and Crop ID are required." };

  const crop = await prisma.crop.findFirst({
    where: { id: cropId, farm: { userId } },
    include: {
      farm: { select: { id: true, name: true, district: true, state: true } },
    },
  });

  if (!crop) {
    return { error: `Crop '${cropId}' not found or unauthorized for this user.` };
  }

  return {
    id: crop.id,
    cropName: crop.cropName,
    variety: crop.variety || "Standard variety",
    growthStage: crop.growthStage || "Mid Season",
    sowingDate: crop.sowingDate ? crop.sowingDate.toISOString().split("T")[0] : null,
    expectedHarvestDate: crop.expectedHarvestDate ? crop.expectedHarvestDate.toISOString().split("T")[0] : null,
    fieldArea: crop.fieldArea ? Number(crop.fieldArea) : null,
    farmName: crop.farm?.name,
    farmLocation: `${crop.farm?.district}, ${crop.farm?.state}`,
  };
}

/**
 * 4. Retrieve harvest prediction and contributing factors for a crop.
 */
export async function getHarvestPrediction({ userId, cropId }) {
  if (!userId || !cropId) return { error: "User ID and Crop ID are required." };

  const crop = await prisma.crop.findFirst({
    where: { id: cropId, farm: { userId } },
    select: { id: true, cropName: true, sowingDate: true, expectedHarvestDate: true },
  });

  if (!crop) {
    return { error: `Crop '${cropId}' not found or unauthorized.` };
  }

  // Look up latest persisted harvest prediction if available
  const prediction = await prisma.harvestPrediction.findFirst({
    where: { cropId, userId },
    orderBy: { createdAt: "desc" },
  });

  if (prediction) {
    let contributingFactors = [];
    if (prediction.factorsJson) {
      try {
        contributingFactors = JSON.parse(prediction.factorsJson);
      } catch {
        contributingFactors = [];
      }
    }

    return {
      status: "available",
      cropName: crop.cropName,
      windowStart: prediction.windowStartDate ? prediction.windowStartDate.toISOString().split("T")[0] : null,
      typicalDate: prediction.typicalDate ? prediction.typicalDate.toISOString().split("T")[0] : null,
      windowEnd: prediction.windowEndDate ? prediction.windowEndDate.toISOString().split("T")[0] : null,
      confidence: prediction.confidence || "MODERATE",
      growthStage: prediction.growthStage || "Mid Season",
      contributingFactors,
      calculatedAt: prediction.createdAt.toISOString(),
    };
  }

  // Fallback to crop record if no explicit AI prediction run yet
  return {
    status: "baseline_record",
    cropName: crop.cropName,
    sowingDate: crop.sowingDate ? crop.sowingDate.toISOString().split("T")[0] : null,
    expectedHarvestDate: crop.expectedHarvestDate ? crop.expectedHarvestDate.toISOString().split("T")[0] : null,
    confidence: "PROVISIONAL",
    note: "AI harvest prediction model has not generated a refined GDD forecast yet. Using recorded target harvest date.",
  };
}

/**
 * 5. Retrieve weather risk assessment for a farm or crop.
 */
export async function getWeatherRisk({ userId, farmId, cropId }) {
  if (!userId) return { error: "User ID is required." };

  const where = { userId };
  if (cropId) where.cropId = cropId;
  else if (farmId) where.farmId = farmId;

  const assessment = await prisma.weatherAssessment.findFirst({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      farm: { select: { id: true, name: true } },
      crop: { select: { id: true, cropName: true } },
    },
  });

  if (!assessment) {
    return {
      status: "unavailable",
      message: "No current weather risk assessment found for this selection.",
    };
  }

  return {
    status: "available",
    farmName: assessment.farm?.name,
    cropName: assessment.crop?.cropName,
    overallRisk: assessment.overallRisk,
    riskScore: assessment.riskScore,
    severity: assessment.overallRisk,
    rainRisk: assessment.rainRisk,
    heatRisk: assessment.heatRisk,
    windRisk: assessment.windRisk,
    harvestWindowImpact: assessment.harvestWindowImpact,
    summary: assessment.summary,
    recommendations: assessment.recommendations,
    assessedAt: assessment.createdAt.toISOString(),
  };
}

/**
 * 6. Retrieve yield prediction and production estimate for a crop.
 */
export async function getYieldPrediction({ userId, cropId }) {
  if (!userId || !cropId) return { error: "User ID and Crop ID are required." };

  const prediction = await prisma.yieldPrediction.findFirst({
    where: { cropId, userId },
    orderBy: { createdAt: "desc" },
    include: {
      crop: { select: { id: true, cropName: true } },
      farm: { select: { id: true, name: true } },
    },
  });

  if (!prediction) {
    return {
      status: "unavailable",
      message: "No yield forecast recorded yet for this crop block.",
    };
  }

  return {
    status: "available",
    cropName: prediction.crop.cropName,
    farmName: prediction.farm.name,
    predictedYieldTonnesPerHectare: Number(prediction.predictedYieldTonnesPerHectare),
    expectedProductionTonnes: Number(prediction.expectedProductionTonnes),
    plantedAreaHectares: Number(prediction.plantedAreaHectares),
    originalArea: `${Number(prediction.originalAreaValue)} ${prediction.originalAreaUnit}`,
    lowerBoundYield: prediction.lowerYieldTonnesPerHectare ? Number(prediction.lowerYieldTonnesPerHectare) : null,
    upperBoundYield: prediction.upperYieldTonnesPerHectare ? Number(prediction.upperYieldTonnesPerHectare) : null,
    confidence: prediction.confidence,
    algorithm: prediction.algorithm,
    evaluatedAt: prediction.evaluatedAt.toISOString(),
  };
}

/**
 * 7. Retrieve crop health and computer vision disease detection results for a crop.
 */
export async function getCropHealthAnalysis({ userId, cropId, farmId }) {
  if (!userId) return { error: "User ID is required." };

  const where = { userId };
  if (cropId) where.cropId = cropId;
  else if (farmId) where.farmId = farmId;

  const analysis = await prisma.cropHealthAnalysis.findFirst({
    where,
    orderBy: { analyzedAt: "desc" },
  });

  if (!analysis) {
    return {
      status: "unavailable",
      message: "No recent crop health leaf scans or disease analyses found.",
    };
  }

  let symptoms = [];
  let recommendations = [];
  try {
    if (analysis.symptomsJson) symptoms = JSON.parse(analysis.symptomsJson);
    if (analysis.recommendationsJson) recommendations = JSON.parse(analysis.recommendationsJson);
  } catch {
    /* ignore */
  }

  return {
    status: "available",
    cropName: analysis.cropName,
    predictedClass: analysis.predictedClassName,
    conditionCategory: analysis.conditionCategory,
    confidence: Number(analysis.confidence),
    confidenceLevel: analysis.confidenceLevel,
    symptoms,
    recommendations,
    expertAdvice: analysis.expertAdvice,
    analyzedAt: analysis.analyzedAt.toISOString(),
  };
}

/**
 * 8. Retrieve recent unread notifications and alerts.
 */
export async function getRecentAlerts({ userId, limit = 5 }) {
  if (!userId) return { error: "User ID is required." };

  const alerts = await prisma.notification.findMany({
    where: { userId },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      message: true,
      severity: true,
      type: true,
      recommendedAction: true,
      isRead: true,
      createdAt: true,
    },
  });

  return {
    count: alerts.length,
    alerts: alerts.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      severity: a.severity || "info",
      type: a.type,
      recommendedAction: a.recommendedAction,
      isRead: a.isRead,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

/**
 * 9. Search agricultural knowledge base via RAG.
 */
export async function searchAgriculturalKnowledge({ query, cropName, topic }) {
  const results = await retrieveAgriculturalKnowledge({
    query,
    cropName,
    topic,
    topK: 3,
  });

  return {
    resultsCount: results.length,
    citations: results,
  };
}

/**
 * Tool Registry mapping names to execution functions.
 */
export const TOOL_REGISTRY = {
  get_user_farms: getUserFarms,
  get_farm_summary: getFarmSummary,
  getCropDetails: getCropDetails,
  get_crop_details: getCropDetails,
  get_harvest_prediction: getHarvestPrediction,
  getHarvestPrediction: getHarvestPrediction,
  get_weather_risk: getWeatherRisk,
  getWeatherRisk: getWeatherRisk,
  get_yield_prediction: getYieldPrediction,
  getYieldPrediction: getYieldPrediction,
  get_crop_health_analysis: getCropHealthAnalysis,
  getCropHealthAnalysis: getCropHealthAnalysis,
  get_recent_alerts: getRecentAlerts,
  getRecentAlerts: getRecentAlerts,
  search_agricultural_knowledge: searchAgriculturalKnowledge,
  searchAgriculturalKnowledge: searchAgriculturalKnowledge,
  getUserFarms: {
    execute: (args, ctx) => getUserFarms({ ...args, ...ctx }),
  },
};
