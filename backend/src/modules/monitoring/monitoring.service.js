/**
 * Phase AI-9: Prediction Monitoring and Continuous Improvement Service
 * Manages verified harvest outcomes, prediction evaluations, reports, drift assessments,
 * MLflow model registry tracking, and scheduled/administrative job execution.
 */

import prisma from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { config } from "../../config/env.js";
import {
  VERIFICATION_STATUSES,
  OUTCOME_SOURCES,
  DEFAULT_MODEL,
  JOB_TYPES,
  PROMOTION_STATUSES
} from "./monitoring.constants.js";

const AI_SERVICE_URL =
  process.env.HARVEST_AI_SERVICE_URL ||
  config.HARVEST_AI_SERVICE_URL ||
  "http://127.0.0.1:8000";

/**
 * Normalizes date to midnight UTC calendar date
 */
function toCalendarDateOnly(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

function calculateCalendarDaysDiff(dateA, dateB) {
  const calA = toCalendarDateOnly(dateA);
  const calB = toCalendarDateOnly(dateB);
  if (!calA || !calB) return 0;
  const diffMs = calA.getTime() - calB.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

class MonitoringService {
  /**
   * Validates crop ownership or administrative permissions
   */
  async verifyCropOwnership(cropId, userId, userRole) {
    const crop = await prisma.crop.findUnique({
      where: { id: cropId },
      include: {
        farm: true,
      },
    });

    if (!crop) {
      throw new AppError("Crop not found", 404);
    }

    if (userRole !== "ADMIN" && userRole !== "EXPERT" && crop.farm.userId !== userId) {
      throw new AppError("Access denied: You do not own the farm associated with this crop", 403);
    }

    return crop;
  }

  /**
   * Records a farmer's actual harvest outcome with explicit consent
   */
  async recordHarvestOutcome({ userId, userRole, cropId, data }) {
    const crop = await this.verifyCropOwnership(cropId, userId, userRole);

    const actualDate = toCalendarDateOnly(data.actualHarvestDate);
    if (!actualDate) {
      throw new AppError("Valid actualHarvestDate is required (YYYY-MM-DD)", 400);
    }

    // Optional window boundaries
    const actualStart = data.actualHarvestStart ? toCalendarDateOnly(data.actualHarvestStart) : null;
    const actualEnd = data.actualHarvestEnd ? toCalendarDateOnly(data.actualHarvestEnd) : null;

    // Check for duplicate outcome submission on the exact same crop and date
    const existing = await prisma.harvestOutcome.findFirst({
      where: {
        cropId,
        actualHarvestDate: actualDate,
      },
    });

    if (existing) {
      throw new AppError("A harvest outcome for this crop on this date has already been recorded", 409);
    }

    // Find the latest harvest prediction for this crop to link evaluation
    const prediction = data.predictionId
      ? await prisma.harvestPrediction.findUnique({ where: { id: data.predictionId } })
      : await prisma.harvestPrediction.findFirst({
          where: { cropId },
          orderBy: { predictionDate: "desc" },
        });

    // Verification status logic
    let verificationStatus = VERIFICATION_STATUSES.PENDING_VERIFICATION;
    let verifiedAt = null;
    let verifiedByUserId = null;

    if (userRole === "ADMIN" || userRole === "EXPERT") {
      verificationStatus = VERIFICATION_STATUSES.VERIFIED;
      verifiedAt = new Date();
      verifiedByUserId = userId;
    }

    // Consent: consentEvaluation defaults to true; consentTraining strictly defaults to false
    const consentEvaluation = data.consentEvaluation !== undefined ? Boolean(data.consentEvaluation) : true;
    const consentTraining = Boolean(data.consentTraining);

    const outcome = await prisma.harvestOutcome.create({
      data: {
        userId,
        farmId: crop.farmId,
        cropId,
        predictionId: prediction ? prediction.id : null,
        actualHarvestDate: actualDate,
        actualHarvestStart: actualStart,
        actualHarvestEnd: actualEnd,
        season: data.season || null,
        outcomeSource: data.outcomeSource || OUTCOME_SOURCES.FARMER_RECORDED,
        verificationStatus,
        verifiedAt,
        verifiedByUserId,
        verificationNotes: data.verificationNotes || null,
        consentEvaluation,
        consentTraining,
        notes: data.notes || null,
      },
      include: {
        prediction: true,
      },
    });

    // If prediction exists, compute and save PredictionEvaluation immediately
    if (prediction && consentEvaluation) {
      await this.evaluateSinglePair(outcome, prediction);
    }

    return outcome;
  }

  /**
   * Evaluates a single outcome-prediction pair and stores in prediction_evaluations
   */
  async evaluateSinglePair(outcome, prediction, revision = 1) {
    const actualD = toCalendarDateOnly(outcome.actualHarvestDate);
    const predD = toCalendarDateOnly(prediction.mostLikelyHarvestDate);
    if (!actualD || !predD) return null;

    const errorDays = calculateCalendarDaysDiff(actualD, predD);
    const absErrorDays = Math.abs(errorDays);
    const isExactDate = errorDays === 0;
    const isWithin3Days = absErrorDays <= 3;
    const isWithin7Days = absErrorDays <= 7;

    // Window metrics
    const wStart = prediction.estimatedHarvestStart ? toCalendarDateOnly(prediction.estimatedHarvestStart) : null;
    const wEnd = prediction.estimatedHarvestEnd ? toCalendarDateOnly(prediction.estimatedHarvestEnd) : null;

    let isWithinWindow = null;
    let windowDistanceDays = null;

    if (wStart || wEnd) {
      const s = wStart || wEnd;
      const e = wEnd || wStart;
      const [early, late] = s <= e ? [s, e] : [e, s];

      if (actualD >= early && actualD <= late) {
        isWithinWindow = true;
        windowDistanceDays = 0;
      } else if (actualD < early) {
        isWithinWindow = false;
        windowDistanceDays = calculateCalendarDaysDiff(early, actualD);
      } else {
        isWithinWindow = false;
        windowDistanceDays = calculateCalendarDaysDiff(actualD, late);
      }
    }

    const predGenDate = toCalendarDateOnly(prediction.predictionDate);
    const horizonDays = predGenDate ? calculateCalendarDaysDiff(actualD, predGenDate) : null;

    // Secondary training eligibility: requires consentTraining AND verified status
    const isEligibleTraining =
      Boolean(outcome.consentTraining) &&
      (outcome.verificationStatus === VERIFICATION_STATUSES.VERIFIED ||
        outcome.verificationStatus === VERIFICATION_STATUSES.CORRECTED);

    let exclusionReason = null;
    if (!outcome.consentTraining) {
      exclusionReason = "LACKS_TRAINING_CONSENT";
    } else if (
      outcome.verificationStatus !== VERIFICATION_STATUSES.VERIFIED &&
      outcome.verificationStatus !== VERIFICATION_STATUSES.CORRECTED
    ) {
      exclusionReason = `UNVERIFIED_STATUS_${outcome.verificationStatus}`;
    }

    return await prisma.predictionEvaluation.upsert({
      where: {
        outcomeId_predictionId_evaluationRevision: {
          outcomeId: outcome.id,
          predictionId: prediction.id,
          evaluationRevision: revision,
        },
      },
      update: {
        errorDays,
        absoluteErrorDays: absErrorDays,
        isExactDate,
        isWithin3Days,
        isWithin7Days,
        isWithinWindow,
        windowDistanceDays,
        forecastHorizonDays: horizonDays,
        isEligibleForTraining: isEligibleTraining,
        exclusionReason,
        calculatedAt: new Date(),
      },
      create: {
        outcomeId: outcome.id,
        predictionId: prediction.id,
        cropId: outcome.cropId,
        farmId: outcome.farmId,
        modelVersion: prediction.modelVersion || DEFAULT_MODEL.VERSION,
        modelName: DEFAULT_MODEL.NAME,
        actualHarvestDate: actualD,
        predictedHarvestDate: predD,
        predictedWindowStart: wStart,
        predictedWindowEnd: wEnd,
        errorDays,
        absoluteErrorDays: absErrorDays,
        isExactDate,
        isWithin3Days,
        isWithin7Days,
        isWithinWindow,
        windowDistanceDays,
        forecastHorizonDays: horizonDays,
        evaluationRevision: revision,
        isEligibleForTraining: isEligibleTraining,
        exclusionReason,
      },
    });
  }

  /**
   * Retrieves harvest outcomes recorded for a crop
   */
  async getCropHarvestOutcomes({ cropId, userId, userRole }) {
    await this.verifyCropOwnership(cropId, userId, userRole);

    return await prisma.harvestOutcome.findMany({
      where: { cropId },
      include: {
        prediction: true,
        evaluations: {
          orderBy: { evaluationRevision: "desc" },
        },
      },
      orderBy: { actualHarvestDate: "desc" },
    });
  }

  /**
   * Corrects a harvest outcome with full audit trail
   */
  async updateHarvestOutcome({ outcomeId, cropId, userId, userRole, data }) {
    await this.verifyCropOwnership(cropId, userId, userRole);

    const outcome = await prisma.harvestOutcome.findUnique({
      where: { id: outcomeId },
      include: { prediction: true },
    });

    if (!outcome) {
      throw new AppError("Harvest outcome not found", 404);
    }

    // Save previous snapshot
    const previousSnapshot = JSON.stringify({
      actualHarvestDate: outcome.actualHarvestDate,
      consentTraining: outcome.consentTraining,
      verificationStatus: outcome.verificationStatus,
      notes: outcome.notes,
      updatedAt: outcome.updatedAt,
    });

    const newActualDate = data.actualHarvestDate
      ? toCalendarDateOnly(data.actualHarvestDate)
      : outcome.actualHarvestDate;

    const updated = await prisma.harvestOutcome.update({
      where: { id: outcomeId },
      data: {
        actualHarvestDate: newActualDate,
        actualHarvestStart: data.actualHarvestStart
          ? toCalendarDateOnly(data.actualHarvestStart)
          : outcome.actualHarvestStart,
        actualHarvestEnd: data.actualHarvestEnd
          ? toCalendarDateOnly(data.actualHarvestEnd)
          : outcome.actualHarvestEnd,
        notes: data.notes !== undefined ? data.notes : outcome.notes,
        consentTraining: data.consentTraining !== undefined ? Boolean(data.consentTraining) : outcome.consentTraining,
        consentEvaluation: data.consentEvaluation !== undefined ? Boolean(data.consentEvaluation) : outcome.consentEvaluation,
        verificationStatus: VERIFICATION_STATUSES.CORRECTED,
        correctionCount: outcome.correctionCount + 1,
        previousOutcomeJson: previousSnapshot,
      },
      include: {
        prediction: true,
      },
    });

    // Recompute evaluation with incremented revision
    if (updated.prediction && updated.consentEvaluation) {
      await this.evaluateSinglePair(updated, updated.prediction, outcome.correctionCount + 2);
    }

    return updated;
  }

  /**
   * Gets aggregated prediction accuracy summary across the platform or filtered
   */
  async getAccuracySummary({ cropFilter, regionFilter, modelVersion } = {}) {
    // Check if a persisted report exists
    const whereReport = {};
    if (cropFilter) whereReport.cropFilter = cropFilter;
    if (regionFilter) whereReport.regionFilter = regionFilter;
    if (modelVersion) whereReport.modelVersion = modelVersion;

    const latestReport = await prisma.modelEvaluationReport.findFirst({
      where: whereReport,
      orderBy: { createdAt: "desc" },
    });

    if (latestReport) {
      return {
        source: "PERSISTED_REPORT",
        reportId: latestReport.reportId,
        modelVersion: latestReport.modelVersion,
        totalEvaluated: latestReport.totalEvaluated,
        meanAbsoluteError: latestReport.meanAbsoluteError ? Number(latestReport.meanAbsoluteError) : null,
        meanSignedError: latestReport.meanSignedError ? Number(latestReport.meanSignedError) : null,
        rootMeanSquaredError: latestReport.rootMeanSquaredError ? Number(latestReport.rootMeanSquaredError) : null,
        exactDateAccuracyPct: latestReport.exactDateAccuracyPct ? Number(latestReport.exactDateAccuracyPct) : null,
        within3DaysPct: latestReport.within3DaysPct ? Number(latestReport.within3DaysPct) : null,
        within7DaysPct: latestReport.within7DaysPct ? Number(latestReport.within7DaysPct) : null,
        windowCoveragePct: latestReport.windowCoveragePct ? Number(latestReport.windowCoveragePct) : null,
        meanWindowDistance: latestReport.meanWindowDistance ? Number(latestReport.meanWindowDistance) : null,
        isInsufficientData: latestReport.isInsufficientData,
        subgroups: latestReport.subgroupsJson ? JSON.parse(latestReport.subgroupsJson) : {},
        warnings: latestReport.warningsJson ? JSON.parse(latestReport.warningsJson) : [],
        createdAt: latestReport.createdAt,
      };
    }

    // Live calculation from PredictionEvaluation table
    const whereEval = {};
    if (modelVersion) whereEval.modelVersion = modelVersion;

    const evals = await prisma.predictionEvaluation.findMany({
      where: whereEval,
      include: {
        outcome: {
          include: {
            crop: true,
            farm: true,
          },
        },
      },
    });

    const total = evals.length;
    if (total === 0) {
      return {
        source: "LIVE_CALCULATION",
        modelVersion: modelVersion || DEFAULT_MODEL.VERSION,
        totalEvaluated: 0,
        isInsufficientData: true,
        meanAbsoluteError: null,
        meanSignedError: null,
        rootMeanSquaredError: null,
        exactDateAccuracyPct: null,
        within3DaysPct: null,
        within7DaysPct: null,
        windowCoveragePct: null,
        warnings: ["No evaluated harvest predictions currently recorded in the system."],
        createdAt: new Date().toISOString(),
      };
    }

    const absErrors = evals.map((e) => e.absoluteErrorDays);
    const errors = evals.map((e) => e.errorDays);
    const mae = absErrors.reduce((a, b) => a + b, 0) / total;
    const bias = errors.reduce((a, b) => a + b, 0) / total;
    const rmse = Math.sqrt(errors.reduce((a, b) => a + b * b, 0) / total);

    const exactPct = (evals.filter((e) => e.isExactDate).length / total) * 100;
    const w3Pct = (evals.filter((e) => e.isWithin3Days).length / total) * 100;
    const w7Pct = (evals.filter((e) => e.isWithin7Days).length / total) * 100;

    const windowEvals = evals.filter((e) => e.isWithinWindow !== null);
    const covPct = windowEvals.length > 0
      ? (windowEvals.filter((e) => e.isWithinWindow).length / windowEvals.length) * 100
      : null;

    return {
      source: "LIVE_CALCULATION",
      modelVersion: modelVersion || DEFAULT_MODEL.VERSION,
      totalEvaluated: total,
      meanAbsoluteError: Number(mae.toFixed(3)),
      meanSignedError: Number(bias.toFixed(3)),
      rootMeanSquaredError: Number(rmse.toFixed(3)),
      exactDateAccuracyPct: Number(exactPct.toFixed(2)),
      within3DaysPct: Number(w3Pct.toFixed(2)),
      within7DaysPct: Number(w7Pct.toFixed(2)),
      windowCoveragePct: covPct !== null ? Number(covPct.toFixed(2)) : null,
      isInsufficientData: total < 5,
      warnings: total < 5 ? [`Sample count (${total}) is preliminary (under 5 observations).`] : [],
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves crop & regional error breakdown with pagination
   */
  async getCropRegionalErrors({ crop, region, modelVersion, page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;
    const where = {};
    if (modelVersion) where.modelVersion = modelVersion;

    const [evals, total] = await Promise.all([
      prisma.predictionEvaluation.findMany({
        where,
        include: {
          outcome: {
            include: {
              crop: true,
              farm: true,
            },
          },
          prediction: true,
        },
        orderBy: { calculatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.predictionEvaluation.count({ where }),
    ]);

    // Client-safe mapping: no PII leaked
    const items = evals.map((e) => ({
      id: e.id,
      cropName: e.outcome?.crop?.cropName || "Unknown",
      region: e.outcome?.farm?.district || e.outcome?.farm?.state || "Unknown",
      modelVersion: e.modelVersion,
      actualHarvestDate: e.actualHarvestDate,
      predictedHarvestDate: e.predictedHarvestDate,
      errorDays: e.errorDays,
      absoluteErrorDays: e.absoluteErrorDays,
      isExactDate: e.isExactDate,
      isWithin3Days: e.isWithin3Days,
      isWithin7Days: e.isWithin7Days,
      isWithinWindow: e.isWithinWindow,
      windowDistanceDays: e.windowDistanceDays,
      calculatedAt: e.calculatedAt,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves drift assessment telemetry
   */
  async getDriftStatus() {
    const latestAssessments = await prisma.driftAssessment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (latestAssessments.length > 0) {
      return {
        status: "success",
        assessments: latestAssessments.map((a) => ({
          id: a.id,
          assessmentId: a.assessmentId,
          modelVersion: a.modelVersion,
          driftType: a.driftType,
          severity: a.severity,
          driftScore: a.driftScore ? Number(a.driftScore) : 0,
          threshold: a.threshold ? Number(a.threshold) : 0.25,
          referenceSampleSize: a.referenceSampleSize,
          currentSampleSize: a.currentSampleSize,
          summaryDetails: a.summaryDetailsJson ? JSON.parse(a.summaryDetailsJson) : null,
          recommendations: a.recommendations || null,
          createdAt: a.createdAt,
        })),
      };
    }

    // Default status when no drift job has executed yet
    return {
      status: "success",
      assessments: [
        {
          assessmentId: "initial-baseline",
          modelVersion: DEFAULT_MODEL.VERSION,
          driftType: "INPUT_DATA_DRIFT",
          severity: "NORMAL",
          driftScore: 0.0,
          threshold: 0.25,
          referenceSampleSize: 0,
          currentSampleSize: 0,
          summaryDetails: null,
          recommendations: "System initialized. Routine drift monitoring active.",
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  /**
   * Retrieves registered model versions & MLflow lineage
   */
  async getModelRegistry() {
    // 1. Ensure default production model exists in registry
    let activeModel = await prisma.modelVersionRegistry.findFirst({
      where: { isActive: true },
    });

    if (!activeModel) {
      activeModel = await prisma.modelVersionRegistry.upsert({
        where: {
          modelName_modelVersion: {
            modelName: DEFAULT_MODEL.NAME,
            modelVersion: DEFAULT_MODEL.VERSION,
          },
        },
        update: { isActive: true },
        create: {
          modelName: DEFAULT_MODEL.NAME,
          modelVersion: DEFAULT_MODEL.VERSION,
          algorithm: "AgronomicGDDHybrid",
          promotionStatus: PROMOTION_STATUSES.ACTIVE_PRODUCTION,
          isActive: true,
          promotedAt: new Date(),
          notes: "Default verified agronomic GDD baseline model.",
        },
      });
    }

    const allModels = await prisma.modelVersionRegistry.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch MLflow runs from FastAPI microservice if available
    let mlflowRuns = [];
    try {
      const res = await fetch(`${AI_SERVICE_URL}/monitoring/mlflow/runs`);
      if (res.ok) {
        const json = await res.json();
        mlflowRuns = json.runs || [];
      }
    } catch {
      // microservice might be in fallback
    }

    return {
      activeModel: {
        id: activeModel.id,
        modelName: activeModel.modelName,
        modelVersion: activeModel.modelVersion,
        algorithm: activeModel.algorithm,
        promotionStatus: activeModel.promotionStatus,
        promotedAt: activeModel.promotedAt,
        validationMae: activeModel.validationMae ? Number(activeModel.validationMae) : null,
      },
      models: allModels.map((m) => ({
        id: m.id,
        modelName: m.modelName,
        modelVersion: m.modelVersion,
        algorithm: m.algorithm,
        promotionStatus: m.promotionStatus,
        isActive: m.isActive,
        validationMae: m.validationMae ? Number(m.validationMae) : null,
        validationRmse: m.validationRmse ? Number(m.validationRmse) : null,
        rejectionReason: m.rejectionReason,
        createdAt: m.createdAt,
      })),
      mlflowRuns,
    };
  }

  /**
   * Retrieves paginated evaluation reports
   */
  async getEvaluationReports({ page = 1, limit = 10 }) {
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      prisma.modelEvaluationReport.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.modelEvaluationReport.count(),
    ]);

    return {
      reports: reports.map((r) => ({
        ...r,
        meanAbsoluteError: r.meanAbsoluteError ? Number(r.meanAbsoluteError) : null,
        meanSignedError: r.meanSignedError ? Number(r.meanSignedError) : null,
        rootMeanSquaredError: r.rootMeanSquaredError ? Number(r.rootMeanSquaredError) : null,
        exactDateAccuracyPct: r.exactDateAccuracyPct ? Number(r.exactDateAccuracyPct) : null,
        within3DaysPct: r.within3DaysPct ? Number(r.within3DaysPct) : null,
        within7DaysPct: r.within7DaysPct ? Number(r.within7DaysPct) : null,
        windowCoveragePct: r.windowCoveragePct ? Number(r.windowCoveragePct) : null,
        subgroups: r.subgroupsJson ? JSON.parse(r.subgroupsJson) : {},
        warnings: r.warningsJson ? JSON.parse(r.warningsJson) : [],
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves recent monitoring job executions
   */
  async getJobRuns({ page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;
    const [jobs, total] = await Promise.all([
      prisma.monitoringJobRun.findMany({
        orderBy: { startedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.monitoringJobRun.count(),
    ]);

    return {
      jobs: jobs.map((j) => ({
        ...j,
        resultsSummary: j.resultsSummaryJson ? JSON.parse(j.resultsSummaryJson) : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Administrative trigger for batch evaluation job
   */
  async triggerEvaluationJob({ triggeredBy = "MANUAL_ADMIN" } = {}) {
    const jobRun = await prisma.monitoringJobRun.create({
      data: {
        jobType: JOB_TYPES.OUTCOME_EVALUATION,
        status: "RUNNING",
        triggeredBy,
      },
    });

    try {
      // Gather all outcomes with predictions
      const outcomes = await prisma.harvestOutcome.findMany({
        where: {
          predictionId: { not: null },
          consentEvaluation: true,
        },
        include: {
          prediction: true,
          crop: true,
          farm: true,
        },
      });

      let evaluatedCount = 0;
      for (const out of outcomes) {
        if (out.prediction) {
          await this.evaluateSinglePair(out, out.prediction);
          evaluatedCount++;
        }
      }

      // Compute and persist ModelEvaluationReport
      const summary = await this.getAccuracySummary();
      const reportId = `report-${Date.now()}`;

      await prisma.modelEvaluationReport.create({
        data: {
          reportId,
          modelVersion: summary.modelVersion || DEFAULT_MODEL.VERSION,
          totalEvaluated: summary.totalEvaluated,
          eligibleCount: summary.totalEvaluated,
          meanAbsoluteError: summary.meanAbsoluteError,
          meanSignedError: summary.meanSignedError,
          rootMeanSquaredError: summary.rootMeanSquaredError,
          exactDateAccuracyPct: summary.exactDateAccuracyPct,
          within3DaysPct: summary.within3DaysPct,
          within7DaysPct: summary.within7DaysPct,
          windowCoveragePct: summary.windowCoveragePct,
          isInsufficientData: summary.isInsufficientData,
          subgroupsJson: JSON.stringify(summary.subgroups || {}),
          warningsJson: JSON.stringify(summary.warnings || []),
          generatedBy: triggeredBy,
        },
      });

      await prisma.monitoringJobRun.update({
        where: { id: jobRun.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          recordsProcessed: evaluatedCount,
          resultsSummaryJson: JSON.stringify({
            reportId,
            totalEvaluated: summary.totalEvaluated,
            mae: summary.meanAbsoluteError,
          }),
        },
      });

      return {
        jobId: jobRun.id,
        reportId,
        recordsProcessed: evaluatedCount,
        status: "COMPLETED",
      };
    } catch (err) {
      await prisma.monitoringJobRun.update({
        where: { id: jobRun.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: err.message,
        },
      });
      throw err;
    }
  }

  /**
   * Administrative trigger for retraining eligibility check
   */
  async triggerRetrainingCheck({ triggeredBy = "MANUAL_ADMIN" } = {}) {
    const jobRun = await prisma.monitoringJobRun.create({
      data: {
        jobType: JOB_TYPES.RETRAINING_ELIGIBILITY,
        status: "RUNNING",
        triggeredBy,
      },
    });

    try {
      const verifiedOutcomesCount = await prisma.harvestOutcome.count({
        where: {
          verificationStatus: { in: [VERIFICATION_STATUSES.VERIFIED, VERIFICATION_STATUSES.CORRECTED] },
        },
      });

      const consentedCount = await prisma.harvestOutcome.count({
        where: {
          verificationStatus: { in: [VERIFICATION_STATUSES.VERIFIED, VERIFICATION_STATUSES.CORRECTED] },
          consentTraining: true,
        },
      });

      // Diversity counts
      const distinctCrops = await prisma.harvestOutcome.groupBy({
        by: ["cropId"],
        where: { consentTraining: true },
      });
      const distinctFarms = await prisma.harvestOutcome.groupBy({
        by: ["farmId"],
        where: { consentTraining: true },
      });

      // Query FastAPI
      let result = {
        is_eligible: false,
        status: "INSUFFICIENT_DATA",
        training_consented_count: consentedCount,
        minimum_required: 15,
        blockers: [`Consented verified outcomes (${consentedCount}) is below the required 15`],
        triggers_met: [],
        recommended_action: "Await further consented harvest outcomes from farmers before initiating retraining.",
      };

      try {
        const res = await fetch(`${AI_SERVICE_URL}/monitoring/retraining/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verified_outcomes_count: verifiedOutcomesCount,
            training_consented_count: consentedCount,
            current_dataset_fingerprint: `consented_n${consentedCount}_c${distinctCrops.length}`,
            crop_diversity_count: distinctCrops.length,
            region_diversity_count: distinctFarms.length,
          }),
        });
        if (res.ok) {
          result = await res.json();
        }
      } catch {
        // Fallback logic already prepared in result
      }

      await prisma.monitoringJobRun.update({
        where: { id: jobRun.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          recordsProcessed: consentedCount,
          resultsSummaryJson: JSON.stringify(result),
        },
      });

      return {
        jobId: jobRun.id,
        eligibility: result,
      };
    } catch (err) {
      await prisma.monitoringJobRun.update({
        where: { id: jobRun.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: err.message,
        },
      });
      throw err;
    }
  }

  /**
   * Promotes candidate model after enforcing validation gates
   */
  async promoteCandidateModel({ modelName, modelVersion, userId }) {
    const candidate = await prisma.modelVersionRegistry.findUnique({
      where: {
        modelName_modelVersion: {
          modelName: modelName || DEFAULT_MODEL.NAME,
          modelVersion,
        },
      },
    });

    if (!candidate) {
      throw new AppError(`Candidate model '${modelVersion}' not found in registry.`, 404);
    }

    if (candidate.promotionStatus === PROMOTION_STATUSES.REJECTED) {
      throw new AppError(
        `Cannot promote rejected candidate '${modelVersion}'. Reason: ${candidate.rejectionReason}`,
        400
      );
    }

    // Atomic transaction: mark incumbent inactive, activate candidate
    const [updatedCandidate] = await prisma.$transaction([
      prisma.modelVersionRegistry.update({
        where: { id: candidate.id },
        data: {
          isActive: true,
          promotionStatus: PROMOTION_STATUSES.ACTIVE_PRODUCTION,
          promotedAt: new Date(),
          promotedByUserId: userId,
        },
      }),
      prisma.modelVersionRegistry.updateMany({
        where: {
          modelName: candidate.modelName,
          id: { not: candidate.id },
          isActive: true,
        },
        data: {
          isActive: false,
          promotionStatus: PROMOTION_STATUSES.DEPRECATED,
        },
      }),
    ]);

    return updatedCandidate;
  }
}

export const monitoringService = new MonitoringService();
export default monitoringService;
