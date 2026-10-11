/**
 * Express Controller for Yield Forecasting and Production Estimation (Phase AI-5).
 */
import {
  predictCropYield,
  getLatestCropYield,
  getFarmProductionEstimates,
  recordActualProduction,
} from "./yield.service.js";
import { estimateTotalProduction } from "./productionEstimator.service.js";
import { AppError } from "../../middleware/errorHandler.js";

/**
 * POST /api/crops/:cropId/yield-prediction
 */
export async function predictCropYieldHandler(req, res, next) {
  try {
    const { cropId } = req.params;
    const userId = req.user.id;
    const overrides = req.body || {};

    const result = await predictCropYield(userId, cropId, overrides);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/crops/:cropId/production-estimate
 */
export async function estimateCropProductionHandler(req, res, next) {
  try {
    const { cropId } = req.params;
    const userId = req.user.id;
    const { areaValue, areaUnit, customYieldTonnesPerHectare } = req.body || {};

    if (!areaValue || Number(areaValue) <= 0) {
      throw new AppError("areaValue must be a strictly positive number.", 422);
    }

    let yieldValue = customYieldTonnesPerHectare;
    let lowerYield = null;
    let upperYield = null;

    if (!yieldValue) {
      const latest = await getLatestCropYield(userId, cropId);
      yieldValue = latest.yield.value;
      lowerYield = latest.uncertainty?.lowerYieldTonnesPerHectare || null;
      upperYield = latest.uncertainty?.upperYieldTonnesPerHectare || null;
    }

    const estimate = estimateTotalProduction({
      yieldTonnesPerHectare: yieldValue,
      areaValue,
      areaUnit: areaUnit || "HECTARE",
      lowerYield,
      upperYield,
    });

    res.status(200).json({
      success: true,
      data: {
        cropId,
        ...estimate,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/crops/:cropId/yield-prediction
 */
export async function getLatestCropYieldHandler(req, res, next) {
  try {
    const { cropId } = req.params;
    const userId = req.user.id;

    const result = await getLatestCropYield(userId, cropId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/crops/:cropId/yield-prediction/refresh
 */
export async function refreshCropYieldHandler(req, res, next) {
  try {
    const { cropId } = req.params;
    const userId = req.user.id;
    const overrides = req.body || {};

    const result = await predictCropYield(userId, cropId, overrides);
    res.status(200).json({
      success: true,
      message: "Yield prediction refreshed successfully.",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/farms/:farmId/production-estimates
 */
export async function getFarmProductionEstimatesHandler(req, res, next) {
  try {
    const { farmId } = req.params;
    const userId = req.user.id;

    const summary = await getFarmProductionEstimates(userId, farmId);
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/crops/:cropId/actual-production
 */
export async function recordActualProductionHandler(req, res, next) {
  try {
    const { cropId } = req.params;
    const userId = req.user.id;
    const { quantity, unit, harvestDate, notes } = req.body || {};

    if (!quantity || Number(quantity) <= 0) {
      throw new AppError("Harvested quantity must be a positive number.", 422);
    }

    const record = await recordActualProduction(userId, cropId, {
      quantity,
      unit: unit || "TONNE",
      harvestDate,
      notes,
    });

    res.status(201).json({
      success: true,
      message: "Actual harvest production recorded successfully.",
      data: record,
    });
  } catch (err) {
    next(err);
  }
}
