import {
  createHarvestPrediction,
  getPredictionHistory,
} from "./harvestPrediction.service.js";

/**
 * POST /api/harvest-predictions (or /api/v1/harvest-predictions)
 * Generates an agronomic/GDD/weather harvest window prediction and persists history.
 */
export async function handleCreateHarvestPrediction(req, res, next) {
  try {
    const result = await createHarvestPrediction(req.user.id, req.body || {});
    return res.status(200).json({
      success: result.status === "success",
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/harvest-predictions/history/:cropId
 * Retrieves prediction audit log for a specific crop.
 */
export async function handleGetPredictionHistory(req, res, next) {
  try {
    const history = await getPredictionHistory(req.user.id, req.params.cropId);
    return res.status(200).json({
      success: true,
      message: "Prediction history retrieved successfully",
      data: history,
    });
  } catch (err) {
    next(err);
  }
}
