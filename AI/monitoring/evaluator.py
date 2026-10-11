"""
Batch Evaluation Orchestrator for Prediction Monitoring
Generates comprehensive accuracy summaries, subgroup breakdowns, and data quality warnings.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import logging

from .config import (
    MIN_SAMPLES_OVERALL,
    MIN_SAMPLES_SUBGROUP,
    DEFAULT_PRODUCTION_MODEL_NAME,
    DEFAULT_PRODUCTION_MODEL_VERSION
)
from .schemas import (
    BatchEvaluationRequest,
    BatchEvaluationResponse,
    PairEvaluationDetail,
    AggregateMetricSummary
)
from .metrics import (
    evaluate_pair,
    compute_aggregate_metrics,
    compute_subgroups
)

logger = logging.getLogger("monitoring.evaluator")


def run_batch_evaluation(request: BatchEvaluationRequest) -> BatchEvaluationResponse:
    """
    Executes complete evaluation across all input outcome-prediction pairs.
    """
    report_id = f"eval-rep-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    warnings: List[str] = []

    evaluations: List[PairEvaluationDetail] = []
    seen_keys = set()
    model_versions = set()

    for item in request.pairs:
        # Verification filter check
        if request.filter_verification_status:
            if item.outcome.verification_status != request.filter_verification_status:
                continue

        # Prevent duplicate outcome-prediction pair evaluations
        dedup_key = f"{item.outcome.outcome_id}_{item.prediction.prediction_id}"
        if dedup_key in seen_keys:
            continue
        seen_keys.add(dedup_key)

        ev = evaluate_pair(item.outcome, item.prediction)
        if ev:
            evaluations.append(ev)
            model_versions.add(ev.model_version)

    min_samples = request.min_sample_size or MIN_SAMPLES_OVERALL
    primary_version = next(iter(model_versions)) if model_versions else DEFAULT_PRODUCTION_MODEL_VERSION

    overall_metrics = compute_aggregate_metrics(evaluations, min_samples=min_samples)
    by_crop = compute_subgroups(evaluations, dimension="crop")
    by_region = compute_subgroups(evaluations, dimension="region")
    by_version = compute_subgroups(evaluations, dimension="model_version")

    if overall_metrics.is_insufficient_data:
        warnings.append(
            f"Overall evaluated sample size ({len(evaluations)}) is below the recommended minimum ({min_samples}). "
            f"Metrics are preliminary."
        )

    return BatchEvaluationResponse(
        report_id=report_id,
        generated_at=now_iso,
        model_version=primary_version,
        model_name=DEFAULT_PRODUCTION_MODEL_NAME,
        overall=overall_metrics,
        by_crop=by_crop,
        by_region=by_region,
        by_model_version=by_version,
        evaluations=evaluations,
        warnings=warnings + overall_metrics.data_quality_warnings
    )
