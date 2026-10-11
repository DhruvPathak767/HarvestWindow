/**
 * HarvestWindow Phase AI-6: Crop Health Controller
 */
import { cropHealthService } from "./cropHealth.service.js";

export const analyzeCropHealth = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cropId = req.body.cropId || req.params.cropId || null;
    const file = req.file;

    const result = await cropHealthService.analyzeImage({
      file,
      cropId,
      userId,
    });

    res.status(201).json({
      success: true,
      message: "Crop health image analysis completed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalysisById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { analysisId } = req.params;

    const result = await cropHealthService.getAnalysisById(analysisId, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cropId, limit, offset } = req.query;

    const result = await cropHealthService.getUserHistory({
      userId,
      cropId,
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAnalysis = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { analysisId } = req.params;

    const result = await cropHealthService.deleteAnalysis(analysisId, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getModelStatus = async (req, res, next) => {
  try {
    const result = await cropHealthService.getModelStatus();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
