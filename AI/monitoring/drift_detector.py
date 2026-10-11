"""
Drift Detection Subsystem for Harvest Window Predictions
Implements Population Stability Index (PSI), Kolmogorov-Smirnov (KS) tests,
categorical distribution checks, missingness rate shifts, and performance drift.
"""

import math
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from scipy import stats
import logging

from .config import (
    MIN_SAMPLES_DRIFT_REF,
    MIN_SAMPLES_DRIFT_CURR,
    PSI_WATCH_THRESHOLD,
    PSI_WARNING_THRESHOLD,
    KS_PVALUE_THRESHOLD,
    MISSINGNESS_DELTA_THRESHOLD
)
from .schemas import (
    FeatureDriftDetail,
    DriftAnalysisResponse,
    PairEvaluationDetail
)

logger = logging.getLogger("monitoring.drift")


def calculate_psi(
    ref_vals: List[float],
    curr_vals: List[float],
    num_bins: int = 5,
    epsilon: float = 1e-4
) -> Tuple[float, str]:
    """
    Calculates Population Stability Index (PSI) between reference and current samples.
    Returns (psi_value, severity).
    Thresholds:
      PSI < 0.10: NORMAL
      0.10 <= PSI < 0.25: WATCH
      PSI >= 0.25: WARNING
    """
    ref_clean = [float(x) for x in ref_vals if x is not None and not math.isnan(float(x))]
    curr_clean = [float(x) for x in curr_vals if x is not None and not math.isnan(float(x))]

    if len(ref_clean) < 3 or len(curr_clean) < 2:
        return 0.0, "INSUFFICIENT_DATA"

    # Define bins based on reference sample quantiles
    try:
        quantiles = np.linspace(0, 100, num_bins + 1)
        bins = np.percentile(ref_clean, quantiles)
        bins = np.unique(bins)
        if len(bins) < 2:
            # Constant or near-constant feature
            return 0.0, "NORMAL"
        bins[0] = -np.inf
        bins[-1] = np.inf

        ref_counts, _ = np.histogram(ref_clean, bins=bins)
        curr_counts, _ = np.histogram(curr_clean, bins=bins)

        ref_total = len(ref_clean)
        curr_total = len(curr_clean)

        # Proportions with smoothing
        p = [(cnt / ref_total) + epsilon for cnt in ref_counts]
        q = [(cnt / curr_total) + epsilon for cnt in curr_counts]

        # Normalize proportions
        p_sum = sum(p)
        q_sum = sum(q)
        p = [x / p_sum for x in p]
        q = [x / q_sum for x in q]

        psi = sum((q[i] - p[i]) * math.log(q[i] / p[i]) for i in range(len(p)))
        psi = max(0.0, float(psi))

        if psi < PSI_WATCH_THRESHOLD:
            sev = "NORMAL"
        elif psi < PSI_WARNING_THRESHOLD:
            sev = "WATCH"
        else:
            sev = "WARNING"

        return round(psi, 4), sev
    except Exception as exc:
        logger.warning(f"Error computing PSI: {exc}")
        return 0.0, "NORMAL"


def calculate_categorical_psi(
    ref_vals: List[str],
    curr_vals: List[str],
    epsilon: float = 1e-4
) -> Tuple[float, str]:
    """
    Calculates PSI for categorical features (e.g. crop_name, region).
    """
    all_categories = sorted(list(set(ref_vals + curr_vals)))
    if not all_categories or len(ref_vals) == 0 or len(curr_vals) == 0:
        return 0.0, "INSUFFICIENT_DATA"

    ref_counts = {cat: ref_vals.count(cat) for cat in all_categories}
    curr_counts = {cat: curr_vals.count(cat) for cat in all_categories}

    ref_tot = len(ref_vals)
    curr_tot = len(curr_vals)

    p = [(ref_counts[cat] / ref_tot) + epsilon for cat in all_categories]
    q = [(curr_counts[cat] / curr_tot) + epsilon for cat in all_categories]

    p_sum = sum(p)
    q_sum = sum(q)
    p = [x / p_sum for x in p]
    q = [x / q_sum for x in q]

    psi = sum((q[i] - p[i]) * math.log(q[i] / p[i]) for i in range(len(p)))
    psi = max(0.0, float(psi))

    if psi < PSI_WATCH_THRESHOLD:
        sev = "NORMAL"
    elif psi < PSI_WARNING_THRESHOLD:
        sev = "WATCH"
    else:
        sev = "WARNING"

    return round(psi, 4), sev


def analyze_feature_drift(
    feature_name: str,
    ref_records: List[Dict[str, Any]],
    curr_records: List[Dict[str, Any]]
) -> FeatureDriftDetail:
    """
    Inspects a single feature across reference and current records for:
    - Missingness rate change
    - Distribution drift (Numerical KS test / PSI, or Categorical PSI)
    """
    ref_vals = [r.get(feature_name) for r in ref_records]
    curr_vals = [r.get(feature_name) for r in curr_records]

    ref_len = len(ref_vals)
    curr_len = len(curr_vals)

    ref_missing = sum(1 for v in ref_vals if v is None or v == "")
    curr_missing = sum(1 for v in curr_vals if v is None or v == "")

    ref_missing_rate = (ref_missing / ref_len) if ref_len > 0 else 0.0
    curr_missing_rate = (curr_missing / curr_len) if curr_len > 0 else 0.0
    missing_delta = abs(curr_missing_rate - ref_missing_rate)

    if missing_delta >= MISSINGNESS_DELTA_THRESHOLD and curr_len >= 5:
        return FeatureDriftDetail(
            feature_name=feature_name,
            feature_type="missingness",
            statistical_method="MISSINGNESS_RATE",
            statistic_value=round(missing_delta, 4),
            missing_rate_ref=round(ref_missing_rate, 4),
            missing_rate_curr=round(curr_missing_rate, 4),
            severity="WARNING" if missing_delta > 0.25 else "WATCH",
            message=f"Missingness rate for '{feature_name}' shifted from {ref_missing_rate:.1%} to {curr_missing_rate:.1%}."
        )

    # Filter out None values
    ref_non_null = [v for v in ref_vals if v is not None and v != ""]
    curr_non_null = [v for v in curr_vals if v is not None and v != ""]

    if not ref_non_null or not curr_non_null:
        return FeatureDriftDetail(
            feature_name=feature_name,
            feature_type="unknown",
            statistical_method="NONE",
            statistic_value=0.0,
            severity="INSUFFICIENT_DATA",
            message=f"Insufficient non-null observations for '{feature_name}'."
        )

    # Detect if numerical
    is_numerical = False
    try:
        sample_num = float(ref_non_null[0])
        is_numerical = True
    except (ValueError, TypeError):
        is_numerical = False

    if is_numerical:
        try:
            ref_nums = [float(v) for v in ref_non_null]
            curr_nums = [float(v) for v in curr_non_null]

            # 1. PSI
            psi_val, psi_sev = calculate_psi(ref_nums, curr_nums)

            # 2. Kolmogorov-Smirnov 2-sample test
            ks_stat, ks_pval = 0.0, 1.0
            if len(ref_nums) >= 4 and len(curr_nums) >= 3:
                res = stats.ks_2samp(ref_nums, curr_nums)
                ks_stat = float(res.statistic)
                ks_pval = float(res.pvalue)

            # Determine severity: consider both practical effect size (PSI) and p-value
            if psi_sev == "WARNING" and ks_pval < KS_PVALUE_THRESHOLD:
                final_sev = "WARNING"
                msg = f"Significant numerical distribution drift detected in '{feature_name}' (PSI={psi_val:.4f}, KS p={ks_pval:.4f})."
            elif psi_sev in ("WATCH", "WARNING") or ks_pval < KS_PVALUE_THRESHOLD:
                final_sev = "WATCH"
                msg = f"Moderate distribution shift observed in '{feature_name}' (PSI={psi_val:.4f}, KS p={ks_pval:.4f})."
            else:
                final_sev = "NORMAL"
                msg = f"Distribution of '{feature_name}' matches reference baseline (PSI={psi_val:.4f})."

            return FeatureDriftDetail(
                feature_name=feature_name,
                feature_type="numerical",
                statistical_method="PSI_AND_KS_TEST",
                statistic_value=round(ks_stat, 4),
                p_value=round(ks_pval, 4),
                psi=psi_val,
                missing_rate_ref=round(ref_missing_rate, 4),
                missing_rate_curr=round(curr_missing_rate, 4),
                severity=final_sev,
                message=msg
            )
        except Exception as exc:
            logger.warning(f"Failed numerical drift check for {feature_name}: {exc}")
            return FeatureDriftDetail(
                feature_name=feature_name,
                feature_type="numerical",
                statistical_method="PSI",
                statistic_value=0.0,
                severity="NORMAL",
                message=f"Numerical analysis fallback: {exc}"
            )
    else:
        # Categorical feature
        ref_strs = [str(v) for v in ref_non_null]
        curr_strs = [str(v) for v in curr_non_null]
        psi_val, psi_sev = calculate_categorical_psi(ref_strs, curr_strs)

        return FeatureDriftDetail(
            feature_name=feature_name,
            feature_type="categorical",
            statistical_method="CATEGORICAL_PSI",
            statistic_value=psi_val,
            psi=psi_val,
            missing_rate_ref=round(ref_missing_rate, 4),
            missing_rate_curr=round(curr_missing_rate, 4),
            severity=psi_sev,
            message=f"Categorical distribution drift for '{feature_name}' (PSI={psi_val:.4f}, severity={psi_sev})."
        )


def analyze_input_data_drift(
    reference_records: List[Dict[str, Any]],
    current_records: List[Dict[str, Any]],
    features_to_check: Optional[List[str]] = None,
    model_version: str = "2.0.0-agronomic-gdd-weather"
) -> DriftAnalysisResponse:
    """
    Performs comprehensive input data drift assessment across configured features.
    """
    ref_n = len(reference_records)
    curr_n = len(current_records)
    assessment_id = f"drift-in-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    if ref_n < MIN_SAMPLES_DRIFT_REF or curr_n < MIN_SAMPLES_DRIFT_CURR:
        return DriftAnalysisResponse(
            assessment_id=assessment_id,
            model_version=model_version,
            drift_type="INPUT_DATA_DRIFT",
            overall_severity="INSUFFICIENT_DATA",
            reference_sample_size=ref_n,
            current_sample_size=curr_n,
            feature_drifts=[],
            max_drift_score=0.0,
            recommendations=[
                f"Evaluation requires minimum {MIN_SAMPLES_DRIFT_REF} reference and {MIN_SAMPLES_DRIFT_CURR} current samples. "
                f"Currently available: ref={ref_n}, curr={curr_n}. Awaiting more prediction telemetry."
            ],
            assessed_at=now_iso
        )

    # Default features to inspect if none specified
    if not features_to_check:
        features_to_check = [
            "crop_name",
            "region",
            "sowing_day_of_year",
            "base_temperature_c",
            "gdd_required",
            "weather_adjust_days"
        ]

    feature_results = []
    max_psi = 0.0
    has_warning = False
    has_watch = False

    for feat in features_to_check:
        res = analyze_feature_drift(feat, reference_records, current_records)
        feature_results.append(res)
        if res.psi and res.psi > max_psi:
            max_psi = res.psi
        if res.severity == "WARNING":
            has_warning = True
        elif res.severity == "WATCH":
            has_watch = True

    # Rule: Input drift alone never causes CRITICAL status (prompt non-negotiable rule).
    # Critical status requires verified sustained performance degradation.
    if has_warning:
        overall_sev = "WARNING"
    elif has_watch:
        overall_sev = "WATCH"
    else:
        overall_sev = "NORMAL"

    recommendations = []
    if overall_sev == "WARNING":
        recommendations.append("Material input covariate shift detected. Review input distributions and evaluate model accuracy on recent verified outcomes.")
        recommendations.append("Assess whether recent seasonal climate anomalies or new crop adoption drive the distribution shift.")
    elif overall_sev == "WATCH":
        recommendations.append("Mild input distribution shift observed. Continue routine monitoring; no immediate operational intervention required.")
    else:
        recommendations.append("Input data distributions remain stable within historical statistical bounds.")

    return DriftAnalysisResponse(
        assessment_id=assessment_id,
        model_version=model_version,
        drift_type="INPUT_DATA_DRIFT",
        overall_severity=overall_sev,
        reference_sample_size=ref_n,
        current_sample_size=curr_n,
        feature_drifts=feature_results,
        max_drift_score=round(max_psi, 4),
        recommendations=recommendations,
        assessed_at=now_iso
    )


def analyze_performance_drift(
    baseline_evaluations: List[PairEvaluationDetail],
    current_evaluations: List[PairEvaluationDetail],
    model_version: str = "2.0.0-agronomic-gdd-weather"
) -> DriftAnalysisResponse:
    """
    Assesses model performance degradation over rolling evaluation outcomes.
    Distinguishes input covariate shifts from actual error degradation.
    """
    assessment_id = f"drift-perf-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    ref_n = len(baseline_evaluations)
    curr_n = len(current_evaluations)

    if ref_n < 5 or curr_n < 3:
        return DriftAnalysisResponse(
            assessment_id=assessment_id,
            model_version=model_version,
            drift_type="PERFORMANCE_DRIFT",
            overall_severity="INSUFFICIENT_DATA",
            reference_sample_size=ref_n,
            current_sample_size=curr_n,
            feature_drifts=[],
            max_drift_score=0.0,
            recommendations=["Insufficient verified outcomes to establish rolling performance degradation."],
            assessed_at=now_iso
        )

    base_abs = [e.absolute_error_days for e in baseline_evaluations]
    curr_abs = [e.absolute_error_days for e in current_evaluations]

    base_mae = float(sum(base_abs) / ref_n)
    curr_mae = float(sum(curr_abs) / curr_n)
    mae_ratio = curr_mae / max(0.1, base_mae)

    # Exact date and window coverage comparison
    base_w3 = sum(1 for e in baseline_evaluations if e.is_within_3_days) / ref_n
    curr_w3 = sum(1 for e in current_evaluations if e.is_within_3_days) / curr_n

    features = []
    features.append(FeatureDriftDetail(
        feature_name="mean_absolute_error_days",
        feature_type="numerical",
        statistical_method="ROLLING_MAE_RATIO",
        statistic_value=round(mae_ratio, 3),
        severity="CRITICAL" if mae_ratio >= 1.75 and curr_n >= 5 else ("WARNING" if mae_ratio >= 1.35 else "NORMAL"),
        message=f"Current MAE is {curr_mae:.2f} days vs baseline {base_mae:.2f} days (ratio {mae_ratio:.2f}x)."
    ))

    features.append(FeatureDriftDetail(
        feature_name="within_3_days_accuracy",
        feature_type="numerical",
        statistical_method="ACCURACY_DELTA",
        statistic_value=round(curr_w3 - base_w3, 3),
        severity="WARNING" if (base_w3 - curr_w3) > 0.20 else "NORMAL",
        message=f"Within ±3 days accuracy: baseline {base_w3:.1%}, current {curr_w3:.1%}."
    ))

    # Determine overall severity
    if mae_ratio >= 1.75 and curr_n >= 5:
        overall_sev = "CRITICAL"
        recs = [
            "Severe performance degradation detected. Recent predictions exhibit substantially higher errors.",
            "Trigger emergency retraining eligibility review or consider fallback to verified regional agronomic baseline."
        ]
    elif mae_ratio >= 1.35:
        overall_sev = "WARNING"
        recs = [
            "Model accuracy degradation detected (+35% MAE increase). Evaluate candidate models on recent holdout data.",
            "Verify weather data source fidelity and recent localized temperature anomalies."
        ]
    elif mae_ratio >= 1.15:
        overall_sev = "WATCH"
        recs = ["Slight upward drift in prediction error. Continue observing next harvest cycle."]
    else:
        overall_sev = "NORMAL"
        recs = ["Model performance remains stable and consistent with validation baselines."]

    return DriftAnalysisResponse(
        assessment_id=assessment_id,
        model_version=model_version,
        drift_type="PERFORMANCE_DRIFT",
        overall_severity=overall_sev,
        reference_sample_size=ref_n,
        current_sample_size=curr_n,
        feature_drifts=features,
        max_drift_score=round(mae_ratio, 3),
        recommendations=recs,
        assessed_at=now_iso
    )
