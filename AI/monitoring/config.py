"""
Phase AI-9: Prediction Monitoring and Continuous Improvement Configuration
"""

import os
from pathlib import Path

# Paths
AI_DIR = Path(__file__).resolve().parent.parent
MONITORING_DIR = AI_DIR / "monitoring"
ARTIFACTS_DIR = AI_DIR / "harvest_prediction" / "artifacts"
MLRUNS_DIR = AI_DIR / "mlruns"
MLFLOW_DB_PATH = AI_DIR / "mlflow.db"

# MLflow Tracking URI - SQLite local persistence (no external paid cloud service required)
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", f"sqlite:///{MLFLOW_DB_PATH.as_posix()}")
MLFLOW_EXPERIMENT_NAME = os.getenv("MLFLOW_EXPERIMENT_NAME", "harvest_prediction_monitoring")

# Evaluation Thresholds & Tolerances
TOLERANCE_DAYS_TIGHT = 3
TOLERANCE_DAYS_STANDARD = 7

# Minimum Observation Thresholds
MIN_SAMPLES_OVERALL = int(os.getenv("MIN_SAMPLES_OVERALL", "5"))
MIN_SAMPLES_SUBGROUP = int(os.getenv("MIN_SAMPLES_SUBGROUP", "3"))
MIN_SAMPLES_DRIFT_REF = int(os.getenv("MIN_SAMPLES_DRIFT_REF", "10"))
MIN_SAMPLES_DRIFT_CURR = int(os.getenv("MIN_SAMPLES_DRIFT_CURR", "5"))
MIN_SAMPLES_RETRAINING = int(os.getenv("MIN_SAMPLES_RETRAINING", "15"))

# Drift PSI Thresholds
PSI_WATCH_THRESHOLD = 0.10
PSI_WARNING_THRESHOLD = 0.25
KS_PVALUE_THRESHOLD = 0.05
MISSINGNESS_DELTA_THRESHOLD = 0.15

# Retraining & Promotion Quality Gates
PROMOTION_MAE_IMPROVEMENT_PCT = 0.05   # Candidate must be >= 5% better MAE or non-inferior
PROMOTION_MAX_SUBGROUP_DEGRADATION_DAYS = 2.0  # Max acceptable MAE degradation on any major crop
MIN_HOLDOUT_SAMPLES = 5

# Production Active Model Fallback
DEFAULT_PRODUCTION_MODEL_NAME = "HarvestWindow-Predictor"
DEFAULT_PRODUCTION_MODEL_VERSION = "2.0.0-agronomic-gdd-weather"
