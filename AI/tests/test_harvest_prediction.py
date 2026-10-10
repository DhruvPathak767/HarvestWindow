"""
Unit and Integration Tests for Harvest Window Prediction Engine (Phase AI-2)
Covers Layer A (Agronomic Baseline), Layer B (GDD), Layer C (Weather),
FastAPI endpoints, edge cases (leap years, missing sowing dates, past due crops).
"""

import sys
import os
from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient

# Ensure AI directory is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_ROOT = os.path.dirname(CURRENT_DIR)
if AI_ROOT not in sys.path:
    sys.path.insert(0, AI_ROOT)

from harvest_prediction.crop_knowledge import (
    resolve_crop_profile,
    VERIFIED_CROP_KNOWLEDGE,
    normalize_text
)
from harvest_prediction.agronomic_baseline import compute_agronomic_baseline, parse_iso_date
from harvest_prediction.gdd import (
    calculate_daily_gdd,
    accumulate_gdd_series,
    project_gdd_harvest_date
)
from harvest_prediction.weather import (
    calculate_weather_aware_adjustments,
    WeatherProvider
)
from harvest_prediction.schemas import (
    DailyWeatherRecord,
    HarvestPredictionRequest
)
from harvest_prediction.prediction_service import HarvestPredictionService
from main import app

client = TestClient(app)

# ============================================================================
# 1. AGRONOMIC BASELINE TESTS (LAYER A)
# ============================================================================

def test_crop_knowledge_resolution():
    profile = resolve_crop_profile("Wheat", "HD-2967")
    assert profile is not None
    assert profile["crop_name"] == "Wheat"
    assert profile["typical_days"] == 145
    assert profile["variety"] == "HD-2967"
    assert profile["base_temperature_c"] == 4.5
    assert profile["required_gdd_c"] == 1950.0

def test_crop_name_normalization_aliases():
    profile_paddy = resolve_crop_profile("Paddy")
    assert profile_paddy["crop_name"] == "Rice (Paddy)"

    profile_chana = resolve_crop_profile("Chana")
    assert profile_chana["crop_name"] == "Chickpea"

    profile_sarson = resolve_crop_profile("Sarson")
    assert profile_sarson["crop_name"] == "Mustard"

def test_baseline_calculation_standard():
    res = compute_agronomic_baseline("Wheat", "HD-2967", "2024-11-15", reference_date_str="2024-12-01")
    
    assert res["status"] == "success"
    assert res["sowing_date"] == "2024-11-15"
    assert res["duration_bounds"]["min_days"] == 138
    assert res["duration_bounds"]["typical_days"] == 145
    assert res["duration_bounds"]["max_days"] == 155
    # 2024-11-15 + 145 days = 2025-04-09
    assert res["most_likely_harvest_date"] == "2025-04-09"
    # 2024-11-15 + 138 days = 2025-04-02
    assert res["earliest_harvest_date"] == "2025-04-02"
    # 2024-11-15 + 155 days = 2025-04-19
    assert res["latest_harvest_date"] == "2025-04-19"
    assert res["is_past_due"] is False
    assert res["days_until_harvest"] > 0

def test_baseline_leap_year_handling():
    # 2024 is a leap year (Feb 29 exists)
    res_leap = compute_agronomic_baseline("Mustard / Rapeseed", None, "2024-01-01", reference_date_str="2024-01-01")
    assert res_leap["status"] == "success"
    # Typical 115 days from Jan 1 in leap year: 31 (Jan) + 29 (Feb) + 31 (Mar) + 24 (Apr) = 115 -> 2024-04-25
    assert res_leap["most_likely_harvest_date"] == "2024-04-25"

def test_baseline_missing_sowing_date():
    res = compute_agronomic_baseline("Wheat", "HD-2967", None)
    assert res["status"] == "insufficient_data"
    assert res["reason"] == "MISSING_SOWING_DATE"

# ============================================================================
# 2. GROWING DEGREE-DAY (GDD) TESTS (LAYER B)
# ============================================================================

def test_daily_gdd_standard():
    # T_mean = (30 + 10) / 2 = 20. T_base = 10 -> GDD = 10
    gdd = calculate_daily_gdd(t_max=30.0, t_min=10.0, base_temp=10.0)
    assert gdd == 10.0

def test_daily_gdd_below_base_temp():
    # T_max = 8, T_min = 2. T_base = 10. T_max < base_temp -> GDD = 0.0
    gdd = calculate_daily_gdd(t_max=8.0, t_min=2.0, base_temp=10.0)
    assert gdd == 0.0

def test_daily_gdd_with_upper_threshold():
    # T_max = 40, clamped to 34. T_min = 20 clamped to max(20, 10)=20. T_mean = (34 + 20) / 2 = 27. Base = 10 -> GDD = 17
    gdd = calculate_daily_gdd(t_max=40.0, t_min=20.0, base_temp=10.0, upper_threshold=34.0)
    assert gdd == 17.0

def test_accumulate_gdd_series():
    series = [
        DailyWeatherRecord(date="2024-11-01", t_max=28.0, t_min=14.0, t_mean=21.0, is_forecast=False),
        DailyWeatherRecord(date="2024-11-02", t_max=26.0, t_min=12.0, t_mean=19.0, is_forecast=False),
        DailyWeatherRecord(date="2024-11-03", t_max=24.0, t_min=10.0, t_mean=17.0, is_forecast=False),
    ]
    # base_temp = 5.0
    # Day 1: (28 + 14)/2 - 5 = 16
    # Day 2: (26 + 12)/2 - 5 = 14
    # Day 3: (24 + 10)/2 - 5 = 12
    # Total = 42.0
    sow_d = date(2024, 11, 1)
    ref_d = date(2024, 11, 3)
    res = accumulate_gdd_series(series, sow_d, ref_d, base_temp=5.0)
    assert res["accumulated_gdd"] == 42.0
    assert res["observed_days_count"] == 3
    assert res["missing_days_count"] == 0

def test_project_maturity_date_from_gdd():
    series = [
        DailyWeatherRecord(date="2024-11-03", t_max=25.0, t_min=15.0, t_mean=20.0, is_forecast=True),
        DailyWeatherRecord(date="2024-11-04", t_max=25.0, t_min=15.0, t_mean=20.0, is_forecast=True),
    ]
    # Required = 100 GDD. Current = 80 GDD. Remaining = 20 GDD.
    # T_base = 10 -> each forecast day gives (25 + 15)/2 - 10 = 10 GDD.
    # Day 1 (Nov 3): gives 10 GDD (total 10)
    # Day 2 (Nov 4): gives 10 GDD (total 20 -> reaches 20 GDD!). Projected maturity = 2024-11-04.
    proj_date, notes = project_gdd_harvest_date(
        accumulated_gdd=80.0,
        required_gdd=100.0,
        reference_date=date(2024, 11, 2),
        forecast_records=series,
        base_temp=10.0
    )
    assert proj_date == date(2024, 11, 4)

# ============================================================================
# 3. WEATHER ADJUSTMENTS TESTS (LAYER C)
# ============================================================================

def test_weather_delay_from_heavy_rainfall():
    harvest_target = "2025-04-10"
    series = [
        DailyWeatherRecord(date="2025-04-09", t_max=28.0, t_min=18.0, precipitation_mm=25.0),
        DailyWeatherRecord(date="2025-04-10", t_max=26.0, t_min=17.0, precipitation_mm=15.0),
    ]
    adj_days, factors = calculate_weather_aware_adjustments(series, harvest_target)
    assert adj_days >= 2
    assert any("rainfall" in f.factor for f in factors)

def test_weather_heatwave_acceleration():
    harvest_target = "2025-04-10"
    series = [
        DailyWeatherRecord(date="2025-04-08", t_max=41.0, t_min=24.0, precipitation_mm=0.0),
        DailyWeatherRecord(date="2025-04-09", t_max=42.0, t_min=25.0, precipitation_mm=0.0),
        DailyWeatherRecord(date="2025-04-10", t_max=41.0, t_min=25.0, precipitation_mm=0.0),
        DailyWeatherRecord(date="2025-04-11", t_max=40.0, t_min=24.0, precipitation_mm=0.0),
    ]
    adj_days, factors = calculate_weather_aware_adjustments(series, harvest_target)
    assert adj_days <= -1
    assert any("heat" in f.factor or "temperature" in f.factor for f in factors)

# ============================================================================
# 4. PREDICTION SERVICE AND FASTAPI ENDPOINT TESTS
# ============================================================================

def test_api_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["version"] == "2.0.0"

def test_api_model_metadata_endpoint():
    resp = client.get("/model-metadata")
    assert resp.status_code == 200
    data = resp.json()
    assert "prediction_layers" in data
    assert data["supported_crops_count"] > 5

def test_api_data_readiness_endpoint():
    resp = client.get("/data-readiness")
    assert resp.status_code == 200
    data = resp.json()
    assert data["agronomic_baseline_ready"] is True
    assert data["real_harvest_labels_in_csv"] is False

def test_api_validate_input():
    resp = client.post("/validate-input", json={
        "crop_name": "Wheat",
        "variety": "HD-2967",
        "sowing_date": "2024-11-15",
        "latitude": 30.9,
        "longitude": 75.85
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["resolved_crop_profile"] == "Wheat"
    assert data["variety_matched"] is True

def test_api_predict_success():
    req_payload = {
        "crop_name": "Wheat",
        "variety": "HD-2967",
        "sowing_date": "2024-11-15",
        "reference_date": "2024-12-15",
        "latitude": 30.9,
        "longitude": 75.85
    }
    resp = client.post("/predict", json=req_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    pred = data["prediction"]
    assert pred["crop_name"] == "Wheat"
    assert pred["estimated_harvest_start"] is not None
    assert pred["most_likely_harvest_date"] is not None
    assert pred["estimated_harvest_end"] is not None
    assert pred["days_until_harvest"] > 0
    assert pred["data_quality"]["crop_profile_available"] is True

def test_api_predict_missing_sowing_date_honest():
    req_payload = {
        "crop_name": "Wheat"
    }
    resp = client.post("/predict", json=req_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "insufficient_data"
    assert "Sowing date is required" in data["message"]

def test_api_predict_unsupported_crop():
    req_payload = {
        "crop_name": "DragonFruitNonExistentCrop123",
        "sowing_date": "2024-11-15"
    }
    resp = client.post("/predict", json=req_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "insufficient_data"
    assert "No verified agronomic duration benchmarks found" in data["message"]
