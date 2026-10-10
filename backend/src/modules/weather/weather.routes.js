import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  farmWeatherParamSchema,
  coordinatesQuerySchema,
} from "./weather.validation.js";
import {
  handleGetFarmWeather,
  handleGetCurrentLocationWeather,
} from "./weather.controller.js";

const router = Router();

// A. Standalone Live Location Weather (unauthenticated or authenticated)
// Must be registered before /:farmId to prevent route parameter collision
router.get(
  "/current",
  validate(coordinatesQuerySchema, "query"),
  handleGetCurrentLocationWeather
);

// B. Farm-Specific Weather & Forecast (Strictly authenticated & authorized)
router.get(
  "/:farmId",
  authenticate,
  validate(farmWeatherParamSchema, "params"),
  handleGetFarmWeather
);

export default router;
