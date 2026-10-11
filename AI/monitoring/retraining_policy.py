"""
Retraining Eligibility Policy and Candidate Validation Quality Gates
Enforces strict consent filtering, dataset diversity, and holdout gates before promotion.
"""

from typing import List, Dict, Any, Optional
import hashlib
import json
import logging

from .config import (
    MIN_SAMPLES_RETRAINING,
    MIN_HOLDOUT_SAMPLES,
    PROMOTION_MAE_IMPROVEMENT_PCT,
    PROMOTION_MAX_SUBGROUP_DEGRADATION_DAYS
)
from .schemas import (
    RetrainingEligibilityResponse,
    CandidateValidationGate,
    CandidateComparisonResponse,
    AggregateMetricSummary
)

logger = logging.getLogger("monitoring.retraining_policy")


def compute_dataset_fingerprint(records: List[Dict[str, Any]]) -> str:
    """Computes a deterministic SHA256 hash of eligible training records."""
    sorted_keys = sorted([f"{r.get('crop_id')}:{r.get('actual_harvest_date')}" for r in records])
    serialized = json.dumps(sorted_keys, sort_keys=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def evaluate_retraining_eligibility(
    verified_outcomes_count: int,
    training_consented_count: int,
    current_dataset_fingerprint: str,
    last_trained_dataset_fingerprint: Optional[str] = None,
    recent_drift_severity: str = "NORMAL",
    days_since_last_training: Optional[int] = None,
    crop_diversity_count: int = 1,
    region_diversity_count: int = 1,
    min_required: int = MIN_SAMPLES_RETRAINING
) -> RetrainingEligibilityResponse:
    """
    Evaluates whether a new candidate training workflow should be triggered.
    """
    triggers_met = []
    blockers = []

    # 1. Verification and Consent Gate
    if training_consented_count < min_required:
        blockers.append(
            f"Insufficient consented verified outcomes ({training_consented_count} / {min_required} required). "
            f"Note: Total verified is {verified_outcomes_count}, but only {training_consented_count} have explicit retraining consent."
        )
    else:
        triggers_met.append(f"Sufficient consented outcomes available ({training_consented_count} >= {min_required})")

    # 2. Dataset Unchanged Check
    if last_trained_dataset_fingerprint and current_dataset_fingerprint == last_trained_dataset_fingerprint:
        blockers.append("Training dataset is identical to previously trained snapshot (fingerprint unchanged). Redundant retraining prevented.")

    # 3. Diversity Check
    if crop_diversity_count < 2 and region_diversity_count < 2 and training_consented_count > 0:
        blockers.append(f"Insufficient agricultural diversity (found {crop_diversity_count} crops, {region_diversity_count} regions; minimum 2 required).")

    # 4. Triggers
    if recent_drift_severity in ("WARNING", "CRITICAL"):
        triggers_met.append(f"Performance or input drift detected (severity={recent_drift_severity})")

    if days_since_last_training is not None and days_since_last_training >= 30:
        triggers_met.append(f"Periodic retraining cycle elapsed ({days_since_last_training} days >= 30 days)")

    # Decision
    is_eligible = (len(blockers) == 0 and len(triggers_met) > 0)
    
    if len(blockers) > 0:
        if "Insufficient consented" in blockers[0]:
            status = "INSUFFICIENT_DATA"
        elif "identical" in blockers[0]:
            status = "DATA_UNCHANGED"
        else:
            status = "BLOCKED"
        rec_action = "Defer training until more verified, consented harvest observations are submitted."
    else:
        status = "ELIGIBLE"
        rec_action = "Authorize candidate model training run and evaluate against production incumbent."

    return RetrainingEligibilityResponse(
        is_eligible=is_eligible,
        status=status,
        triggers_met=triggers_met,
        blockers=blockers,
        training_consented_count=training_consented_count,
        minimum_required=min_required,
        recommended_action=rec_action
    )


def evaluate_candidate_gates(
    candidate_metrics: AggregateMetricSummary,
    incumbent_metrics: AggregateMetricSummary,
    candidate_crop_metrics: Optional[Dict[str, AggregateMetricSummary]] = None,
    incumbent_crop_metrics: Optional[Dict[str, AggregateMetricSummary]] = None,
    holdout_sample_size: int = 10
) -> List[CandidateValidationGate]:
    """
    Executes formal quality gates comparing candidate to incumbent.
    """
    gates: List[CandidateValidationGate] = []

    cand_mae = candidate_metrics.mean_absolute_error or 999.0
    inc_mae = incumbent_metrics.mean_absolute_error or 999.0

    cand_rmse = candidate_metrics.root_mean_squared_error or 999.0
    inc_rmse = incumbent_metrics.root_mean_squared_error or 999.0

    # Gate 1: MAE Improvement or Non-Inferiority
    # Either improves MAE by configured %, or is non-inferior within 0.2 days
    mae_diff = inc_mae - cand_mae
    mae_imp_pct = (mae_diff / max(0.1, inc_mae)) if inc_mae > 0 else 0.0
    gate1_passed = (mae_imp_pct >= PROMOTION_MAE_IMPROVEMENT_PCT) or (abs(cand_mae - inc_mae) <= 0.2 and cand_mae <= inc_mae)
    
    gates.append(CandidateValidationGate(
        gate_name="MAE_IMPROVEMENT_GATE",
        passed=gate1_passed,
        incumbent_value=round(inc_mae, 3),
        candidate_value=round(cand_mae, 3),
        threshold=round(PROMOTION_MAE_IMPROVEMENT_PCT, 3),
        details=(
            f"Candidate MAE is {cand_mae:.3f} days vs incumbent {inc_mae:.3f} days "
            f"({mae_imp_pct:+.1%} improvement; threshold is >={PROMOTION_MAE_IMPROVEMENT_PCT:.1%})."
        )
    ))

    # Gate 2: RMSE Tail-Error Control
    # Candidate RMSE cannot be worse than incumbent by > 5%
    rmse_ratio = (cand_rmse / max(0.1, inc_rmse)) if inc_rmse > 0 else 1.0
    gate2_passed = (rmse_ratio <= 1.05)
    gates.append(CandidateValidationGate(
        gate_name="RMSE_STABILITY_GATE",
        passed=gate2_passed,
        incumbent_value=round(inc_rmse, 3),
        candidate_value=round(cand_rmse, 3),
        threshold=1.05,
        details=f"Candidate RMSE is {cand_rmse:.3f} vs incumbent {inc_rmse:.3f} (ratio {rmse_ratio:.2f} <= 1.05)."
    ))

    # Gate 3: Holdout Sample Size
    gate3_passed = (holdout_sample_size >= MIN_HOLDOUT_SAMPLES)
    gates.append(CandidateValidationGate(
        gate_name="HOLDOUT_SAMPLE_SIZE_GATE",
        passed=gate3_passed,
        incumbent_value=float(holdout_sample_size),
        candidate_value=float(holdout_sample_size),
        threshold=float(MIN_HOLDOUT_SAMPLES),
        details=f"Holdout evaluation sample size {holdout_sample_size} >= minimum {MIN_HOLDOUT_SAMPLES}."
    ))

    # Gate 4: Subgroup Degradation Check
    # Check that candidate does not severely degrade accuracy on any major crop
    subgroup_degraded = False
    degradation_info = []
    if candidate_crop_metrics and incumbent_crop_metrics:
        for crop_name, cand_crop in candidate_crop_metrics.items():
            if crop_name in incumbent_crop_metrics:
                inc_crop = incumbent_crop_metrics[crop_name]
                c_mae = cand_crop.mean_absolute_error or 0.0
                i_mae = inc_crop.mean_absolute_error or 0.0
                if (c_mae - i_mae) > PROMOTION_MAX_SUBGROUP_DEGRADATION_DAYS:
                    subgroup_degraded = True
                    degradation_info.append(f"{crop_name} (+{c_mae - i_mae:.2f}d)")

    gate4_passed = not subgroup_degraded
    gates.append(CandidateValidationGate(
        gate_name="SUBGROUP_NON_DEGRADATION_GATE",
        passed=gate4_passed,
        threshold=PROMOTION_MAX_SUBGROUP_DEGRADATION_DAYS,
        details=(
            "No unacceptable subgroup degradation observed." if gate4_passed
            else f"Subgroups degraded beyond {PROMOTION_MAX_SUBGROUP_DEGRADATION_DAYS} days: {', '.join(degradation_info)}."
        )
    ))

    return gates
