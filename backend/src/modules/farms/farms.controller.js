import * as farmService from "./farms.service.js";

/**
 * GET /api/farms
 * Retrieves all farms belonging to the authenticated user.
 */
export async function handleListFarms(req, res, next) {
  try {
    const farms = await farmService.listFarms(req.user.id);
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
    const farm = await farmService.getFarmById(req.user.id, req.params.farmId);
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
    const farm = await farmService.createFarm(req.user.id, req.body);
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
    const updated = await farmService.updateFarm(
      req.user.id,
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
    const deleted = await farmService.deleteFarm(req.user.id, req.params.farmId);
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
