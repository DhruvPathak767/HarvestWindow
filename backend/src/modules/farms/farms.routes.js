import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  farmIdParamSchema,
  createFarmSchema,
  updateFarmSchema,
} from "./farms.validation.js";
import {
  handleListFarms,
  handleGetFarm,
  handleCreateFarm,
  handleUpdateFarm,
  handleDeleteFarm,
} from "./farms.controller.js";
import { handleGetFarmWeatherRisk } from "../weather/weatherRisk.controller.js";
import { getFarmProductionEstimatesHandler } from "../yield/yield.controller.js";

const router = Router();

// Enforce authentication across all farm routes
router.use(authenticate);

// A. List farms
router.get("/", handleListFarms);

// B. Create a farm
router.post("/", validate(createFarmSchema, "body"), handleCreateFarm);

// C. Retrieve one farm
router.get("/:farmId", validate(farmIdParamSchema, "params"), handleGetFarm);

// Phase AI-3 Weather Intelligence & Harvest Risk for Farm
router.get(
  "/:farmId/weather-risk",
  validate(farmIdParamSchema, "params"),
  handleGetFarmWeatherRisk
);

// Phase AI-5 Farm-level Production Estimates
router.get(
  "/:farmId/production-estimates",
  validate(farmIdParamSchema, "params"),
  getFarmProductionEstimatesHandler
);

// D. Update a farm (support both PUT and PATCH)
router.put(
  "/:farmId",
  validate(farmIdParamSchema, "params"),
  validate(updateFarmSchema, "body"),
  handleUpdateFarm
);
router.patch(
  "/:farmId",
  validate(farmIdParamSchema, "params"),
  validate(updateFarmSchema, "body"),
  handleUpdateFarm
);

// E. Delete a farm
router.delete(
  "/:farmId",
  validate(farmIdParamSchema, "params"),
  handleDeleteFarm
);

export default router;
