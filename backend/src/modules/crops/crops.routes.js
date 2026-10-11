import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  cropIdParamSchema,
  listCropsQuerySchema,
  createCropSchema,
  updateCropSchema,
} from "./crops.validation.js";
import {
  handleListCrops,
  handleGetCrop,
  handleCreateCrop,
  handleUpdateCrop,
  handleDeleteCrop,
} from "./crops.controller.js";
import {
  handleGetCropWeatherRisk,
  handleRefreshCropWeatherRisk,
} from "../weather/weatherRisk.controller.js";
import {
  predictCropYieldHandler,
  estimateCropProductionHandler,
  getLatestCropYieldHandler,
  refreshCropYieldHandler,
  recordActualProductionHandler,
} from "../yield/yield.controller.js";

const router = Router();

// Enforce authentication across all crop routes
router.use(authenticate);

// A. List crops (supports filtering by farmId, cropName, variety, growthStage)
router.get("/", validate(listCropsQuerySchema, "query"), handleListCrops);

// B. Create a crop
router.post("/", validate(createCropSchema, "body"), handleCreateCrop);

// C. Retrieve one crop
router.get("/:cropId", validate(cropIdParamSchema, "params"), handleGetCrop);

// Phase AI-3 Weather Intelligence & Harvest Risk
router.get(
  "/:cropId/weather-risk",
  validate(cropIdParamSchema, "params"),
  handleGetCropWeatherRisk
);

router.post(
  "/:cropId/weather-risk/refresh",
  validate(cropIdParamSchema, "params"),
  handleRefreshCropWeatherRisk
);

// Phase AI-5 Yield Forecasting & Production Estimation Engine
router.post(
  "/:cropId/yield-prediction",
  validate(cropIdParamSchema, "params"),
  predictCropYieldHandler
);

router.get(
  "/:cropId/yield-prediction",
  validate(cropIdParamSchema, "params"),
  getLatestCropYieldHandler
);

router.post(
  "/:cropId/yield-prediction/refresh",
  validate(cropIdParamSchema, "params"),
  refreshCropYieldHandler
);

router.post(
  "/:cropId/production-estimate",
  validate(cropIdParamSchema, "params"),
  estimateCropProductionHandler
);

router.post(
  "/:cropId/actual-production",
  validate(cropIdParamSchema, "params"),
  recordActualProductionHandler
);

// D. Update a crop (supports both PATCH and PUT)
router.patch(
  "/:cropId",
  validate(cropIdParamSchema, "params"),
  validate(updateCropSchema, "body"),
  handleUpdateCrop
);
router.put(
  "/:cropId",
  validate(cropIdParamSchema, "params"),
  validate(updateCropSchema, "body"),
  handleUpdateCrop
);

// E. Delete a crop
router.delete(
  "/:cropId",
  validate(cropIdParamSchema, "params"),
  handleDeleteCrop
);

export default router;
