/**
 * Phase AI-9: Prediction Monitoring and Continuous Improvement Types
 */

export type VerificationStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "CORRECTED";

export type OutcomeSource =
  | "FARMER_RECORDED"
  | "INSPECTOR_VERIFIED"
  | "REMOTE_SENSED"
  | "HISTORICAL_RECORD";

export type DriftSeverity =
  | "NORMAL"
  | "WATCH"
  | "WARNING"
  | "CRITICAL"
  | "INSUFFICIENT_DATA";

export type DriftType =
  | "INPUT_DATA_DRIFT"
  | "PERFORMANCE_DRIFT"
  | "PREDICTION_DRIFT";

export type PromotionStatus =
  | "CANDIDATE"
  | "VALIDATED"
  | "ACTIVE_PRODUCTION"
  | "DEPRECATED"
  | "REJECTED";

export interface HarvestOutcome {
  id: string;
  userId: string;
  farmId: string;
  cropId: string;
  predictionId?: string | null;
  actualHarvestDate: string;
  actualHarvestStart?: string | null;
  actualHarvestEnd?: string | null;
  season?: string | null;
  outcomeSource: OutcomeSource;
  verificationStatus: VerificationStatus;
  verifiedAt?: string | null;
  verificationNotes?: string | null;
  consentEvaluation: boolean;
  consentTraining: boolean;
  notes?: string | null;
  correctionCount: number;
  previousOutcomeJson?: string | null;
  createdAt: string;
  updatedAt: string;
  prediction?: any;
  evaluations?: PredictionEvaluation[];
}

export interface PredictionEvaluation {
  id: string;
  outcomeId: string;
  predictionId: string;
  cropId: string;
  farmId: string;
  cropName?: string;
  region?: string;
  modelVersion: string;
  modelName: string;
  actualHarvestDate: string;
  predictedHarvestDate: string;
  predictedWindowStart?: string | null;
  predictedWindowEnd?: string | null;
  errorDays: number;
  absoluteErrorDays: number;
  isExactDate: boolean;
  isWithin3Days: boolean;
  isWithin7Days: boolean;
  isWithinWindow?: boolean | null;
  windowDistanceDays?: number | null;
  forecastHorizonDays?: number | null;
  evaluationRevision: number;
  isEligibleForTraining: boolean;
  exclusionReason?: string | null;
  calculatedAt: string;
}

export interface ModelAccuracySummary {
  source: string;
  reportId?: string;
  modelVersion: string;
  totalEvaluated: number;
  meanAbsoluteError: number | null;
  meanSignedError: number | null; // Bias
  rootMeanSquaredError: number | null;
  exactDateAccuracyPct: number | null;
  within3DaysPct: number | null;
  within7DaysPct: number | null;
  windowCoveragePct: number | null;
  meanWindowDistance?: number | null;
  isInsufficientData: boolean;
  subgroups?: Record<string, any>;
  warnings: string[];
  createdAt: string;
}

export interface FeatureDriftDetail {
  feature_name: string;
  feature_type: string;
  statistical_method: string;
  statistic_value: number;
  p_value?: number | null;
  psi?: number | null;
  missing_rate_ref?: number | null;
  missing_rate_curr?: number | null;
  severity: DriftSeverity;
  message: string;
}

export interface DriftAssessmentItem {
  id?: string;
  assessmentId: string;
  modelVersion: string;
  driftType: DriftType;
  severity: DriftSeverity;
  driftScore: number;
  threshold: number;
  referenceSampleSize: number;
  currentSampleSize: number;
  summaryDetails?: {
    feature_drifts?: FeatureDriftDetail[];
    [key: string]: any;
  } | null;
  recommendations?: string | null;
  createdAt: string;
}

export interface ModelRegistryItem {
  id: string;
  modelName: string;
  modelVersion: string;
  algorithm: string;
  promotionStatus: PromotionStatus;
  isActive: boolean;
  validationMae?: number | null;
  validationRmse?: number | null;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface ModelRegistryResponse {
  activeModel: {
    id: string;
    modelName: string;
    modelVersion: string;
    algorithm: string;
    promotionStatus: PromotionStatus;
    promotedAt?: string | null;
    validationMae?: number | null;
  };
  models: ModelRegistryItem[];
  mlflowRuns: any[];
}

export interface ModelEvaluationReportItem {
  id: string;
  reportId: string;
  modelVersion: string;
  modelName: string;
  totalEvaluated: number;
  meanAbsoluteError: number | null;
  meanSignedError: number | null;
  rootMeanSquaredError: number | null;
  exactDateAccuracyPct: number | null;
  within3DaysPct: number | null;
  within7DaysPct: number | null;
  windowCoveragePct: number | null;
  isInsufficientData: boolean;
  subgroups?: Record<string, any>;
  warnings?: string[];
  generatedBy: string;
  createdAt: string;
}

export interface MonitoringJobItem {
  id: string;
  jobType: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";
  startedAt: string;
  completedAt?: string | null;
  recordsProcessed: number;
  resultsSummary?: any;
  errorMessage?: string | null;
  triggeredBy: string;
  createdAt: string;
}

export interface RecordHarvestOutcomePayload {
  actualHarvestDate: string;
  actualHarvestStart?: string;
  actualHarvestEnd?: string;
  season?: string;
  outcomeSource?: OutcomeSource;
  consentEvaluation?: boolean;
  consentTraining?: boolean;
  notes?: string;
  predictionId?: string;
}

export interface UpdateHarvestOutcomePayload {
  actualHarvestDate?: string;
  actualHarvestStart?: string;
  actualHarvestEnd?: string;
  notes?: string;
  consentTraining?: boolean;
  consentEvaluation?: boolean;
}
