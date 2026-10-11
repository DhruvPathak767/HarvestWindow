"""
Feature engineering and preprocessing pipeline for Yield Forecasting (Phase AI-5).
Ensures zero data leakage between training and inference.
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .data_loader import normalize_crop_name


CATEGORICAL_FEATURES = ["Crop", "State", "Season"]
NUMERICAL_FEATURES = ["Area", "Annual_Rainfall", "Fertilizer", "Pesticide", "baseline_prior"]
ALL_INPUT_FEATURES = ["Crop", "State", "Season", "Area", "Annual_Rainfall", "Fertilizer", "Pesticide"]


def build_preprocessor() -> ColumnTransformer:
    """
    Builds the ColumnTransformer pipeline:
    - OneHotEncoder with handle_unknown='ignore' for Crop, State, Season.
    - StandardScaler for Area, Annual_Rainfall, Fertilizer, Pesticide, baseline_prior.
    """
    cat_transformer = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    num_transformer = StandardScaler()

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", cat_transformer, CATEGORICAL_FEATURES),
            ("num", num_transformer, NUMERICAL_FEATURES),
        ],
        remainder="drop"
    )
    return preprocessor


def extract_features_from_request(payload: Dict[str, Any], baseline_predictor=None) -> pd.DataFrame:
    """
    Normalizes a single user inference request payload into a single-row DataFrame
    compatible with the preprocessor pipeline.
    """
    crop = normalize_crop_name(payload.get("crop_name", "Unknown"))
    state = str(payload.get("state", "Punjab")).strip().title()
    season = str(payload.get("season", "Kharif")).strip().title()

    # Resolve area in hectares
    area_dict = payload.get("planted_area", {})
    if isinstance(area_dict, dict):
        raw_val = float(area_dict.get("value", 1.0))
        unit = str(area_dict.get("unit", "HECTARE")).upper()
        from .config import AREA_TO_HECTARES
        factor = AREA_TO_HECTARES.get(unit, 1.0)
        area_ha = raw_val * factor
    else:
        area_ha = float(payload.get("area_hectares", 1.0))

    area_ha = max(0.01, area_ha)

    rainfall = payload.get("annual_rainfall_mm")
    if rainfall is None:
        rainfall = 1100.0  # National median fallback
    else:
        rainfall = float(rainfall)

    fertilizer = payload.get("fertilizer_kg")
    if fertilizer is None:
        fertilizer = 100.0  # Dataset median
    else:
        fertilizer = float(fertilizer)

    pesticide = payload.get("pesticide_kg")
    if pesticide is None:
        pesticide = 5.0  # Dataset median
    else:
        pesticide = float(pesticide)

    # Calculate baseline prior
    if baseline_predictor is not None:
        prior = float(baseline_predictor.predict_one(crop, state, season))
    else:
        from .config import TYPICAL_YIELD_BENCHMARKS, DEFAULT_GENERIC_BENCHMARK
        bench = TYPICAL_YIELD_BENCHMARKS.get(crop, DEFAULT_GENERIC_BENCHMARK)
        prior = float(bench["median"])

    row = {
        "Crop": crop,
        "State": state,
        "Season": season,
        "Area": area_ha,
        "Annual_Rainfall": rainfall,
        "Fertilizer": fertilizer,
        "Pesticide": pesticide,
        "baseline_prior": prior,
    }
    return pd.DataFrame([row])
