import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  listRecommendationsQuerySchema,
  recommendationIdParamSchema,
  updateRecommendationStatusSchema,
  refreshRecommendationsSchema,
} from "./recommendations.validation.js";
import {
  handleListRecommendations,
  handleGetRecommendation,
  handleUpdateRecommendationStatus,
  handleRefreshRecommendations,
} from "./recommendations.controller.js";

const router = Router();

// All recommendation endpoints require authentication
router.use(authenticate);

// 1. Refresh recommendations (re-evaluates rules on current user farms & crops)
// Must be registered before /:id to prevent route parameter collision
router.post(
  "/refresh",
  validate(refreshRecommendationsSchema, "body"),
  handleRefreshRecommendations
);

// 2. List recommendations with server-side filtering and pagination
router.get(
  "/",
  validate(listRecommendationsQuerySchema, "query"),
  handleListRecommendations
);

// 3. Update status of a recommendation
router.patch(
  "/:id/status",
  validate(recommendationIdParamSchema, "params"),
  validate(updateRecommendationStatusSchema, "body"),
  handleUpdateRecommendationStatus
);

// 4. Retrieve single recommendation by ID
router.get(
  "/:id",
  validate(recommendationIdParamSchema, "params"),
  handleGetRecommendation
);

export default router;
