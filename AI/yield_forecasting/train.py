"""
Model training and evaluation pipeline for Yield Forecasting (Phase AI-5).
Trains hierarchical median baseline and Gradient Boosted Tree model with agronomic prior.
Calculates MAE, RMSE, R2, and residual prediction intervals on held-out test split.
"""
import os
import json
import joblib
from datetime import datetime, timezone
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.ensemble import HistGradientBoostingRegressor

from .config import (
    ARTIFACTS_DIR,
    REPORTS_DIR,
    MODEL_PATH,
    PREPROCESSOR_PATH,
    METADATA_PATH,
    INDIA_CROP_YIELD_CSV
)
from .data_loader import load_cleaned_yield_dataset
from .feature_engineering import build_preprocessor, ALL_INPUT_FEATURES
from .baseline import AgronomicMedianBaseline


def train_yield_models() -> dict:
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)
    metrics_path = os.path.join(REPORTS_DIR, "yield_model_metrics.json")

    print("[Train] Loading cleaned crop yield dataset...")
    df = load_cleaned_yield_dataset(INDIA_CROP_YIELD_CSV, exclude_coconut=True)
    print(f"[Train] Total cleaned samples: {len(df)}")

    # Features and target
    X = df[ALL_INPUT_FEATURES].copy()
    y = df["Yield"].values.astype(float)

    # Held-out split (80% train, 20% test) with fixed seed for determinism
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )
    print(f"[Train] Train samples: {len(X_train)}, Test samples: {len(X_test)}")

    # 1. Fit Agronomic Median Baseline exclusively on X_train
    print("[Train] Fitting hierarchical median baseline...")
    baseline = AgronomicMedianBaseline()
    train_df = X_train.copy()
    train_df["Yield"] = y_train
    baseline.fit(train_df, target_col="Yield")

    # Evaluate Baseline on X_test
    y_test_baseline = baseline.predict(X_test)
    baseline_mae = mean_absolute_error(y_test, y_test_baseline)
    baseline_rmse = np.sqrt(mean_squared_error(y_test, y_test_baseline))
    baseline_r2 = r2_score(y_test, y_test_baseline)

    # 2. Add Baseline Prior feature to train and test sets
    X_train_plus = X_train.copy()
    X_train_plus["baseline_prior"] = baseline.predict(X_train)
    X_test_plus = X_test.copy()
    X_test_plus["baseline_prior"] = y_test_baseline

    # 3. Fit Feature Preprocessor exclusively on X_train_plus (Zero Data Leakage)
    print("[Train] Fitting feature preprocessor on training split...")
    preprocessor = build_preprocessor()
    X_train_trans = preprocessor.fit_transform(X_train_plus)
    X_test_trans = preprocessor.transform(X_test_plus)

    # 4. Train Machine Learning Model (HistGradientBoostingRegressor)
    print("[Train] Training HistGradientBoostingRegressor...")
    model = HistGradientBoostingRegressor(
        max_iter=300,
        learning_rate=0.08,
        max_depth=8,
        min_samples_leaf=15,
        l2_regularization=2.0,
        random_state=42
    )
    model.fit(X_train_trans, y_train)

    # Evaluate ML Model on Held-out Test Set
    y_test_pred = model.predict(X_test_trans)
    # Clamp negative outputs to physically meaningful minimum (0.05 t/ha)
    y_test_pred_clamped = np.maximum(0.05, y_test_pred)

    ml_mae = mean_absolute_error(y_test, y_test_pred_clamped)
    ml_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred_clamped))
    ml_r2 = r2_score(y_test, y_test_pred_clamped)

    # 5. Calibrated Prediction Uncertainty (Residual Percentiles)
    # Calculate 10th and 90th percentiles of test residuals for an 80% prediction interval
    residuals = y_test - y_test_pred_clamped
    residual_lower_delta = float(np.percentile(residuals, 10))  # negative offset
    residual_upper_delta = float(np.percentile(residuals, 90))  # positive offset

    # Quality Gate Verification: ML model must beat Baseline MAE and RMSE
    beats_baseline = bool((ml_mae < baseline_mae) and (ml_rmse < baseline_rmse))

    # Serialize Artifacts
    print("[Train] Saving model artifacts...")
    joblib.dump(model, MODEL_PATH)
    joblib.dump(preprocessor, PREPROCESSOR_PATH)
    baseline_path = os.path.join(ARTIFACTS_DIR, "yield_baseline.joblib")
    joblib.dump(baseline, baseline_path)

    metadata = {
        "model_name": "HarvestWindow Yield Forecasting Engine",
        "model_version": "1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "algorithm": "HistGradientBoostingRegressor + AgronomicPrior",
        "target_variable": "Yield (t/ha)",
        "train_samples_count": int(len(X_train)),
        "test_samples_count": int(len(X_test)),
        "features": ALL_INPUT_FEATURES + ["baseline_prior"],
        "uncertainty_method": "CALIBRATED_RESIDUAL_PERCENTILES",
        "confidence_level_pct": 80.0,
        "residual_offsets": {
            "p10": round(residual_lower_delta, 4),
            "p90": round(residual_upper_delta, 4)
        },
        "evaluation_metrics": {
            "baseline": {
                "name": "Hierarchical Historical Median Baseline",
                "mae": round(float(baseline_mae), 4),
                "rmse": round(float(baseline_rmse), 4),
                "r2": round(float(baseline_r2), 4)
            },
            "ml_model": {
                "name": "HistGradientBoostingRegressor",
                "mae": round(float(ml_mae), 4),
                "rmse": round(float(ml_rmse), 4),
                "r2": round(float(ml_r2), 4),
                "beats_baseline": beats_baseline,
                "mae_improvement_pct": round(float((baseline_mae - ml_mae) / baseline_mae) * 100, 2)
            }
        }
    }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metadata["evaluation_metrics"], f, indent=2)

    print("\n" + "=" * 60)
    print("  PHASE AI-5 MODEL EVALUATION SUMMARY")
    print("=" * 60)
    print(f"  Baseline MAE:  {baseline_mae:.4f} t/ha | RMSE: {baseline_rmse:.4f} t/ha | R2: {baseline_r2:.4f}")
    print(f"  ML Model MAE:  {ml_mae:.4f} t/ha | RMSE: {ml_rmse:.4f} t/ha | R2: {ml_r2:.4f}")
    print(f"  Beats Baseline: {beats_baseline} (MAE Improvement: {metadata['evaluation_metrics']['ml_model']['mae_improvement_pct']}%)")
    print(f"  Calibrated 80% Residual Interval: [{residual_lower_delta:+.4f}, {residual_upper_delta:+.4f}] t/ha")
    print(f"  Artifacts saved in: {ARTIFACTS_DIR}")
    print("=" * 60 + "\n")

    return metadata


if __name__ == "__main__":
    train_yield_models()
