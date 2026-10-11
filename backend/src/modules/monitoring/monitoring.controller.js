/**
 * Phase AI-9: Prediction Monitoring Controller
 */

import { monitoringService } from "./monitoring.service.js";

export async function recordOutcomeHandler(req, res, next) {
  try {
    const { cropId } = req.params;
    const outcome = await monitoringService.recordHarvestOutcome({
      userId: req.user.id,
      userRole: req.user.role,
      cropId,
      data: req.body,
    });

    res.status(201).json({
      success: true,
      message: "Actual harvest outcome recorded successfully",
      data: outcome,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCropOutcomesHandler(req, res, next) {
  try {
    const { cropId } = req.params;
    const outcomes = await monitoringService.getCropHarvestOutcomes({
      cropId,
      userId: req.user.id,
      userRole: req.user.role,
    });

    res.status(200).json({
      success: true,
      data: outcomes,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOutcomeHandler(req, res, next) {
  try {
    const { cropId, outcomeId } = req.params;
    const updated = await monitoringService.updateHarvestOutcome({
      outcomeId,
      cropId,
      userId: req.user.id,
      userRole: req.user.role,
      data: req.body,
    });

    res.status(200).json({
      success: true,
      message: "Harvest outcome updated and evaluation refreshed",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAccuracySummaryHandler(req, res, next) {
  try {
    const { crop, region, modelVersion } = req.query;
    const summary = await monitoringService.getAccuracySummary({
      cropFilter: crop,
      regionFilter: region,
      modelVersion,
    });

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

export async function getErrorsHandler(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { crop, region, modelVersion } = req.query;

    const result = await monitoringService.getCropRegionalErrors({
      crop,
      region,
      modelVersion,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDriftHandler(req, res, next) {
  try {
    const result = await monitoringService.getDriftStatus();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getModelsHandler(req, res, next) {
  try {
    const result = await monitoringService.getModelRegistry();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getReportsHandler(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const result = await monitoringService.getEvaluationReports({ page, limit });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getJobsHandler(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await monitoringService.getJobRuns({ page, limit });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function triggerEvaluationHandler(req, res, next) {
  try {
    const result = await monitoringService.triggerEvaluationJob({
      triggeredBy: req.user ? `ADMIN_${req.user.id}` : "MANUAL_ADMIN",
    });

    res.status(200).json({
      success: true,
      message: "Evaluation job executed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function triggerRetrainingCheckHandler(req, res, next) {
  try {
    const result = await monitoringService.triggerRetrainingCheck({
      triggeredBy: req.user ? `ADMIN_${req.user.id}` : "MANUAL_ADMIN",
    });

    res.status(200).json({
      success: true,
      message: "Retraining eligibility check executed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function promoteModelHandler(req, res, next) {
  try {
    const { modelName, modelVersion } = req.body;
    if (!modelVersion) {
      return res.status(400).json({ success: false, message: "modelVersion is required" });
    }

    const updated = await monitoringService.promoteCandidateModel({
      modelName,
      modelVersion,
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: `Model version '${modelVersion}' promoted to active production successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
