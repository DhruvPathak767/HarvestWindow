import {
  listRecommendationsQuerySchema,
  recommendationIdParamSchema,
  updateRecommendationStatusSchema,
  refreshRecommendationsSchema,
} from "./recommendations.validation.js";
import {
  listRecommendations,
  getRecommendationById,
  updateRecommendationStatus,
  refreshRecommendations,
} from "./recommendations.service.js";

/**
 * GET /api/v1/recommendations
 * GET /api/recommendations
 *
 * Retrieves recommendations scoped to the authenticated user.
 */
export async function handleListRecommendations(req, res, next) {
  try {
    const validatedQuery = listRecommendationsQuerySchema.parse(req.query);
    const result = await listRecommendations(req.user.id, validatedQuery);

    return res.status(200).json({
      success: true,
      message: "Recommendations retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/recommendations/:id
 * GET /api/recommendations/:id
 *
 * Retrieves a single recommendation owned by the authenticated user.
 */
export async function handleGetRecommendation(req, res, next) {
  try {
    const { id } = recommendationIdParamSchema.parse(req.params);
    const recommendation = await getRecommendationById(req.user.id, id);

    return res.status(200).json({
      success: true,
      message: "Recommendation retrieved successfully",
      data: recommendation,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/recommendations/:id/status
 * PATCH /api/recommendations/:id/status
 *
 * Updates recommendation status to 'open', 'completed', or 'dismissed'.
 */
export async function handleUpdateRecommendationStatus(req, res, next) {
  try {
    const { id } = recommendationIdParamSchema.parse(req.params);
    const { status } = updateRecommendationStatusSchema.parse(req.body);

    const updated = await updateRecommendationStatus(req.user.id, id, status);

    return res.status(200).json({
      success: true,
      message: "Recommendation status updated",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/recommendations/refresh
 * POST /api/recommendations/refresh
 *
 * Triggers agricultural rule evaluation on current user data and reconciles recommendations.
 */
export async function handleRefreshRecommendations(req, res, next) {
  try {
    const payload = {
      farmId: req.body?.farmId || req.query?.farmId || undefined,
    };
    const validated = refreshRecommendationsSchema.parse(payload);

    const stats = await refreshRecommendations(req.user.id, {
      farmId: validated.farmId,
    });

    return res.status(200).json({
      success: true,
      message: "Recommendations refreshed successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}
