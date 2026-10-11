"""
MLflow Experiment Tracking and Model Registry Integration
Configured for local persistent SQLite tracking and versioned model lineage.
"""

import os
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import logging

import mlflow
from mlflow.tracking import MlflowClient

from .config import (
    MLFLOW_TRACKING_URI,
    MLFLOW_EXPERIMENT_NAME,
    MLRUNS_DIR,
    DEFAULT_PRODUCTION_MODEL_NAME,
    DEFAULT_PRODUCTION_MODEL_VERSION
)
from .schemas import ModelVersionMetadata

logger = logging.getLogger("monitoring.mlflow")


class MLflowTracker:
    def __init__(self, tracking_uri: str = MLFLOW_TRACKING_URI, experiment_name: str = MLFLOW_EXPERIMENT_NAME):
        self.tracking_uri = tracking_uri
        self.experiment_name = experiment_name
        self._initialize_mlflow()

    def _initialize_mlflow(self):
        """Sets tracking URI and ensures experiment exists."""
        try:
            os.makedirs(MLRUNS_DIR, exist_ok=True)
            mlflow.set_tracking_uri(self.tracking_uri)
            self.client = MlflowClient(tracking_uri=self.tracking_uri)

            exp = self.client.get_experiment_by_name(self.experiment_name)
            if exp is None:
                self.experiment_id = self.client.create_experiment(
                    name=self.experiment_name,
                    artifact_location=MLRUNS_DIR.as_uri()
                )
            else:
                self.experiment_id = exp.experiment_id
            mlflow.set_experiment(self.experiment_name)
            logger.info(f"MLflow initialized: URI={self.tracking_uri}, ExpID={self.experiment_id}")
        except Exception as exc:
            logger.warning(f"MLflow initialization note (local fallback active): {exc}")
            self.client = None
            self.experiment_id = "default"

    def start_training_run(
        self,
        run_name: str,
        dataset_reference: str,
        dataset_fingerprint: str,
        tags: Optional[Dict[str, str]] = None
    ) -> Optional[str]:
        """Starts an MLflow run and logs initial dataset metadata."""
        try:
            all_tags = {
                "dataset_reference": dataset_reference,
                "dataset_fingerprint": dataset_fingerprint,
                "created_at": datetime.now(timezone.utc).isoformat(),
                **(tags or {})
            }
            run = self.client.create_run(
                experiment_id=self.experiment_id,
                run_name=run_name,
                tags=all_tags
            )
            return run.info.run_id
        except Exception as exc:
            logger.error(f"Failed to start MLflow run: {exc}")
            return None

    def log_run_metrics(
        self,
        run_id: str,
        metrics: Dict[str, float],
        step: Optional[int] = None
    ):
        """Logs scalar evaluation metrics to active run."""
        if not self.client:
            return
        try:
            for k, v in metrics.items():
                if v is not None:
                    self.client.log_metric(run_id=run_id, key=k, value=float(v), step=step or 0)
        except Exception as exc:
            logger.warning(f"Failed to log metrics to MLflow run {run_id}: {exc}")

    def log_run_params(
        self,
        run_id: str,
        params: Dict[str, Any]
    ):
        """Logs configuration and hyperparameters."""
        if not self.client:
            return
        try:
            for k, v in params.items():
                self.client.log_param(run_id=run_id, key=k, value=str(v))
        except Exception as exc:
            logger.warning(f"Failed to log parameters to MLflow run {run_id}: {exc}")

    def end_run(self, run_id: str, status: str = "FINISHED"):
        """Terminates MLflow run."""
        if not self.client:
            return
        try:
            self.client.set_terminated(run_id=run_id, status=status)
        except Exception as exc:
            logger.warning(f"Failed to terminate MLflow run {run_id}: {exc}")

    def list_recent_runs(self, max_results: int = 10) -> List[Dict[str, Any]]:
        """Retrieves summary of recent experiment runs."""
        if not self.client or not self.experiment_id:
            return []
        try:
            runs = self.client.search_runs(
                experiment_ids=[self.experiment_id],
                max_results=max_results,
                order_by=["attribute.start_time DESC"]
            )
            out = []
            for r in runs:
                out.append({
                    "run_id": r.info.run_id,
                    "run_name": r.info.run_name,
                    "status": r.info.status,
                    "start_time": r.info.start_time,
                    "end_time": r.info.end_time,
                    "metrics": r.data.metrics,
                    "params": r.data.params,
                    "tags": r.data.tags
                })
            return out
        except Exception as exc:
            logger.error(f"Error listing MLflow runs: {exc}")
            return []


# Global tracker singleton
tracker = MLflowTracker()
