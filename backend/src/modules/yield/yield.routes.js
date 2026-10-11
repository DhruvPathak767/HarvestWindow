/**
 * Express Routes for Yield Forecasting & Production Estimation (Phase AI-5).
 */
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  predictCropYieldHandler,
  estimateCropProductionHandler,
  getLatestCropYieldHandler,
  refreshCropYieldHandler,
  getFarmProductionEstimatesHandler,
  recordActualProductionHandler,
} from "./yield.controller.js";

const router = Router();

// Protect all yield routes with authentication
router.use(authenticate);

// Crop-level yield predictions & production estimates
router.post("/crops/:cropId/yield-prediction", predictCropYieldHandler);
router.post("/crops/:cropId/production-estimate", estimateCropProductionHandler);
router.get("/crops/:cropId/yield-prediction", getLatestCropYieldHandler);
router.post("/crops/:cropId/yield-prediction/refresh", refreshCropYieldHandler);
router.post("/crops/:cropId/actual-production", recordActualProductionHandler);

// Farm-level production estimates
router.get("/farms/:farmId/production-estimates", getFarmProductionEstimatesHandler);

export default router;
