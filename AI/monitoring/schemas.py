"""
Pydantic Schemas for AI-9: Prediction Monitoring and Continuous Improvement
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field


# ==========================================
# Prediction and Outcome Input Records
# ==========================================

class HarvestOutcomeInput(BaseModel):
    outcome_id: str
    crop_id: str
    farm_id: str
    user_id: str
    actual_harvest_date: str  # YYYY-MM-DD or ISO
    actual_harvest_start: Optional[str] = None
    actual_harvest_end: Optional[str] = None
    season: Optional[str] = None
    outcome_source: str = "FARMER_RECORDED"
    verification_status: str = "PENDING_VERIFICATION"
    verified_at: Optional[str] = None
    consent_evaluation: bool = True
    consent_training: bool = False
    notes: Optional[str] = None
    prediction_id: Optional[str] = None


class HarvestPredictionInput(BaseModel):
    prediction_id: str
    crop_id: str
    farm_id: str
    user_id: str
    crop_name: str
    variety: Optional[str] = None
    region: Optional[str] = None
    state: Optional[str] = None
    prediction_date: str
    estimated_harvest_start: Optional[str] = None
    most_likely_harvest_date: str
    estimated_harvest_end: Optional[str] = None
    model_version: str = "2.0.0-agronomic-gdd-weather"
    model_name: str = "HarvestWindow-Predictor"
    input_snapshot: Optional[Dict[str, Any]] = None


class OutcomePredictionPair(BaseModel):
    outcome: HarvestOutcomeInput
    prediction: HarvestPredictionInput


# ==========================================
# Metric & Evaluation Output Models
# ==========================================

class PairEvaluationDetail(BaseModel):
    outcome_id: str
    prediction_id: str
    crop_id: str
    farm_id: str
    crop_name: str
    region: Optional[str] = None
    model_version: str
    actual_harvest_date: str
    predicted_harvest_date: str
    predicted_window_start: Optional[str] = None
    predicted_window_end: Optional[str] = None
    error_days: int  # actual - predicted: positive = late, negative = early
    absolute_error_days: int
    is_exact_date: bool
    is_within_3_days: bool
    is_within_7_days: bool
    is_within_window: Optional[bool] = None
    window_distance_days: Optional[int] = None
    window_relative_position: Optional[str] = None  # "WITHIN" | "EARLIER" | "LATER" | "NO_WINDOW"
    forecast_horizon_days: Optional[int] = None
    is_eligible_for_training: bool = False
    exclusion_reason: Optional[str] = None


class AggregateMetricSummary(BaseModel):
    total_evaluated: int = 0
    eligible_count: int = 0
    excluded_count: int = 0
    mean_absolute_error: Optional[float] = None
    mean_signed_error: Optional[float] = None  # Bias
    root_mean_squared_error: Optional[float] = None
    exact_date_accuracy_pct: Optional[float] = None
    within_3_days_pct: Optional[float] = None
    within_7_days_pct: Optional[float] = None
    window_coverage_pct: Optional[float] = None
    mean_window_distance: Optional[float] = None
    is_insufficient_data: bool = False
    data_quality_warnings: List[str] = []


class SubgroupBreakdown(BaseModel):
    subgroup_type: str  # "crop" | "region" | "season" | "model_version" | "horizon"
    subgroup_key: str
    metrics: AggregateMetricSummary


class BatchEvaluationRequest(BaseModel):
    pairs: List[OutcomePredictionPair]
    min_sample_size: Optional[int] = None
    filter_verification_status: Optional[str] = None  # If set, filter by status
    allow_unverified_evaluation: bool = True


class BatchEvaluationResponse(BaseModel):
    report_id: str
    generated_at: str
    model_version: str
    model_name: str
    overall: AggregateMetricSummary
    by_crop: Dict[str, AggregateMetricSummary]
    by_region: Dict[str, AggregateMetricSummary]
    by_model_version: Dict[str, AggregateMetricSummary]
    evaluations: List[PairEvaluationDetail]
    warnings: List[str]


# ==========================================
# Drift Detection Models
# ==========================================

class FeatureDriftDetail(BaseModel):
    feature_name: str
    feature_type: str  # "numerical" | "categorical"
    statistical_method: str  # "PSI" | "KS_TEST" | "CHI_SQUARE" | "MISSINGNESS"
    statistic_value: float
    p_value: Optional[float] = None
    psi: Optional[float] = None
    missing_rate_ref: Optional[float] = None
    missing_rate_curr: Optional[float] = None
    severity: str  # "NORMAL" | "WATCH" | "WARNING" | "CRITICAL" | "INSUFFICIENT_DATA"
    message: str


class DriftAnalysisRequest(BaseModel):
    reference_records: List[Dict[str, Any]]
    current_records: List[Dict[str, Any]]
    features_to_check: Optional[List[str]] = None
    model_version: Optional[str] = "2.0.0-agronomic-gdd-weather"


class PerformanceDriftRequest(BaseModel):
    baseline_evaluations: List[PairEvaluationDetail]
    current_evaluations: List[PairEvaluationDetail]
    model_version: Optional[str] = "2.0.0-agronomic-gdd-weather"


class DriftAnalysisResponse(BaseModel):
    assessment_id: str
    model_version: str
    drift_type: str  # "INPUT_DATA_DRIFT" | "PERFORMANCE_DRIFT"
    overall_severity: str  # "NORMAL" | "WATCH" | "WARNING" | "CRITICAL" | "INSUFFICIENT_DATA"
    reference_sample_size: int
    current_sample_size: int
    feature_drifts: List[FeatureDriftDetail]
    max_drift_score: float = 0.0
    recommendations: List[str]
    assessed_at: str


# ==========================================
# MLflow & Model Registry Models
# ==========================================

class ModelVersionMetadata(BaseModel):
    model_name: str
    model_version: str
    training_run_id: Optional[str] = None
    experiment_name: Optional[str] = None
    dataset_reference: Optional[str] = None
    dataset_fingerprint: Optional[str] = None
    feature_schema_ver: str = "1.0.0"
    algorithm: str = "AgronomicGDDHybrid"
    hyperparameters: Optional[Dict[str, Any]] = None
    validation_mae: Optional[float] = None
    validation_rmse: Optional[float] = None
    validation_bias: Optional[float] = None
    promotion_status: str = "CANDIDATE"  # "CANDIDATE" | "VALIDATED" | "ACTIVE_PRODUCTION" | "DEPRECATED" | "REJECTED"
    rejection_reason: Optional[str] = None
    is_active: bool = False
    promoted_at: Optional[str] = None
    artifact_path: Optional[str] = None
    created_at: str


class RetrainingEligibilityCheckRequest(BaseModel):
    verified_outcomes_count: int
    training_consented_count: int
    current_dataset_fingerprint: str
    last_trained_dataset_fingerprint: Optional[str] = None
    recent_drift_severity: str = "NORMAL"
    days_since_last_training: Optional[int] = None
    crop_diversity_count: int = 1
    region_diversity_count: int = 1


class RetrainingEligibilityResponse(BaseModel):
    is_eligible: bool
    status: str  # "ELIGIBLE" | "INSUFFICIENT_DATA" | "DATA_UNCHANGED" | "NO_TRIGGER"
    triggers_met: List[str]
    blockers: List[str]
    training_consented_count: int
    minimum_required: int
    recommended_action: str


class CandidateValidationGate(BaseModel):
    gate_name: str
    passed: bool
    incumbent_value: Optional[float] = None
    candidate_value: Optional[float] = None
    threshold: Optional[float] = None
    details: str


class CandidateComparisonResponse(BaseModel):
    candidate_model_version: str
    incumbent_model_version: str
    candidate_mae: float
    incumbent_mae: float
    mae_improvement_pct: float
    candidate_rmse: float
    incumbent_rmse: float
    candidate_exact_pct: float
    incumbent_exact_pct: float
    gates: List[CandidateValidationGate]
    all_gates_passed: bool
    recommended_decision: str  # "PROMOTE" | "REJECT" | "HOLD_FOR_MORE_EVALUATION"
    evaluated_at: str
