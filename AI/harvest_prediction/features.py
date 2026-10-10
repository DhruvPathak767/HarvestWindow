"""
Standardized Feature Engineering Pipeline for Harvest Prediction (Layer D)
Ensures strict consistency between training and inference pipelines,
prevents any target leakage, and handles categorical variables cleanly.
"""

from datetime import datetime, date
from typing import Dict, Any, List, Optional
import numpy as np

NUMERICAL_FEATURE_COLS = [
    "sowing_month",
    "sowing_day_of_year",
    "days_since_sowing",
    "typical_duration_days",
    "duration_span_days",
    "base_temperature_c",
    "accumulated_gdd",
    "required_maturity_gdd",
    "gdd_progress_ratio",
    "mean_temp_recent",
    "total_precip_recent",
]

CATEGORICAL_FEATURE_COLS = [
    "crop_canonical",
    "season",
    "state_canonical",
]

FEATURE_COLUMNS = NUMERICAL_FEATURE_COLS + CATEGORICAL_FEATURE_COLS

def extract_prediction_features(
    crop_profile: Dict[str, Any],
    sowing_date_str: str,
    reference_date_str: Optional[str] = None,
    accumulated_gdd: float = 0.0,
    weather_summary: Optional[Dict[str, float]] = None,
    state: Optional[str] = None,
    season: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Extracts unified feature dictionary from prediction inputs.
    Strictly forbids target leakage: zero access to harvest dates or post-harvest weather.
    """
    ref_dt = datetime.strptime(reference_date_str, "%Y-%m-%d").date() if reference_date_str else date.today()
    sow_dt = datetime.strptime(sowing_date_str, "%Y-%m-%d").date()

    days_since_sowing = max(0, (ref_dt - sow_dt).days)
    sowing_month = sow_dt.month
    sowing_day_of_year = sow_dt.timetuple().tm_yday

    typical_dur = float(crop_profile.get("typical_days") or crop_profile.get("typical_duration_days", 120))
    min_dur = float(crop_profile.get("min_days") or crop_profile.get("min_duration_days", typical_dur - 15))
    max_dur = float(crop_profile.get("max_days") or crop_profile.get("max_duration_days", typical_dur + 15))
    duration_span = max(1.0, max_dur - min_dur)

    base_temp = float(crop_profile.get("base_temperature_c", 10.0))
    req_gdd = float(crop_profile.get("required_gdd_c") or crop_profile.get("required_maturity_gdd", 1800.0))
    gdd_progress = min(2.0, accumulated_gdd / req_gdd) if req_gdd > 0 else 0.0

    ws = weather_summary or {}
    mean_temp_recent = float(ws.get("mean_temp_recent", 25.0))
    total_precip_recent = float(ws.get("total_precip_recent", 0.0))

    crop_name = (crop_profile.get("crop_name") or crop_profile.get("canonical_name", "Unknown")).strip().lower()
    state_clean = (state or "Unknown").strip().lower()
    season_clean = (season or crop_profile.get("season", "Kharif")).strip().lower()

    return {
        "sowing_month": sowing_month,
        "sowing_day_of_year": sowing_day_of_year,
        "days_since_sowing": days_since_sowing,
        "typical_duration_days": typical_dur,
        "duration_span_days": duration_span,
        "base_temperature_c": base_temp,
        "accumulated_gdd": accumulated_gdd,
        "required_maturity_gdd": req_gdd,
        "gdd_progress_ratio": round(gdd_progress, 4),
        "mean_temp_recent": round(mean_temp_recent, 2),
        "total_precip_recent": round(total_precip_recent, 2),
        "crop_canonical": crop_name,
        "season": season_clean,
        "state_canonical": state_clean,
    }


def featurize_to_array(
    feature_dict: Dict[str, Any],
    crop_vocab: Dict[str, int],
    state_vocab: Dict[str, int],
    season_vocab: Dict[str, int]
) -> np.ndarray:
    """
    Transforms feature dict into a single 1D numpy array ready for scikit-learn models.
    """
    num_vals = [float(feature_dict[c]) for c in NUMERICAL_FEATURE_COLS]
    
    crop_idx = crop_vocab.get(feature_dict["crop_canonical"], 0)
    state_idx = state_vocab.get(feature_dict["state_canonical"], 0)
    season_idx = season_vocab.get(feature_dict["season"], 0)

    vec = num_vals + [float(crop_idx), float(season_idx), float(state_idx)]
    return np.array(vec, dtype=np.float32)
