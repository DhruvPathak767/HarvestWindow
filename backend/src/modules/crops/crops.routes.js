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

const router = Router();

// Enforce authentication across all crop routes
router.use(authenticate);

// A. List crops (supports filtering by farmId, cropName, variety, growthStage)
router.get("/", validate(listCropsQuerySchema, "query"), handleListCrops);

// B. Create a crop
router.post("/", validate(createCropSchema, "body"), handleCreateCrop);

// C. Retrieve one crop
router.get("/:cropId", validate(cropIdParamSchema, "params"), handleGetCrop);

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
