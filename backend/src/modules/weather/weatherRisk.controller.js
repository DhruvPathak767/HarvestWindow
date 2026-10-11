import {
  getCropWeatherRisk,
  getFarmWeatherRisk,
  refreshCropWeatherRisk,
  getDashboardWeatherRisk,
} from "./weatherRisk.service.js";

/**
 * GET /api/crops/:cropId/weather-risk
 * GET /api/v1/crops/:cropId/weather-risk
 */
export async function handleGetCropWeatherRisk(req, res, next) {
  try {
    const { cropId } = req.params;
    const forceRefresh = req.query.refresh === "true" || req.query.force === "true";
    const data = await getCropWeatherRisk(req.user.id, cropId, { forceRefresh });

    return res.status(200).json({
      success: true,
      message: "Crop weather risk assessed successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/crops/:cropId/weather-risk/refresh
 * POST /api/v1/crops/:cropId/weather-risk/refresh
 */
export async function handleRefreshCropWeatherRisk(req, res, next) {
  try {
    const { cropId } = req.params;
    const data = await refreshCropWeatherRisk(req.user.id, cropId);

    return res.status(200).json({
      success: true,
      message: "Crop weather risk refreshed successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/farms/:farmId/weather-risk
 * GET /api/v1/farms/:farmId/weather-risk
 */
export async function handleGetFarmWeatherRisk(req, res, next) {
  try {
    const { farmId } = req.params;
    const forceRefresh = req.query.refresh === "true" || req.query.force === "true";
    const data = await getFarmWeatherRisk(req.user.id, farmId, { forceRefresh });

    return res.status(200).json({
      success: true,
      message: "Farm weather risk assessed successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/weather-risk
 * GET /api/v1/dashboard/weather-risk
 */
export async function handleGetDashboardWeatherRisk(req, res, next) {
  try {
    const data = await getDashboardWeatherRisk(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Dashboard weather risk summary retrieved successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}
