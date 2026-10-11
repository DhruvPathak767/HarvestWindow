"""
Candidate Model Trainer & Incumbent Benchmark Comparison
Orchestrates candidate training on consented outcomes, holdout evaluation, MLflow run logging, and quality gate execution.
"""

import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
import logging
import numpy as np

import joblib
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import train_test_split

from .config import (
    ARTIFACTS_DIR,
    DEFAULT_PRODUCTION_MODEL_NAME,
    DEFAULT_PRODUCTION_MODEL_VERSION
)
from .schemas import (
    OutcomePredictionPair,
    PairEvaluationDetail,
    AggregateMetricSummary,
    CandidateComparisonResponse
)
from .metrics import (
    evaluate_pair,
    compute_aggregate_metrics,
    compute_subgroups,
    parse_calendar_date,
    calculate_date_error
)
from .retraining_policy import (
    evaluate_candidate_gates,
    compute_dataset_fingerprint
)
from .mlflow_tracker import tracker

logger = logging.getLogger("monitoring.trainer")


class CandidateTrainer:
    def __init__(self):
        os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    def train_and_evaluate_candidate(
        self,
        consented_pairs: List[OutcomePredictionPair],
        candidate_version: Optional[str] = None,
        incumbent_version: str = DEFAULT_PRODUCTION_MODEL_VERSION
    ) -> CandidateComparisonResponse:
        """
        Runs candidate training and benchmarks it against the incumbent production model.
        """
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()
        
        if not candidate_version:
            candidate_version = f"2.1.0-candidate-{now_dt.strftime('%Y%m%d%H%M')}"

        # 1. Evaluate all pairs under current incumbent model
        incumbent_evals: List[PairEvaluationDetail] = []
        for pair in consented_pairs:
            ev = evaluate_pair(pair.outcome, pair.prediction)
            if ev:
                incumbent_evals.append(ev)

        total_samples = len(incumbent_evals)
        if total_samples < 4:
            raise ValueError(f"Insufficient consented training records ({total_samples} available; minimum 4 required).")

        # 2. Train / Holdout Split (80% train, 20% holdout test)
        train_pairs, test_pairs = train_test_split(consented_pairs, test_size=0.25, random_state=42)
        
        # 3. Start MLflow Run
        dataset_fingerprint = compute_dataset_fingerprint([
            {"crop_id": p.outcome.crop_id, "actual_harvest_date": p.outcome.actual_harvest_date}
            for p in consented_pairs
        ])
        
        run_id = tracker.start_training_run(
            run_name=f"candidate_training_{candidate_version}",
            dataset_reference=f"consented_outcomes_n{total_samples}",
            dataset_fingerprint=dataset_fingerprint,
            tags={
                "candidate_version": candidate_version,
                "incumbent_version": incumbent_version,
                "algorithm": "HistGradientBoostingRegressor_ResidualOptimizer"
            }
        )

        # 4. Fit candidate model (Residual error regressor on features)
        # Feature vector: [sowing_day_of_year, base_temp, gdd_req, weather_adj]
        X_train, y_train = [], []
        for p in train_pairs:
            act_d = parse_calendar_date(p.outcome.actual_harvest_date)
            pred_d = parse_calendar_date(p.prediction.most_likely_harvest_date)
            sow_d = parse_calendar_date(p.prediction.prediction_date)
            if act_d and pred_d:
                err = (act_d - pred_d).days
                sow_doy = sow_d.timetuple().tm_yday if sow_d else 150
                snap = p.prediction.input_snapshot or {}
                base_t = float(snap.get("base_temp", 10.0))
                gdd_req = float(snap.get("required_gdd", 1500.0))
                w_adj = float(snap.get("weather_adjust_days", 0.0))
                X_train.append([sow_doy, base_t, gdd_req, w_adj])
                y_train.append(err)

        if len(X_train) >= 3:
            model = HistGradientBoostingRegressor(max_iter=50, max_leaf_nodes=15, random_state=42)
            model.fit(np.array(X_train), np.array(y_train))
        else:
            model = None

        # 5. Evaluate both candidate and incumbent on Holdout Test Set
        cand_test_evals: List[PairEvaluationDetail] = []
        inc_test_evals: List[PairEvaluationDetail] = []

        for p in test_pairs:
            inc_ev = evaluate_pair(p.outcome, p.prediction)
            if not inc_ev:
                continue
            inc_test_evals.append(inc_ev)

            # Candidate prediction adjusts incumbent by model prediction
            act_d = parse_calendar_date(p.outcome.actual_harvest_date)
            inc_pred_d = parse_calendar_date(p.prediction.most_likely_harvest_date)
            sow_d = parse_calendar_date(p.prediction.prediction_date)
            snap = p.prediction.input_snapshot or {}
            
            if model and act_d and inc_pred_d:
                feat = np.array([[
                    sow_d.timetuple().tm_yday if sow_d else 150,
                    float(snap.get("base_temp", 10.0)),
                    float(snap.get("required_gdd", 1500.0)),
                    float(snap.get("weather_adjust_days", 0.0))
                ]])
                predicted_residual = float(model.predict(feat)[0])
                # Bounded adjustment (-7 to +7 days)
                bounded_adj = int(round(np.clip(predicted_residual, -7.0, 7.0)))
                cand_pred_d = inc_pred_d + timedelta(days=bounded_adj)
            else:
                cand_pred_d = inc_pred_d

            # Create synthetic candidate prediction for evaluation
            cand_pred_input = p.prediction.copy(update={
                "most_likely_harvest_date": cand_pred_d.isoformat(),
                "model_version": candidate_version
            })
            cand_ev = evaluate_pair(p.outcome, cand_pred_input)
            if cand_ev:
                cand_test_evals.append(cand_ev)

        # 6. Compute Aggregate Holdout Metrics
        inc_metrics = compute_aggregate_metrics(inc_test_evals, min_samples=1)
        cand_metrics = compute_aggregate_metrics(cand_test_evals, min_samples=1)

        # Subgroups
        inc_crop_metrics = compute_subgroups(inc_test_evals, "crop")
        cand_crop_metrics = compute_subgroups(cand_test_evals, "crop")

        # 7. Evaluate Quality Gates
        gates = evaluate_candidate_gates(
            candidate_metrics=cand_metrics,
            incumbent_metrics=inc_metrics,
            candidate_crop_metrics=cand_crop_metrics,
            incumbent_crop_metrics=inc_crop_metrics,
            holdout_sample_size=len(test_pairs)
        )

        all_passed = all(g.passed for g in gates)
        rec_decision = "PROMOTE" if all_passed else "REJECT"

        # 8. Save artifact if model exists
        if model:
            artifact_filename = f"model_{candidate_version}.joblib"
            artifact_path = os.path.join(ARTIFACTS_DIR, artifact_filename)
            joblib.dump(model, artifact_path)

        # 9. Log Metrics & Terminate MLflow Run
        if run_id:
            tracker.log_run_metrics(run_id, {
                "candidate_mae": cand_metrics.mean_absolute_error or 0.0,
                "incumbent_mae": inc_metrics.mean_absolute_error or 0.0,
                "candidate_rmse": cand_metrics.root_mean_squared_error or 0.0,
                "incumbent_rmse": inc_metrics.root_mean_squared_error or 0.0,
                "holdout_samples": float(len(test_pairs))
            })
            tracker.log_run_params(run_id, {
                "candidate_version": candidate_version,
                "incumbent_version": incumbent_version,
                "all_gates_passed": str(all_passed),
                "decision": rec_decision
            })
            tracker.end_run(run_id, status="FINISHED" if all_passed else "FAILED")

        cand_mae = cand_metrics.mean_absolute_error or 0.0
        inc_mae = inc_metrics.mean_absolute_error or 0.0
        mae_imp_pct = round(((inc_mae - cand_mae) / max(0.1, inc_mae)) * 100.0, 2)

        return CandidateComparisonResponse(
            candidate_model_version=candidate_version,
            incumbent_model_version=incumbent_version,
            candidate_mae=cand_mae,
            incumbent_mae=inc_mae,
            mae_improvement_pct=mae_imp_pct,
            candidate_rmse=cand_metrics.root_mean_squared_error or 0.0,
            incumbent_rmse=inc_metrics.root_mean_squared_error or 0.0,
            candidate_exact_pct=cand_metrics.exact_date_accuracy_pct or 0.0,
            incumbent_exact_pct=inc_metrics.exact_date_accuracy_pct or 0.0,
            gates=gates,
            all_gates_passed=all_passed,
            recommended_decision=rec_decision,
            evaluated_at=now_iso
        )


candidate_trainer = CandidateTrainer()
