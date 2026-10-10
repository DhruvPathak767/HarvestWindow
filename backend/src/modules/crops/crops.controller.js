import * as cropService from "./crops.service.js";

/**
 * GET /api/crops
 * Retrieves all crops accessible to the authenticated user.
 */
export async function handleListCrops(req, res, next) {
  try {
    const crops = await cropService.listCrops(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      data: crops,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/crops/:cropId
 * Retrieves a single crop by ID if owned by the user.
 */
export async function handleGetCrop(req, res, next) {
  try {
    const crop = await cropService.getCropById(req.user.id, req.params.cropId);
    if (!crop) {
      return res.status(404).json({
        success: false,
        message: "Crop not found or not accessible.",
      });
    }
    return res.status(200).json({
      success: true,
      data: crop,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/crops
 * Creates a new crop associated with an existing farm owned by the user.
 */
export async function handleCreateCrop(req, res, next) {
  try {
    const crop = await cropService.createCrop(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: "Crop created successfully",
      data: crop,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/crops/:cropId & PUT /api/crops/:cropId
 * Updates an existing crop owned by the user.
 */
export async function handleUpdateCrop(req, res, next) {
  try {
    const updated = await cropService.updateCrop(
      req.user.id,
      req.params.cropId,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Crop updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/crops/:cropId
 * Deletes a crop owned by the user.
 */
export async function handleDeleteCrop(req, res, next) {
  try {
    await cropService.deleteCrop(req.user.id, req.params.cropId);
    return res.status(200).json({
      success: true,
      message: "Crop deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}
