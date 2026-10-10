import {
  listActivityQuerySchema,
  activityIdParamSchema,
} from "./activity.validation.js";
import {
  listActivities,
  getActivityById,
} from "./activity.service.js";

/**
 * GET /api/v1/activity
 * GET /api/activity
 *
 * Retrieves the authenticated user's activity feed.
 */
export async function handleListActivities(req, res, next) {
  try {
    const validatedQuery = listActivityQuerySchema.parse(req.query);
    const result = await listActivities(req.user.id, validatedQuery);

    return res.status(200).json({
      success: true,
      message: "Activities retrieved successfully",
      data: result.items,
      pagination: result.pagination,
      items: result.items,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/activity/:id
 * GET /api/activity/:id
 *
 * Retrieves a single activity entry owned by the authenticated user.
 */
export async function handleGetActivity(req, res, next) {
  try {
    const { id } = activityIdParamSchema.parse(req.params);
    const activity = await getActivityById(req.user.id, id);

    return res.status(200).json({
      success: true,
      message: "Activity retrieved successfully",
      data: activity,
    });
  } catch (error) {
    next(error);
  }
}
