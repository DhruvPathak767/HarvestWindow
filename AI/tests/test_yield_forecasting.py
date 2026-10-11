"""
Automated unit and integration test suite for Yield Forecasting & Production Estimation Engine (Phase AI-5).
Tests data loading, normalization, baseline, production estimator, ML inference, and FastAPI endpoints.
"""
import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure AI directory is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_ROOT = os.path.dirname(CURRENT_DIR)
if AI_ROOT not in sys.path:
    sys.path.insert(0, AI_ROOT)

from yield_forecasting.config import (
    AREA_TO_HECTARES,
    TYPICAL_YIELD_BENCHMARKS,
    STAGE_BEFORE_SOWING,
    STAGE_VEGETATIVE,
    STAGE_MID_SEASON,
    STAGE_NEAR_HARVEST
)
from yield_forecasting.data_loader import (
    normalize_crop_name,
    load_cleaned_yield_dataset
)
from yield_forecasting.production_estimator import (
    convert_to_hectares,
    estimate_total_production,
    ProductionEstimationError
)
from yield_forecasting.baseline import AgronomicMedianBaseline
from yield_forecasting.predict import YieldPredictionService
from yield_forecasting.schemas import YieldPredictionRequest, PlantedAreaInput
from main import app

client = TestClient(app)


# ============================================================================
# 1. CROP NAME & DATASET NORMALIZATION TESTS
# ============================================================================

def test_crop_name_normalization():
    assert normalize_crop_name("rice (paddy)") == "Rice"
    assert normalize_crop_name("paddy") == "Rice"
    assert normalize_crop_name("dhan") == "Rice"
    assert normalize_crop_name("gehu") == "Wheat"
    assert normalize_crop_name("wheat") == "Wheat"
    assert normalize_crop_name("gram") == "Chickpea"
    assert normalize_crop_name("cotton(lint)") == "Cotton"
    assert normalize_crop_name("rapeseed &mustard") == "Mustard"
    assert normalize_crop_name("sarson") == "Mustard"
    assert normalize_crop_name("tomato") == "Tomato"


def test_cleaned_dataset_validations():
    df = load_cleaned_yield_dataset(exclude_coconut=True)
    assert len(df) > 10000
    # Zero/negative areas must be excluded
    assert (df["Area"] <= 0).sum() == 0
    # Negative productions must be excluded
    assert (df["Production"] < 0).sum() == 0
    # Coconut must be excluded
    assert (df["Crop_Raw"] == "Coconut").sum() == 0
    # Yield values must be strictly positive
    assert (df["Yield"] <= 0).sum() == 0


# ============================================================================
# 2. PRODUCTION ESTIMATION & UNIT CONVERSION TESTS
# ============================================================================

def test_convert_to_hectares():
    # 1 Hectare = 1.0 Ha
    assert convert_to_hectares(1.0, "HECTARE") == 1.0
    assert convert_to_hectares(2.5, "HA") == 2.5
    # 1 Acre = 0.404686 Ha
    assert round(convert_to_hectares(1.0, "ACRE"), 6) == 0.404686
    assert round(convert_to_hectares(10.0, "ACRES"), 5) == 4.04686
    # 10,000 sq meters = 1 Ha
    assert convert_to_hectares(10000, "SQ_METER") == 1.0


def test_convert_to_hectares_rejections():
    with pytest.raises(ProductionEstimationError):
        convert_to_hectares(0, "HECTARE")  # Non-positive area
    with pytest.raises(ProductionEstimationError):
        convert_to_hectares(-5.0, "ACRE")
    with pytest.raises(ProductionEstimationError):
        convert_to_hectares(2.0, "LIGHT_YEAR")  # Unsupported unit


def test_estimate_total_production_calculation():
    # 4.0 t/ha on 2.5 hectares = 10.0 tonnes
    res = estimate_total_production(
        predicted_yield_t_ha=4.0,
        planted_area_value=2.5,
        planted_area_unit="HECTARE",
        lower_yield_t_ha=3.2,
        upper_yield_t_ha=4.8
    )
    assert res["expected_production_tonnes"] == 10.0
    assert res["lower_production_tonnes"] == 8.0
    assert res["upper_production_tonnes"] == 12.0
    assert res["area_hectares"] == 2.5


def test_estimate_total_production_with_acres():
    # 3.0 t/ha on 10 acres (~4.04686 ha) = ~12.1406 tonnes
    res = estimate_total_production(
        predicted_yield_t_ha=3.0,
        planted_area_value=10.0,
        planted_area_unit="ACRE"
    )
    expected_tonnes = round(3.0 * 4.04686, 4)
    assert abs(res["expected_production_tonnes"] - expected_tonnes) < 0.01


def test_estimate_total_production_invalid_inputs():
    with pytest.raises(ProductionEstimationError):
        estimate_total_production(-2.0, 5.0, "HECTARE")  # Negative yield
    with pytest.raises(ProductionEstimationError):
        estimate_total_production(0.0, 5.0, "HECTARE")   # Zero yield


# ============================================================================
# 3. BASELINE PREDICTOR TESTS
# ============================================================================

def test_agronomic_baseline():
    baseline = AgronomicMedianBaseline()
    # Mock small dataset
    import pandas as pd
    data = pd.DataFrame([
        {"Crop": "Wheat", "State": "Punjab", "Season": "Rabi", "Yield": 4.8},
        {"Crop": "Wheat", "State": "Punjab", "Season": "Rabi", "Yield": 5.2},
        {"Crop": "Wheat", "State": "Haryana", "Season": "Rabi", "Yield": 4.2},
        {"Crop": "Rice", "State": "Punjab", "Season": "Kharif", "Yield": 3.6},
    ])
    baseline.fit(data)

    # Exact CSS match
    assert baseline.predict_one("Wheat", "Punjab", "Rabi") == 5.0
    # Fallback to Crop+State match
    assert baseline.predict_one("Wheat", "Haryana", "Zaid") == 4.2
    # Fallback to Crop match
    assert baseline.predict_one("Rice", "Bihar", "Summer") == 3.6
    # Fallback to ICAR reference benchmark
    pred_mustard = baseline.predict_one("Mustard", "Kerala", "Winter")
    assert pred_mustard == TYPICAL_YIELD_BENCHMARKS["Mustard"]["median"]


# ============================================================================
# 4. YIELD INFERENCE ENGINE & UNCERTAINTY TESTS
# ============================================================================

def test_yield_service_inference():
    service = YieldPredictionService()
    req = YieldPredictionRequest(
        crop_name="Wheat",
        state="Punjab",
        season="Rabi",
        planted_area=PlantedAreaInput(value=2.0, unit="HECTARE"),
        annual_rainfall_mm=600.0,
        fertilizer_kg=120.0,
        pesticide_kg=2.5
    )
    res = service.predict(req)
    assert res.crop_name == "Wheat"
    assert res.yield_estimate.value > 1.0
    assert res.yield_estimate.value < 8.0
    assert res.production_estimate.value == round(res.yield_estimate.value * 2.0, 4)
    # Calibrated uncertainty interval check
    assert res.uncertainty.available is True
    assert res.uncertainty.lower_yield_t_ha < res.yield_estimate.value
    assert res.uncertainty.upper_yield_t_ha > res.yield_estimate.value
    assert res.uncertainty.lower_production_tonnes < res.production_estimate.value


def test_stage_determination():
    service = YieldPredictionService()
    # Before sowing (future date)
    assert service.determine_prediction_stage("2028-11-01", None, None) == STAGE_BEFORE_SOWING
    # Vegetative stage (recently sown)
    assert service.determine_prediction_stage("2026-10-01", "2027-03-01", None) in [STAGE_VEGETATIVE, STAGE_MID_SEASON]


# ============================================================================
# 5. FASTAPI REST ENDPOINTS INTEGRATION TESTS
# ============================================================================

def test_api_yield_predict_endpoint():
    payload = {
        "crop_name": "Wheat",
        "state": "Punjab",
        "season": "Rabi",
        "planted_area": {
            "value": 3.0,
            "unit": "HECTARE"
        },
        "annual_rainfall_mm": 650.0,
        "fertilizer_kg": 140.0,
        "pesticide_kg": 3.0
    }
    response = client.post("/yield/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["crop_name"] == "Wheat"
    assert data["yield_estimate"]["value"] > 0
    assert data["production_estimate"]["value"] > 0
    assert data["confidence"] in ["HIGH", "MODERATE", "LOW"]
    assert "uncertainty" in data


def test_api_estimate_production_endpoint():
    payload = {
        "predicted_yield_t_ha": 3.5,
        "planted_area": {
            "value": 4.0,
            "unit": "ACRE"
        },
        "lower_yield_t_ha": 2.8,
        "upper_yield_t_ha": 4.2
    }
    response = client.post("/yield/estimate-production", json=payload)
    assert response.status_code == 200
    data = response.json()
    # 4 acres = 1.618744 ha; 3.5 * 1.618744 = 5.6656 tonnes
    assert abs(data["area_hectares"] - 1.6187) < 0.01
    assert abs(data["expected_production_tonnes"] - 5.6656) < 0.05
    assert data["lower_production_tonnes"] < data["expected_production_tonnes"]


def test_api_yield_metadata_endpoint():
    response = client.get("/yield/metadata")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert "metadata" in data


def test_api_yield_health_endpoint():
    response = client.get("/yield/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
