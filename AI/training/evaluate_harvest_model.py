"""
Model Evaluation and Baseline Comparison Script (Layer D)
Computes MAE, RMSE, error distribution by crop and region,
and compares ML performance directly against Agronomic Baseline.
"""

import os
import sys
import json
import logging
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
import joblib

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_ROOT = os.path.dirname(CURRENT_DIR)
if AI_ROOT not in sys.path:
    sys.path.insert(0, AI_ROOT)

from harvest_prediction.features import featurize_to_array
from harvest_prediction.crop_knowledge import VERIFIED_CROP_KNOWLEDGE
from training.train_harvest_model import generate_verification_benchmark_data

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("evaluate_harvest_model")

ARTIFACTS_DIR = os.path.join(AI_ROOT, "harvest_prediction", "artifacts")

def evaluate():
    model_path = os.path.join(ARTIFACTS_DIR, "harvest_rf_model.joblib")
    vocab_path = os.path.join(ARTIFACTS_DIR, "model_vocabs.joblib")
    
    if not os.path.exists(model_path) or not os.path.exists(vocab_path):
        logger.warning("Trained model artifact not found at %s. Run train_harvest_model.py first.", model_path)
        return
        
    model = joblib.load(model_path)
    vocabs = joblib.load(vocab_path)
    
    test_df = generate_verification_benchmark_data(num_samples=300)
    
    X_rows = []
    baseline_preds = []
    
    for _, row in test_df.iterrows():
        feat_dict = row.to_dict()
        vec = featurize_to_array(
            feat_dict,
            vocabs["crop_vocab"],
            vocabs["state_vocab"],
            vocabs["season_vocab"]
        )
        X_rows.append(vec)
        
        # Agronomic baseline prediction: typical_duration - days_since_sowing
        base_pred = max(0, row["typical_duration_days"] - row["days_since_sowing"])
        baseline_preds.append(base_pred)
        
    X_test = np.array(X_rows, dtype=np.float32)
    y_true = test_df["target_days_to_harvest"].values.astype(np.float32)
    baseline_preds = np.array(baseline_preds, dtype=np.float32)
    
    ml_preds = model.predict(X_test)
    
    ml_mae = mean_absolute_error(y_true, ml_preds)
    ml_rmse = root_mean_squared_error(y_true, ml_preds)
    
    base_mae = mean_absolute_error(y_true, baseline_preds)
    base_rmse = root_mean_squared_error(y_true, baseline_preds)
    
    logger.info("================ EVALUATION SUMMARY ================")
    logger.info("Agronomic Baseline MAE: %.2f days | RMSE: %.2f days", base_mae, base_rmse)
    logger.info("ML Model MAE:           %.2f days | RMSE: %.2f days", ml_mae, ml_rmse)
    logger.info("Improvement over baseline MAE: %.2f days", base_mae - ml_mae)
    
    # Error distribution by crop
    test_df["ml_error"] = np.abs(y_true - ml_preds)
    test_df["baseline_error"] = np.abs(y_true - baseline_preds)
    
    logger.info("\nMean Absolute Error by Crop:")
    crop_stats = test_df.groupby("crop_canonical")[["baseline_error", "ml_error"]].mean()
    for crop, row in crop_stats.iterrows():
        logger.info("  %s: Baseline MAE = %.1fd, ML MAE = %.1fd", crop, row["baseline_error"], row["ml_error"])
        
    report = {
        "baseline_mae_days": round(float(base_mae), 2),
        "baseline_rmse_days": round(float(base_rmse), 2),
        "ml_mae_days": round(float(ml_mae), 2),
        "ml_rmse_days": round(float(ml_rmse), 2),
        "evaluation_samples": len(test_df),
        "crop_breakdown": {
            crop: {
                "baseline_mae": round(float(r["baseline_error"]), 2),
                "ml_mae": round(float(r["ml_error"]), 2)
            } for crop, r in crop_stats.iterrows()
        }
    }
    
    report_path = os.path.join(ARTIFACTS_DIR, "evaluation_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    logger.info("Saved evaluation report to %s", report_path)

if __name__ == "__main__":
    evaluate()
