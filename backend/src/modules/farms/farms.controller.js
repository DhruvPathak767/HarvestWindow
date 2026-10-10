import * as farmService from "./farms.service.js";

/**
 * GET /api/farms
 * Retrieves all farms belonging to the authenticated user.
 */
export async function handleListFarms(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const farms = await farmService.listFarms(userId);
    return res.status(200).json({
      success: true,
      data: farms,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/farms/:farmId
 * Retrieves a single farm by ID if owned by the authenticated user.
 */
export async function handleGetFarm(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const farm = await farmService.getFarmById(userId, req.params.farmId);
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found or not accessible.",
      });
    }
    return res.status(200).json({
      success: true,
      data: farm,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/farms
 * Creates a new farm for the authenticated user.
 */
export async function handleCreateFarm(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const farm = await farmService.createFarm(userId, req.body);
    return res.status(201).json({
      success: true,
      data: farm,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/farms/:farmId
 * Updates an existing farm owned by the authenticated user.
 */
export async function handleUpdateFarm(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const updated = await farmService.updateFarm(
      userId,
      req.params.farmId,
      req.body
    );
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Farm not found or not accessible.",
      });
    }
    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/farms/:farmId
 * Deletes a farm owned by the authenticated user.
 */
export async function handleDeleteFarm(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const deleted = await farmService.deleteFarm(userId, req.params.farmId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Farm not found or not accessible.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Farm deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}
