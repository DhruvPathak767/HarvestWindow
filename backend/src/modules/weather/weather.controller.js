import {
  getWeatherForFarm,
  getWeatherForCoordinates,
} from "./weather.service.js";

/**
 * GET /api/v1/weather/:farmId
 * GET /api/weather/:farmId
 *
 * Retrieves current conditions, 10-day forecast, and agricultural warnings for a farm.
 */
export async function handleGetFarmWeather(req, res, next) {
  try {
    const { farmId } = req.params;
    const forceRefresh = req.query.refresh === "true" || req.query.force === "true";
    const data = await getWeatherForFarm(req.user.id, farmId, { forceRefresh });

    return res.status(200).json({
      success: true,
      message: "Farm weather retrieved successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/weather/current?latitude=...&longitude=...
 * GET /api/weather/current?latitude=...&longitude=...
 *
 * Retrieves standalone live location weather without persisting to a farm.
 */
export async function handleGetCurrentLocationWeather(req, res, next) {
  try {
    const { latitude, longitude } = req.query;
    const data = await getWeatherForCoordinates(latitude, longitude);

    return res.status(200).json({
      success: true,
      message: "Current location weather retrieved successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}
