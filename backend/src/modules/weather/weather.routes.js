import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  farmWeatherParamSchema,
  coordinatesQuerySchema,
} from "./weather.validation.js";
import { cropIdParamSchema } from "../crops/crops.validation.js";
import {
  handleGetFarmWeather,
  handleGetCurrentLocationWeather,
} from "./weather.controller.js";
import {
  handleGetCropWeatherRisk,
  handleRefreshCropWeatherRisk,
  handleGetFarmWeatherRisk,
  handleGetDashboardWeatherRisk,
} from "./weatherRisk.controller.js";

const router = Router();

// A. Standalone Live Location Weather (unauthenticated or authenticated)
router.get(
  "/current",
  validate(coordinatesQuerySchema, "query"),
  handleGetCurrentLocationWeather
);

// B. Phase AI-3 Weather Risk Endpoints & Aliases (mounted before /:farmId)
router.get(
  "/crops/:cropId/risk",
  authenticate,
  validate(cropIdParamSchema, "params"),
  handleGetCropWeatherRisk
);

router.post(
  "/crops/:cropId/risk/refresh",
  authenticate,
  validate(cropIdParamSchema, "params"),
  handleRefreshCropWeatherRisk
);

router.get(
  "/farms/:farmId/risk",
  authenticate,
  validate(farmWeatherParamSchema, "params"),
  handleGetFarmWeatherRisk
);

router.get(
  "/dashboard/risk",
  authenticate,
  handleGetDashboardWeatherRisk
);

// C. Farm-Specific Weather & Forecast (Strictly authenticated & authorized)
router.get(
  "/:farmId",
  authenticate,
  validate(farmWeatherParamSchema, "params"),
  handleGetFarmWeather
);

export default router;
