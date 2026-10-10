import {
  getForecasts,
  getForecastByCropId,
  refreshForecasts,
} from "./forecasts.service.js";

/**
 * GET /api/forecasts
 * Retrieves all harvest predictions for crops accessible to the authenticated user.
 */
export async function handleListForecasts(req, res, next) {
  try {
    const result = await getForecasts(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      message: "Harvest forecasts retrieved successfully",
      data: {
        forecasts: result.forecasts,
        total: result.total,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/forecasts/:cropId
 * Retrieves harvest forecast for a specific crop by ID.
 */
export async function handleGetForecast(req, res, next) {
  try {
    const forecast = await getForecastByCropId(req.user.id, req.params.cropId);
    return res.status(200).json({
      success: true,
      message: "Harvest forecast retrieved successfully",
      data: forecast,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/forecasts/refresh
 * Recalculates and refreshes forecasts for an optional scope (farm, crop, or all).
 */
export async function handleRefreshForecasts(req, res, next) {
  try {
    const result = await refreshForecasts(req.user.id, req.body || {});
    return res.status(200).json({
      success: true,
      message: "Forecast refresh completed",
      data: {
        processed: result.processed,
        updated: result.updated,
        failed: result.failed,
        forecasts: result.forecasts,
      },
    });
  } catch (err) {
    next(err);
  }
}
