"""
Prediction service and inference engine for Yield Forecasting & Production Estimation (Phase AI-5).
Loads model artifacts, computes point predictions, uncertainty bounds, and production estimates.
"""
import os
import json
from datetime import datetime, timezone, date
from typing import Dict, Any, Optional
import joblib
import numpy as np
import pandas as pd

from .config import (
    MODEL_PATH,
    PREPROCESSOR_PATH,
    METADATA_PATH,
    ARTIFACTS_DIR,
    STAGE_BEFORE_SOWING,
    STAGE_VEGETATIVE,
    STAGE_MID_SEASON,
    STAGE_NEAR_HARVEST,
    STAGE_POST_HARVEST,
    TYPICAL_YIELD_BENCHMARKS,
    DEFAULT_GENERIC_BENCHMARK
)
from .feature_engineering import extract_features_from_request
from .data_loader import normalize_crop_name
from .production_estimator import estimate_total_production, convert_to_hectares
from .schemas import (
    YieldPredictionRequest,
    YieldPredictionResponse,
    PlantedAreaResponse,
    YieldValueResponse,
    ProductionValueResponse,
    UncertaintyInterval,
    ModelInfoResponse,
    DataQualityResponse
)


class YieldPredictionService:
    def __init__(self):
        self.model = None
        self.preprocessor = None
        self.baseline = None
        self.metadata = {}
        self.load_artifacts()

    def load_artifacts(self):
        """Loads trained artifacts if present on disk."""
        try:
            if os.path.exists(MODEL_PATH):
                self.model = joblib.load(MODEL_PATH)
            if os.path.exists(PREPROCESSOR_PATH):
                self.preprocessor = joblib.load(PREPROCESSOR_PATH)
            baseline_path = os.path.join(ARTIFACTS_DIR, "yield_baseline.joblib")
            if os.path.exists(baseline_path):
                self.baseline = joblib.load(baseline_path)
            if os.path.exists(METADATA_PATH):
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
        except Exception as exc:
            print(f"[YieldService] Warning loading model artifacts: {exc}")

    def determine_prediction_stage(
        self,
        sowing_date_str: Optional[str],
        expected_harvest_date_str: Optional[str],
        provided_stage: Optional[str]
    ) -> str:
        """Determines the chronological prediction stage."""
        if provided_stage:
            return provided_stage.upper()

        if not sowing_date_str:
            return STAGE_BEFORE_SOWING

        try:
            sowing = datetime.fromisoformat(sowing_date_str[:10]).date()
            today = date.today()
            if today < sowing:
                return STAGE_BEFORE_SOWING

            if expected_harvest_date_str:
                harvest = datetime.fromisoformat(expected_harvest_date_str[:10]).date()
                if today >= harvest:
                    return STAGE_NEAR_HARVEST
                total_duration = (harvest - sowing).days
                elapsed = (today - sowing).days
                if total_duration > 0:
                    pct = elapsed / total_duration
                    if pct < 0.35:
                        return STAGE_VEGETATIVE
                    elif pct < 0.75:
                        return STAGE_MID_SEASON
                    else:
                        return STAGE_NEAR_HARVEST

            # Default duration estimate (120 days) if harvest date omitted
            days_elapsed = (today - sowing).days
            if days_elapsed < 40:
                return STAGE_VEGETATIVE
            elif days_elapsed < 90:
                return STAGE_MID_SEASON
            else:
                return STAGE_NEAR_HARVEST
        except Exception:
            return STAGE_MID_SEASON

    def predict(self, req: YieldPredictionRequest) -> YieldPredictionResponse:
        """
        Executes yield prediction and production estimation with uncertainty intervals.
        """
        crop_clean = normalize_crop_name(req.crop_name)
        state_clean = req.state.strip().title()
        season_clean = (req.season or "Kharif").strip().title()

        missing_features = []
        warnings = []
        used_fallback = False

        if req.annual_rainfall_mm is None:
            missing_features.append("annual_rainfall_mm")
        if req.fertilizer_kg is None:
            missing_features.append("fertilizer_kg")
        if req.pesticide_kg is None:
            missing_features.append("pesticide_kg")
        if req.soil_type is None:
            missing_features.append("soil_type")

        # Normalize area
        area_ha = convert_to_hectares(req.planted_area.value, req.planted_area.unit)

        # Baseline point estimate
        baseline_pred = None
        if self.baseline is not None:
            baseline_pred = self.baseline.predict_one(crop_clean, state_clean, season_clean)
        else:
            bench = TYPICAL_YIELD_BENCHMARKS.get(crop_clean, DEFAULT_GENERIC_BENCHMARK)
            baseline_pred = bench["median"]

        # ML Prediction
        point_yield = None
        algo_name = "HistGradientBoostingRegressor"
        if self.model is not None and self.preprocessor is not None:
            try:
                payload = req.model_dump()
                df_single = extract_features_from_request(payload, baseline_predictor=self.baseline)
                X_trans = self.preprocessor.transform(df_single)
                raw_pred = float(self.model.predict(X_trans)[0])
                point_yield = max(0.05, raw_pred)
            except Exception as e:
                warnings.append(f"ML inference error: {str(e)}; falling back to agronomic baseline.")
                point_yield = baseline_pred
                used_fallback = True
                algo_name = "AgronomicMedianBaseline"
        else:
            point_yield = baseline_pred
            used_fallback = True
            algo_name = "AgronomicMedianBaseline"
            warnings.append("ML model artifacts not loaded; using verified agronomic baseline.")

        # Sanity bounds check against ICAR benchmarks
        bench = TYPICAL_YIELD_BENCHMARKS.get(crop_clean, DEFAULT_GENERIC_BENCHMARK)
        if point_yield > bench["max"] * 2.5:
            warnings.append(f"Predicted yield ({point_yield:.2f} t/ha) exceeded physical ceiling; clamped to maximum plausible threshold.")
            point_yield = bench["max"] * 2.0

        # Residual Uncertainty Bounds (80% calibrated interval)
        residual_offsets = self.metadata.get("residual_offsets", {"p10": -0.8156, "p90": 0.7953})
        p10 = residual_offsets.get("p10", -0.8)
        p90 = residual_offsets.get("p90", 0.8)

        lower_yield = max(0.05, round(point_yield + p10, 4))
        upper_yield = round(point_yield + p90, 4)

        # Production calculation
        prod_res = estimate_total_production(
            predicted_yield_t_ha=point_yield,
            planted_area_value=req.planted_area.value,
            planted_area_unit=req.planted_area.unit,
            lower_yield_t_ha=lower_yield,
            upper_yield_t_ha=upper_yield
        )

        stage = self.determine_prediction_stage(
            req.sowing_date,
            req.expected_harvest_date,
            req.prediction_stage
        )

        # Confidence calculation
        if len(missing_features) == 0 and not used_fallback:
            confidence = "HIGH"
        elif len(missing_features) <= 2 and not used_fallback:
            confidence = "MODERATE"
        else:
            confidence = "LOW"

        return YieldPredictionResponse(
            crop_name=crop_clean,
            state=state_clean,
            season=season_clean,
            prediction_stage=stage,
            planted_area=PlantedAreaResponse(
                original_value=float(req.planted_area.value),
                original_unit=str(req.planted_area.unit).upper(),
                area_hectares=area_ha
            ),
            yield_estimate=YieldValueResponse(
                value=round(point_yield, 4),
                unit="TONNE_PER_HECTARE"
            ),
            production_estimate=ProductionValueResponse(
                value=prod_res["expected_production_tonnes"],
                unit="TONNE"
            ),
            uncertainty=UncertaintyInterval(
                available=True,
                method="CALIBRATED_RESIDUAL_PERCENTILES",
                confidence_level_pct=80.0,
                lower_yield_t_ha=lower_yield,
                upper_yield_t_ha=upper_yield,
                lower_production_tonnes=prod_res["lower_production_tonnes"],
                upper_production_tonnes=prod_res["upper_production_tonnes"]
            ),
            confidence=confidence,
            model=ModelInfoResponse(
                name="HarvestWindow Yield Forecasting Engine",
                version=self.metadata.get("model_version", "1.0.0"),
                algorithm=algo_name,
                target_unit="t/ha"
            ),
            data_quality=DataQualityResponse(
                missing_features=missing_features,
                warnings=warnings,
                used_fallback=used_fallback
            ),
            generated_at=datetime.now(timezone.utc).isoformat()
        )
