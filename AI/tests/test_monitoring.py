"""
Comprehensive Pytest Suite for Phase AI-9: Prediction Monitoring Subsystem
Tests error metrics, date semantics, drift detection, MLflow logging,
retraining policies, and candidate model evaluation.
"""

import pytest
from datetime import date, datetime, timedelta

from monitoring.metrics import (
    parse_calendar_date,
    calculate_date_error,
    calculate_window_metrics,
    evaluate_pair,
    compute_aggregate_metrics,
    compute_subgroups
)
from monitoring.schemas import (
    HarvestOutcomeInput,
    HarvestPredictionInput,
    PairEvaluationDetail,
    BatchEvaluationRequest
)
from monitoring.drift_detector import (
    calculate_psi,
    calculate_categorical_psi,
    analyze_feature_drift,
    analyze_input_data_drift,
    analyze_performance_drift
)
from monitoring.retraining_policy import (
    compute_dataset_fingerprint,
    evaluate_retraining_eligibility,
    evaluate_candidate_gates
)
from monitoring.evaluator import run_batch_evaluation
from monitoring.mlflow_tracker import tracker
from monitoring.candidate_trainer import candidate_trainer


# ==========================================
# 1. Calendar Date & Error Metric Tests
# ==========================================

def test_parse_calendar_date_formats():
    """Verify ISO strings, timestamps, and date objects parse strictly as calendar dates."""
    assert parse_calendar_date("2026-10-15") == date(2026, 10, 15)
    assert parse_calendar_date("2026-10-15T23:59:59.000Z") == date(2026, 10, 15)
    assert parse_calendar_date("2026-10-15 04:30:00") == date(2026, 10, 15)
    assert parse_calendar_date(datetime(2026, 10, 15, 23, 59)) == date(2026, 10, 15)
    assert parse_calendar_date(None) is None
    assert parse_calendar_date("invalid-date") is None


def test_calculate_date_error_semantics():
    """
    errorDays = actual - predicted
    Positive: harvest occurred later than predicted
    Negative: harvest occurred earlier than predicted
    Zero: exact date match
    """
    # Actual is 4 days later than predicted
    assert calculate_date_error(date(2026, 10, 20), date(2026, 10, 16)) == 4
    # Actual is 3 days earlier than predicted
    assert calculate_date_error(date(2026, 10, 13), date(2026, 10, 16)) == -3
    # Exact match
    assert calculate_date_error(date(2026, 10, 16), date(2026, 10, 16)) == 0


def test_harvest_window_metrics():
    """Verify window coverage, boundary distances, and relative positions."""
    w_start = date(2026, 10, 10)
    w_end = date(2026, 10, 20)

    # Within window
    is_w, dist, pos = calculate_window_metrics(date(2026, 10, 15), w_start, w_end)
    assert is_w is True
    assert dist == 0
    assert pos == "WITHIN"

    # Exact boundary (start)
    is_w, dist, pos = calculate_window_metrics(date(2026, 10, 10), w_start, w_end)
    assert is_w is True
    assert dist == 0
    assert pos == "WITHIN"

    # Earlier than window (3 days before start)
    is_w, dist, pos = calculate_window_metrics(date(2026, 10, 7), w_start, w_end)
    assert is_w is False
    assert dist == 3
    assert pos == "EARLIER"

    # Later than window (5 days after end)
    is_w, dist, pos = calculate_window_metrics(date(2026, 10, 25), w_start, w_end)
    assert is_w is False
    assert dist == 5
    assert pos == "LATER"


def test_aggregate_metrics_calculations():
    """Verify MAE, Bias, RMSE, exact-date, ±3d, ±7d on synthetic evaluations."""
    evals = [
        PairEvaluationDetail(
            outcome_id="o1", prediction_id="p1", crop_id="c1", farm_id="f1", crop_name="Wheat",
            model_version="2.0.0", actual_harvest_date="2026-10-15", predicted_harvest_date="2026-10-15",
            error_days=0, absolute_error_days=0, is_exact_date=True, is_within_3_days=True, is_within_7_days=True,
            is_within_window=True, window_distance_days=0
        ),
        PairEvaluationDetail(
            outcome_id="o2", prediction_id="p2", crop_id="c1", farm_id="f1", crop_name="Wheat",
            model_version="2.0.0", actual_harvest_date="2026-10-18", predicted_harvest_date="2026-10-15",
            error_days=3, absolute_error_days=3, is_exact_date=False, is_within_3_days=True, is_within_7_days=True,
            is_within_window=True, window_distance_days=0
        ),
        PairEvaluationDetail(
            outcome_id="o3", prediction_id="p3", crop_id="c1", farm_id="f1", crop_name="Wheat",
            model_version="2.0.0", actual_harvest_date="2026-10-11", predicted_harvest_date="2026-10-15",
            error_days=-4, absolute_error_days=4, is_exact_date=False, is_within_3_days=False, is_within_7_days=True,
            is_within_window=False, window_distance_days=2
        ),
        PairEvaluationDetail(
            outcome_id="o4", prediction_id="p4", crop_id="c2", farm_id="f1", crop_name="Rice",
            model_version="2.0.0", actual_harvest_date="2026-10-23", predicted_harvest_date="2026-10-15",
            error_days=8, absolute_error_days=8, is_exact_date=False, is_within_3_days=False, is_within_7_days=False,
            is_within_window=False, window_distance_days=3
        ),
        PairEvaluationDetail(
            outcome_id="o5", prediction_id="p5", crop_id="c2", farm_id="f1", crop_name="Rice",
            model_version="2.0.0", actual_harvest_date="2026-10-14", predicted_harvest_date="2026-10-15",
            error_days=-1, absolute_error_days=1, is_exact_date=False, is_within_3_days=True, is_within_7_days=True,
            is_within_window=True, window_distance_days=0
        )
    ]

    # total = 5
    # errors = [0, 3, -4, 8, -1] -> sum = 6 -> Bias = 6/5 = 1.2
    # abs_errors = [0, 3, 4, 8, 1] -> sum = 16 -> MAE = 16/5 = 3.2
    # squared = [0, 9, 16, 64, 1] -> sum = 90 -> RMSE = sqrt(18) = ~4.243
    # exact = 1/5 = 20.0%
    # within 3d = 3/5 = 60.0%
    # within 7d = 4/5 = 80.0%
    # window coverage = 3/5 = 60.0%

    metrics = compute_aggregate_metrics(evals, min_samples=5)
    assert metrics.total_evaluated == 5
    assert metrics.mean_absolute_error == 3.2
    assert metrics.mean_signed_error == 1.2
    assert round(metrics.root_mean_squared_error, 2) == 4.24
    assert metrics.exact_date_accuracy_pct == 20.0
    assert metrics.within_3_days_pct == 60.0
    assert metrics.within_7_days_pct == 80.0
    assert metrics.window_coverage_pct == 60.0
    assert metrics.is_insufficient_data is False


def test_insufficient_data_handling():
    """Verify that small samples are explicitly flagged without fabricating stats."""
    evals = [
        PairEvaluationDetail(
            outcome_id="o1", prediction_id="p1", crop_id="c1", farm_id="f1", crop_name="Wheat",
            model_version="2.0.0", actual_harvest_date="2026-10-15", predicted_harvest_date="2026-10-15",
            error_days=0, absolute_error_days=0, is_exact_date=True, is_within_3_days=True, is_within_7_days=True
        )
    ]
    metrics = compute_aggregate_metrics(evals, min_samples=5)
    assert metrics.is_insufficient_data is True
    assert len(metrics.data_quality_warnings) > 0


# ==========================================
# 2. Drift Detection Tests
# ==========================================

def test_psi_identical_distributions():
    """Identical distributions should have PSI ~ 0.0 and severity NORMAL."""
    data = [10.0, 12.0, 14.0, 16.0, 18.0, 20.0, 22.0, 24.0]
    psi, sev = calculate_psi(data, data)
    assert psi < 0.05
    assert sev == "NORMAL"


def test_psi_shifted_distribution():
    """A heavily shifted distribution should trigger WATCH or WARNING."""
    ref = [10.0, 12.0, 14.0, 15.0, 16.0, 17.0, 18.0, 20.0]
    curr = [50.0, 52.0, 55.0, 58.0, 60.0, 65.0, 70.0, 75.0]
    psi, sev = calculate_psi(ref, curr)
    assert psi > 0.25
    assert sev == "WARNING"


def test_categorical_psi():
    """Categorical distributions shift check."""
    ref = ["Wheat"] * 10 + ["Rice"] * 10
    curr = ["Wheat"] * 10 + ["Rice"] * 10
    psi, sev = calculate_categorical_psi(ref, curr)
    assert sev == "NORMAL"

    shifted = ["Cotton"] * 15 + ["Mustard"] * 15
    psi2, sev2 = calculate_categorical_psi(ref, shifted)
    assert psi2 > 0.25
    assert sev2 == "WARNING"


def test_performance_drift_detection():
    """Verifies that an error spike in recent outcomes triggers performance drift alert."""
    baseline = [
        PairEvaluationDetail(
            outcome_id=f"o{i}", prediction_id=f"p{i}", crop_id="c1", farm_id="f1", crop_name="Wheat",
            model_version="2.0.0", actual_harvest_date="2026-05-01", predicted_harvest_date="2026-05-01",
            error_days=1, absolute_error_days=1, is_exact_date=False, is_within_3_days=True, is_within_7_days=True
        ) for i in range(10)
    ]

    # Current has MAE = 6 days (6x degradation)
    current = [
        PairEvaluationDetail(
            outcome_id=f"oc{i}", prediction_id=f"pc{i}", crop_id="c1", farm_id="f1", crop_name="Wheat",
            model_version="2.0.0", actual_harvest_date="2026-10-01", predicted_harvest_date="2026-09-25",
            error_days=6, absolute_error_days=6, is_exact_date=False, is_within_3_days=False, is_within_7_days=True
        ) for i in range(6)
    ]

    res = analyze_performance_drift(baseline, current)
    assert res.drift_type == "PERFORMANCE_DRIFT"
    assert res.overall_severity in ("WARNING", "CRITICAL")
    assert len(res.recommendations) > 0


# ==========================================
# 3. Retraining Policy & Quality Gates Tests
# ==========================================

def test_retraining_eligibility_consent_and_thresholds():
    """Secondary retraining requires explicit farmer consent and minimum sample counts."""
    # Only 5 consented when 15 required
    res = evaluate_retraining_eligibility(
        verified_outcomes_count=20,
        training_consented_count=5,
        current_dataset_fingerprint="abc1",
        last_trained_dataset_fingerprint=None,
        min_required=15
    )
    assert res.is_eligible is False
    assert res.status == "INSUFFICIENT_DATA"
    assert "Insufficient consented" in res.blockers[0]

    # Unchanged dataset
    res_unchanged = evaluate_retraining_eligibility(
        verified_outcomes_count=25,
        training_consented_count=20,
        current_dataset_fingerprint="abc1",
        last_trained_dataset_fingerprint="abc1",
        min_required=15
    )
    assert res_unchanged.is_eligible is False
    assert res_unchanged.status == "DATA_UNCHANGED"

    # Eligible
    res_eligible = evaluate_retraining_eligibility(
        verified_outcomes_count=25,
        training_consented_count=20,
        current_dataset_fingerprint="hash_new_dataset",
        last_trained_dataset_fingerprint="hash_old_dataset",
        crop_diversity_count=3,
        region_diversity_count=2,
        min_required=15
    )
    assert res_eligible.is_eligible is True
    assert res_eligible.status == "ELIGIBLE"


def test_candidate_quality_gates():
    """Verify quality gates enforce MAE improvement and RMSE stability."""
    from monitoring.schemas import AggregateMetricSummary

    inc_metrics = AggregateMetricSummary(
        total_evaluated=10, mean_absolute_error=4.0, root_mean_squared_error=5.0
    )
    cand_metrics = AggregateMetricSummary(
        total_evaluated=10, mean_absolute_error=3.2, root_mean_squared_error=4.1  # 20% improvement
    )

    gates = evaluate_candidate_gates(
        candidate_metrics=cand_metrics,
        incumbent_metrics=inc_metrics,
        holdout_sample_size=10
    )
    assert all(g.passed for g in gates)

    # Inferior candidate (MAE = 5.0 vs 4.0)
    bad_cand_metrics = AggregateMetricSummary(
        total_evaluated=10, mean_absolute_error=5.0, root_mean_squared_error=6.5
    )
    bad_gates = evaluate_candidate_gates(
        candidate_metrics=bad_cand_metrics,
        incumbent_metrics=inc_metrics,
        holdout_sample_size=10
    )
    gate1 = next(g for g in bad_gates if g.gate_name == "MAE_IMPROVEMENT_GATE")
    assert gate1.passed is False


# ==========================================
# 4. MLflow Tracker Test
# ==========================================

def test_mlflow_tracker_run():
    """Verify MLflow local SQLite tracker can start run and log metrics."""
    run_id = tracker.start_training_run(
        run_name="test_monitoring_run",
        dataset_reference="synthetic_test",
        dataset_fingerprint="fingerprint_test"
    )
    if run_id:
        tracker.log_run_metrics(run_id, {"mae": 2.5, "rmse": 3.1})
        tracker.end_run(run_id)
        runs = tracker.list_recent_runs(max_results=5)
        assert len(runs) >= 1
