"""
Error Metrics and Evaluation Module for Harvest Date Predictions
Strict calendar-date arithmetic and agricultural validation semantics.
"""

import math
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Tuple
import logging

from .config import (
    MIN_SAMPLES_OVERALL,
    MIN_SAMPLES_SUBGROUP,
    TOLERANCE_DAYS_TIGHT,
    TOLERANCE_DAYS_STANDARD
)
from .schemas import (
    HarvestOutcomeInput,
    HarvestPredictionInput,
    PairEvaluationDetail,
    AggregateMetricSummary
)

logger = logging.getLogger("monitoring.metrics")


def parse_calendar_date(val: Any) -> Optional[date]:
    """
    Parses a string or datetime into a strict calendar date (YYYY-MM-DD),
    stripping timezone offsets to prevent accidental 1-day offsets.
    """
    if val is None:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    
    val_str = str(val).strip()
    if not val_str:
        return None
    
    # Strip time part if present: '2026-10-15T14:30:00.000Z' -> '2026-10-15'
    if "T" in val_str:
        val_str = val_str.split("T")[0]
    elif " " in val_str:
        val_str = val_str.split(" ")[0]
        
    try:
        dt = datetime.strptime(val_str[:10], "%Y-%m-%d")
        return dt.date()
    except Exception as exc:
        logger.warning(f"Failed to parse calendar date from '{val}': {exc}")
        return None


def calculate_date_error(actual_date: date, predicted_date: date) -> int:
    """
    errorDays = actualHarvestDate - predictedHarvestDate
    Interpretation:
      Positive: actual harvest was LATER than predicted.
      Negative: actual harvest was EARLIER than predicted.
      Zero: exact match.
    """
    return (actual_date - predicted_date).days


def calculate_window_metrics(
    actual_date: date,
    window_start: Optional[date],
    window_end: Optional[date]
) -> Tuple[Optional[bool], Optional[int], Optional[str]]:
    """
    Calculates window coverage, distance in days to nearest boundary,
    and relative position (WITHIN, EARLIER, LATER, NO_WINDOW).
    """
    if window_start is None and window_end is None:
        return (None, None, "NO_WINDOW")
    
    # If one boundary is missing, use the available boundary
    start = window_start or window_end
    end = window_end or window_start
    if start > end:
        start, end = end, start

    if start <= actual_date <= end:
        return (True, 0, "WITHIN")
    elif actual_date < start:
        dist = (start - actual_date).days
        return (False, dist, "EARLIER")
    else:
        dist = (actual_date - end).days
        return (False, dist, "LATER")


def evaluate_pair(
    outcome: HarvestOutcomeInput,
    prediction: HarvestPredictionInput
) -> Optional[PairEvaluationDetail]:
    """
    Evaluates a single outcome-prediction pair.
    Returns None if missing critical dates or invalid.
    """
    actual_d = parse_calendar_date(outcome.actual_harvest_date)
    predicted_d = parse_calendar_date(prediction.most_likely_harvest_date)

    if not actual_d or not predicted_d:
        return None

    w_start = parse_calendar_date(prediction.estimated_harvest_start)
    w_end = parse_calendar_date(prediction.estimated_harvest_end)
    pred_generated_d = parse_calendar_date(prediction.prediction_date)

    error_days = calculate_date_error(actual_d, predicted_d)
    abs_error_days = abs(error_days)

    is_exact = (error_days == 0)
    is_w3 = (abs_error_days <= TOLERANCE_DAYS_TIGHT)
    is_w7 = (abs_error_days <= TOLERANCE_DAYS_STANDARD)

    is_within_w, w_dist, w_pos = calculate_window_metrics(actual_d, w_start, w_end)

    horizon_days = None
    if pred_generated_d:
        horizon_days = (actual_d - pred_generated_d).days

    # Secondary training eligibility: strictly requires consent_training == True & verified outcome
    is_eligible_training = (
        outcome.consent_training is True and
        outcome.verification_status in ("VERIFIED", "CORRECTED")
    )
    exclusion_reason = None
    if not outcome.consent_training:
        exclusion_reason = "LACKS_TRAINING_CONSENT"
    elif outcome.verification_status not in ("VERIFIED", "CORRECTED"):
        exclusion_reason = f"UNVERIFIED_STATUS_{outcome.verification_status}"

    return PairEvaluationDetail(
        outcome_id=outcome.outcome_id,
        prediction_id=prediction.prediction_id,
        crop_id=outcome.crop_id,
        farm_id=outcome.farm_id,
        crop_name=prediction.crop_name,
        region=prediction.region or prediction.state or "DefaultRegion",
        model_version=prediction.model_version,
        actual_harvest_date=actual_d.isoformat(),
        predicted_harvest_date=predicted_d.isoformat(),
        predicted_window_start=w_start.isoformat() if w_start else None,
        predicted_window_end=w_end.isoformat() if w_end else None,
        error_days=error_days,
        absolute_error_days=abs_error_days,
        is_exact_date=is_exact,
        is_within_3_days=is_w3,
        is_within_7_days=is_w7,
        is_within_window=is_within_w,
        window_distance_days=w_dist,
        window_relative_position=w_pos,
        forecast_horizon_days=horizon_days,
        is_eligible_for_training=is_eligible_training,
        exclusion_reason=exclusion_reason
    )


def compute_aggregate_metrics(
    evaluations: List[PairEvaluationDetail],
    min_samples: int = MIN_SAMPLES_OVERALL
) -> AggregateMetricSummary:
    """
    Computes summary metrics over a list of evaluated pairs:
    - MAE: mean(abs(errorDays))
    - Bias: mean(errorDays)
    - RMSE: sqrt(mean(errorDays^2))
    - Exact date accuracy %
    - Within ±3 days %, Within ±7 days %
    - Harvest window coverage %
    - Mean distance outside window
    Handles small sample sizes gracefully without fabricating numbers.
    """
    total = len(evaluations)
    if total == 0:
        return AggregateMetricSummary(
            total_evaluated=0,
            eligible_count=0,
            excluded_count=0,
            is_insufficient_data=True,
            data_quality_warnings=["No eligible outcome-prediction pairs available for evaluation."]
        )

    warnings = []
    is_insufficient = (total < min_samples)
    if is_insufficient:
        warnings.append(
            f"Sample size ({total}) is below reliability threshold ({min_samples}). "
            f"Metrics represent provisional sample estimates and should be interpreted with caution."
        )

    error_vals = [e.error_days for e in evaluations]
    abs_errors = [e.absolute_error_days for e in evaluations]

    mae = float(sum(abs_errors) / total)
    bias = float(sum(error_vals) / total)
    squared_errors = [err ** 2 for err in error_vals]
    rmse = float(math.sqrt(sum(squared_errors) / total))

    exact_count = sum(1 for e in evaluations if e.is_exact_date)
    exact_pct = round((exact_count / total) * 100.0, 2)

    w3_count = sum(1 for e in evaluations if e.is_within_3_days)
    w3_pct = round((w3_count / total) * 100.0, 2)

    w7_count = sum(1 for e in evaluations if e.is_within_7_days)
    w7_pct = round((w7_count / total) * 100.0, 2)

    # Window metrics
    window_evals = [e for e in evaluations if e.is_within_window is not None]
    if window_evals:
        covered_count = sum(1 for e in window_evals if e.is_within_window is True)
        cov_pct = round((covered_count / len(window_evals)) * 100.0, 2)
        
        # Mean distance when outside window
        outside_evals = [e for e in window_evals if e.window_distance_days is not None and e.window_distance_days > 0]
        if outside_evals:
            mean_dist = round(sum(e.window_distance_days for e in outside_evals) / len(outside_evals), 2)
        else:
            mean_dist = 0.0
    else:
        cov_pct = None
        mean_dist = None

    eligible_training_count = sum(1 for e in evaluations if e.is_eligible_for_training)

    return AggregateMetricSummary(
        total_evaluated=total,
        eligible_count=total,
        excluded_count=0,
        mean_absolute_error=round(mae, 3),
        mean_signed_error=round(bias, 3),
        root_mean_squared_error=round(rmse, 3),
        exact_date_accuracy_pct=exact_pct,
        within_3_days_pct=w3_pct,
        within_7_days_pct=w7_pct,
        window_coverage_pct=cov_pct,
        mean_window_distance=mean_dist,
        is_insufficient_data=is_insufficient,
        data_quality_warnings=warnings
    )


def compute_subgroups(
    evaluations: List[PairEvaluationDetail],
    dimension: str = "crop"
) -> Dict[str, AggregateMetricSummary]:
    """
    Groups evaluation pairs by 'crop', 'region', or 'model_version'
    and calculates subgroup metrics enforcing MIN_SAMPLES_SUBGROUP.
    """
    groups: Dict[str, List[PairEvaluationDetail]] = {}
    for ev in evaluations:
        if dimension == "crop":
            key = ev.crop_name or "Unknown Crop"
        elif dimension == "region":
            key = ev.region or "Unknown Region"
        elif dimension == "model_version":
            key = ev.model_version or "Unknown Version"
        else:
            key = "Overall"
        groups.setdefault(key, []).append(ev)

    result: Dict[str, AggregateMetricSummary] = {}
    for key, group_items in sorted(groups.items()):
        result[key] = compute_aggregate_metrics(group_items, min_samples=MIN_SAMPLES_SUBGROUP)
    return result
