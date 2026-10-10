import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  listActivityQuerySchema,
  activityIdParamSchema,
} from "./activity.validation.js";
import {
  handleListActivities,
  handleGetActivity,
} from "./activity.controller.js";

const router = Router();

// All activity feed endpoints require authentication
router.use(authenticate);

// 1. List activities with server-side filtering and pagination
router.get(
  "/",
  validate(listActivityQuerySchema, "query"),
  handleListActivities
);

// 2. Retrieve single activity by ID
router.get(
  "/:id",
  validate(activityIdParamSchema, "params"),
  handleGetActivity
);

export default router;
