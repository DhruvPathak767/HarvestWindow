import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  listForecastsQuerySchema,
  refreshForecastsSchema,
  cropIdParamSchema,
} from "./forecasts.validation.js";
import {
  handleListForecasts,
  handleRefreshForecasts,
  handleGetForecast,
} from "./forecasts.controller.js";
import { handleCreateHarvestPrediction } from "./harvestPrediction.controller.js";

const router = Router();

// Enforce authentication across all forecast endpoints
router.use(authenticate);

// A. Retrieve all forecasts (GET /api/forecasts)
router.get("/", validate(listForecastsQuerySchema, "query"), handleListForecasts);

// B. Refresh forecasts (POST /api/forecasts/refresh) - registered before dynamic :cropId
router.post("/refresh", validate(refreshForecastsSchema, "body"), handleRefreshForecasts);

// C. Predict harvest window (POST /api/forecasts/predict)
router.post("/predict", handleCreateHarvestPrediction);

// D. Retrieve single forecast by crop ID (GET /api/forecasts/:cropId)
router.get("/:cropId", validate(cropIdParamSchema, "params"), handleGetForecast);

export default router;
