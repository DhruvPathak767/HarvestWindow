import prisma from "../../config/prisma.js";
import { predictHarvestWindow } from "../forecasts/predictionEngine.js";
import { getWeatherForFarm } from "../weather/weather.service.js";
import { buildWeatherContext } from "../forecasts/weatherContext.js";
import { getDashboardWeatherRisk } from "../weather/weatherRisk.service.js";

/**
 * Retrieves consolidated dashboard data for the authenticated user.
 *
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<Object>} Consolidated agricultural dashboard
 */
export async function getDashboardData(userId) {
  // 1. Fetch user's farms with area and coordinates
  const farms = await prisma.farm.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      district: true,
      state: true,
      area: true,
      areaUnit: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Fetch all user's crops with associated farm details
  const crops = await prisma.crop.findMany({
    where: {
      farm: {
        userId,
      },
    },
    include: {
      farm: {
        select: {
          id: true,
          name: true,
          district: true,
          state: true,
          latitude: true,
          longitude: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. Retrieve weather context efficiently (batch per unique farm)
  const uniqueFarmMap = new Map();
  for (const f of farms) {
    uniqueFarmMap.set(f.id, f);
  }

  const weatherContexts = new Map();
  await Promise.all(
    Array.from(uniqueFarmMap.values()).map(async (farm) => {
      const lat = farm.latitude !== null && farm.latitude !== undefined ? Number(farm.latitude) : null;
      const lon = farm.longitude !== null && farm.longitude !== undefined ? Number(farm.longitude) : null;

      if (lat === null || lon === null || Number.isNaN(lat) || Number.isNaN(lon)) {
        weatherContexts.set(farm.id, buildWeatherContext({ farm }));
        return;
      }

      try {
        const rawWeather = await getWeatherForFarm(userId, farm.id, { forceRefresh: false });
        weatherContexts.set(farm.id, buildWeatherContext(rawWeather));
      } catch (err) {
        weatherContexts.set(farm.id, buildWeatherContext({ farm, error: err.message }));
      }
    })
  );

  // 4. Compute predictions for all crops using the Phase 5 prediction engine
  const now = new Date();
  const predictions = crops.map((crop) => {
    const forecast = predictHarvestWindow({
      crop: {
        ...crop,
        sowingDate: crop.sowingDate ? crop.sowingDate.toISOString().slice(0, 10) : null,
        expectedHarvestDate: crop.expectedHarvestDate
          ? crop.expectedHarvestDate.toISOString().slice(0, 10)
          : null,
      },
      referenceDate: now,
      weatherContext: crop.farmId ? weatherContexts.get(crop.farmId) : null,
    });

    return {
      crop,
      forecast,
    };
  });

  // 5. Calculate Overview Statistics
  let totalTrackedArea = 0;
  for (const farm of farms) {
    const numArea = Number(farm.area);
    if (!Number.isNaN(numArea) && numArea > 0) {
      totalTrackedArea += numArea;
    }
  }

  let totalActiveCrops = 0;
  let approachingHarvest = 0;
  let readyForHarvest = 0;
  let overdueHarvests = 0;

  for (const { crop, forecast } of predictions) {
    const isHarvested = (crop.growthStage || "").toUpperCase().trim() === "HARVESTED";
    if (!isHarvested) {
      totalActiveCrops += 1;
    }

    if (forecast.readinessStatus === "approaching") {
      approachingHarvest += 1;
    } else if (forecast.readinessStatus === "in-window") {
      readyForHarvest += 1;
    } else if (forecast.readinessStatus === "passed" && !isHarvested) {
      overdueHarvests += 1;
    }
  }

  // 6. Crop Status Distribution
  // Grouping by biological growth stage
  const stageCounts = {};
  for (const crop of crops) {
    const rawStage = (crop.growthStage || "Unspecified").trim();
    const stageKey = rawStage.charAt(0).toUpperCase() + rawStage.slice(1).toLowerCase();
    stageCounts[stageKey] = (stageCounts[stageKey] || 0) + 1;
  }
  const cropStageDistribution = Object.entries(stageCounts).map(([stage, count]) => ({
    stage,
    count,
  }));

  // Grouping by readiness category
  const readinessCounts = {
    growing: 0,
    approaching: 0,
    "in-window": 0,
    passed: 0,
  };
  for (const { forecast } of predictions) {
    if (forecast.readinessStatus && readinessCounts[forecast.readinessStatus] !== undefined) {
      readinessCounts[forecast.readinessStatus] += 1;
    }
  }

  const readinessDistribution = [
    { status: "growing", label: "Developing", count: readinessCounts.growing },
    { status: "approaching", label: "Approaching", count: readinessCounts.approaching },
    { status: "in-window", label: "Ready (In Window)", count: readinessCounts["in-window"] },
    { status: "passed", label: "Harvest Window Passed", count: readinessCounts.passed },
  ];

  // 7. Upcoming Harvest Opportunities
  // Filter active crops and sort chronologically by days to window start
  const upcomingHarvests = predictions
    .filter(({ crop, forecast }) => {
      const isHarvested = (crop.growthStage || "").toUpperCase().trim() === "HARVESTED";
      return !isHarvested && forecast.harvestWindow.startDate !== null;
    })
    .sort((a, b) => {
      // Sort priority: in-window first, then approaching, then earliest window start
      const aStart = a.forecast.daysToWindowStart;
      const bStart = b.forecast.daysToWindowStart;
      return aStart - bStart;
    })
    .map(({ crop, forecast }) => ({
      cropId: crop.id,
      cropName: crop.cropName,
      variety: crop.variety || null,
      farmId: crop.farm.id,
      farmName: crop.farm.name,
      district: crop.farm.district,
      sowingDate: crop.sowingDate ? crop.sowingDate.toISOString().slice(0, 10) : null,
      harvestWindow: forecast.harvestWindow,
      baselineHarvestWindow: forecast.baselineHarvestWindow,
      adjustedHarvestWindow: forecast.adjustedHarvestWindow,
      readinessStatus: forecast.readinessStatus,
      readinessLevel: forecast.readinessLevel,
      confidenceScore: forecast.confidence.score,
      confidenceLevel: forecast.confidence.level,
      daysToWindowStart: forecast.daysToWindowStart,
      daysToWindowEnd: forecast.daysToWindowEnd,
      daysUntilHarvest: forecast.daysUntilHarvest,
      weatherAdjustmentStatus: forecast.weatherAdjustmentStatus,
      weatherAdjustmentApplied: forecast.weatherAdjustmentApplied,
      weatherAdjustmentDays: forecast.weatherAdjustmentDays || 0,
    }));

  // 8. Recent Agricultural Activity Events
  const recentActivity = [];
  for (const crop of crops.slice(0, 5)) {
    recentActivity.push({
      id: `act-crop-${crop.id}`,
      type: "crop-added",
      message: `${crop.cropName}${crop.variety ? ` (${crop.variety})` : ""} planted on ${crop.farm.name}`,
      at: crop.createdAt.toISOString(),
      timestamp: crop.createdAt.toISOString(),
      farmId: crop.farmId,
      cropId: crop.id,
    });
  }
  for (const farm of farms.slice(0, 3)) {
    recentActivity.push({
      id: `act-farm-${farm.id}`,
      type: "farm-added",
      message: `${farm.name} registered in ${farm.district}, ${farm.state}`,
      at: farm.createdAt.toISOString(),
      timestamp: farm.createdAt.toISOString(),
      farmId: farm.id,
      cropId: null,
    });
  }
  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 9. Forecast Summary
  let weatherAdjustedCount = 0;
  let baselineOnlyCount = 0;
  for (const { forecast } of predictions) {
    if (forecast.weatherAdjustmentApplied) {
      weatherAdjustedCount += 1;
    } else {
      baselineOnlyCount += 1;
    }
  }

  const nextUpcomingDate = upcomingHarvests.length > 0 ? upcomingHarvests[0].harvestWindow.startDate : null;

  let weatherRiskSummary = null;
  try {
    weatherRiskSummary = await getDashboardWeatherRisk(userId);
  } catch (err) {
    console.warn("[DashboardService] Could not compute weatherRiskSummary:", err.message);
  }

  return {
    overview: {
      totalFarms: farms.length,
      totalTrackedArea: Number(totalTrackedArea.toFixed(2)),
      totalActiveCrops,
      approachingHarvest,
      readyForHarvest,
      overdueHarvests,
    },
    cropStatusDistribution: cropStageDistribution,
    readinessDistribution,
    upcomingHarvests: upcomingHarvests.slice(0, 8),
    recentActivity: recentActivity.slice(0, 6),
    forecastSummary: {
      totalForecasts: predictions.length,
      weatherAdjustedCount,
      baselineOnlyCount,
      nextUpcomingDate,
    },
    weatherRiskSummary,
  };
}
