import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import {
  listCropsQuerySchema,
  cropIdParamSchema,
  listRegionsQuerySchema,
  cropCalendarQuerySchema,
  growthProfilesQuerySchema,
  suitabilityQuerySchema,
} from "./agriculture.validation.js";
import {
  handleListCrops,
  handleGetCrop,
  handleListSeasons,
  handleListRegions,
  handleGetCropCalendars,
  handleGetCropGrowthProfiles,
  handleGetCropSuitability,
  handleGetDataSources,
  handleGetDataQuality,
} from "./agriculture.controller.js";

const router = Router();

// 8. Agricultural Knowledge Base REST Endpoints
router.get("/crops", validate(listCropsQuerySchema, "query"), handleListCrops);
router.get("/crops/:cropId", validate(cropIdParamSchema, "params"), handleGetCrop);
router.get("/seasons", handleListSeasons);
router.get("/regions", validate(listRegionsQuerySchema, "query"), handleListRegions);
router.get("/crop-calendar", validate(cropCalendarQuerySchema, "query"), handleGetCropCalendars);
router.get("/crop-growth-profiles", validate(growthProfilesQuerySchema, "query"), handleGetCropGrowthProfiles);
router.get("/crop-suitability", validate(suitabilityQuerySchema, "query"), handleGetCropSuitability);
router.get("/data-sources", handleGetDataSources);
router.get("/data-quality", handleGetDataQuality);

export default router;
