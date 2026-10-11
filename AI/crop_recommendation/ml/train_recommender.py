"""
HarvestWindow Phase AI-4: Supervised ML Classifier Trainer
Trains a lightweight, CPU-efficient Random Forest classifier on crop recommendation
features (N, P, K, temperature, humidity, pH, rainfall) with stratified validation.
"""

import os
import json
import logging
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
import joblib

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_crop_recommender")

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(os.path.dirname(CURRENT_DIR), "data", "crop_recommendation_benchmark.csv")
MODEL_DIR = os.path.join(os.path.dirname(CURRENT_DIR), "models")
OUTPUT_MODEL_PATH = os.path.join(MODEL_DIR, "crop_recommender_rf.joblib")
OUTPUT_METRICS_PATH = os.path.join(MODEL_DIR, "model_metrics.json")

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET = "label"


def train_and_export():
    os.makedirs(MODEL_DIR, exist_ok=True)

    if not os.path.exists(DATA_PATH):
        logger.error("Dataset not found at %s", DATA_PATH)
        return False

    logger.info("Loading training data from %s", DATA_PATH)
    df = pd.read_csv(DATA_PATH)

    # Validate schema
    for col in FEATURES + [TARGET]:
        if col not in df.columns:
            raise ValueError(f"Required column '{col}' missing from dataset.")

    X = df[FEATURES].astype(float)
    y = df[TARGET].astype(str)

    unique_classes = sorted(y.unique().tolist())
    logger.info("Total samples: %d, Unique crop classes: %d", len(df), len(unique_classes))

    # Build Pipeline
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1))
    ])

    # 5-fold Stratified Cross Validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scoring = ["accuracy", "f1_macro"]

    logger.info("Running 5-fold stratified cross-validation...")
    cv_results = cross_validate(pipeline, X, y, cv=cv, scoring=scoring, return_train_score=False)

    mean_acc = float(np.mean(cv_results["test_accuracy"]))
    mean_f1 = float(np.mean(cv_results["test_f1_macro"]))

    logger.info("CV Mean Accuracy: %.4f (±%.4f)", mean_acc, float(np.std(cv_results["test_accuracy"])))
    logger.info("CV Mean Macro-F1: %.4f (±%.4f)", mean_f1, float(np.std(cv_results["test_f1_macro"])))

    # Fit on complete dataset
    pipeline.fit(X, y)

    # Export joblib artifact
    joblib.dump({
        "pipeline": pipeline,
        "features": FEATURES,
        "classes": unique_classes,
        "version": "1.0.0-rf-lightweight",
        "created_at": datetime.now(timezone.utc).isoformat()
    }, OUTPUT_MODEL_PATH)
    logger.info("Saved trained model artifact to %s", OUTPUT_MODEL_PATH)

    # Save metrics report
    metrics = {
        "model_name": "RandomForestCropClassifier",
        "version": "1.0.0-rf-lightweight",
        "features": FEATURES,
        "n_samples": len(df),
        "n_classes": len(unique_classes),
        "classes": unique_classes,
        "cv_accuracy": round(mean_acc, 4),
        "cv_macro_f1": round(mean_f1, 4),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "artifact_size_kb": round(os.path.getsize(OUTPUT_MODEL_PATH) / 1024, 2)
    }

    with open(OUTPUT_METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info("Saved evaluation metrics report to %s", OUTPUT_METRICS_PATH)
    return True


if __name__ == "__main__":
    train_and_export()
