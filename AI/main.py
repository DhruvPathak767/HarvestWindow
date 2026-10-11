"""
FastAPI Server for Harvest Window Prediction Engine (Phase AI-2)
Exposes endpoints for prediction, validation, model metadata, and dataset readiness.
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from harvest_prediction.schemas import (
    HarvestPredictionRequest,
    HarvestPredictionResponse,
    ValidateInputRequest,
    ValidateInputResponse,
    ModelMetadataResponse,
    HealthCheckResponse
)
from harvest_prediction.prediction_service import HarvestPredictionService
from harvest_prediction.crop_knowledge import VERIFIED_CROP_KNOWLEDGE

# Phase AI-4: Crop Recommendation & Suitability Engine
from crop_recommendation.engine import CropRecommendationEngine, DEFAULT_FACTOR_WEIGHTS
from crop_recommendation.knowledge import (
    CROPS_KNOWLEDGE_BASE,
    SUPPORTED_SEASONS,
    RECOGNIZED_SOIL_TYPES,
)
from crop_recommendation.schemas import (
    CropRecommendationRequest,
    CropRecommendationResponse,
    RecommendationMetadataResponse,
)
from crop_recommendation.data.fao_gaez_adapter import FaoGaezAdapter
from crop_recommendation.ml.predictor import CropMLPredictor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("harvest_prediction_api")

app = FastAPI(
    title="HarvestWindow AI Engine",
    description="Agronomic, GDD, and Weather-Aware Harvest Window Prediction & Crop Recommendation Service",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = HarvestPredictionService()
AI_ROOT = os.path.dirname(os.path.abspath(__file__))
REPORT_JSON_PATH = os.path.join(AI_ROOT, "data_suitability_report.json")
ARTIFACTS_DIR = os.path.join(AI_ROOT, "harvest_prediction", "artifacts")

DISTINCT_CROPS = sorted(list({p["crop_name"] for p in VERIFIED_CROP_KNOWLEDGE}))

@app.get("/health", response_model=HealthCheckResponse)
def health_check():
    return HealthCheckResponse(
        status="healthy",
        version="2.0.0",
        service="harvest_prediction_ai",
        timestamp=datetime.now(timezone.utc).isoformat()
    )

@app.post("/predict", response_model=HarvestPredictionResponse)
def predict_harvest_window(request: HarvestPredictionRequest):
    try:
        response = service.predict(request)
        return response
    except Exception as exc:
        logger.exception("Error executing prediction: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal prediction engine failure: {str(exc)}"
        )

@app.post("/validate-input", response_model=ValidateInputResponse)
def validate_prediction_input(request: ValidateInputRequest):
    try:
        return service.validate_inputs(request)
    except Exception as exc:
        logger.exception("Error validating input: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(exc)}"
        )

@app.get("/model-metadata", response_model=ModelMetadataResponse)
def get_model_metadata():
    report_data = {}
    if os.path.exists(REPORT_JSON_PATH):
        try:
            with open(REPORT_JSON_PATH, "r") as f:
                report_data = json.load(f)
        except Exception:
            pass

    return ModelMetadataResponse(
        engine_name="HarvestWindow Harvest Prediction Engine",
        version="2.0.0",
        supported_crops_count=len(DISTINCT_CROPS),
        data_suitability_summary=report_data,
        last_calibrated=datetime.now(timezone.utc).isoformat()
    )

@app.get("/data-readiness")
def get_data_readiness():
    """
    Returns the real-world dataset audit status and readiness for supervised ML.
    """
    report_data = {}
    if os.path.exists(REPORT_JSON_PATH):
        try:
            with open(REPORT_JSON_PATH, "r") as f:
                report_data = json.load(f)
        except Exception:
            pass

    metadata_path = os.path.join(ARTIFACTS_DIR, "model_metadata.json")
    model_meta = {}
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r") as f:
                model_meta = json.load(f)
        except Exception:
            pass

    return {
        "status": "ready",
        "agronomic_baseline_ready": True,
        "gdd_engine_ready": True,
        "weather_integration_ready": True,
        "supervised_ml_status": model_meta.get("status", "pending_labeled_data"),
        "real_harvest_labels_in_csv": False,
        "data_audit": report_data,
        "supported_crops": DISTINCT_CROPS,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }



# Crop Recommendation Engine instance
crop_engine = CropRecommendationEngine()

# ==============================================================================
# PHASE AI-4: CROP RECOMMENDATION & SUITABILITY ENDPOINTS
# ==============================================================================

@app.get("/crop-recommendation/metadata", response_model=RecommendationMetadataResponse)
def get_crop_recommendation_metadata():
    """
    Returns supported crops, seasons, recognized soils, provisional weights,
    and status of ML model and FAO GAEZ integration.
    """
    ml_predictor = CropMLPredictor.get_instance()
    supported_crops = sorted([c["crop_name"] for c in CROPS_KNOWLEDGE_BASE])

    return RecommendationMetadataResponse(
        engine_name="HarvestWindow Crop Suitability & Recommendation Engine",
        engine_version="1.0.0-hybrid-gaez",
        supported_crops_count=len(supported_crops),
        supported_crops=supported_crops,
        supported_seasons=SUPPORTED_SEASONS,
        recognized_soil_types=RECOGNIZED_SOIL_TYPES,
        factor_weights=DEFAULT_FACTOR_WEIGHTS,
        ml_model_status=ml_predictor.get_model_info(),
        fao_gaez_status={
            "adapter": "FaoGaezAdapter v4",
            "coverage": "All 28 Indian States & 8 Union Territories across 19 AEZs",
            "source": "FAO/IIASA Global Agro-Ecological Zones (GAEZ v4)",
            "status": "active"
        }
    )

@app.post("/crop-recommendation/evaluate", response_model=CropRecommendationResponse)
def evaluate_crop_recommendation(request: CropRecommendationRequest):
    """
    Evaluates farm suitability against agronomic, pedological, seasonal,
    climatic, and optional ML classification baselines.
    """
    try:
        results = crop_engine.evaluate_farm_suitability(
            farm_id=request.farm_id,
            state=request.state,
            district=request.district,
            season=request.season,
            current_month=request.current_month,
            soil_type=request.soil_type,
            soil_ph=request.soil_ph,
            nitrogen=request.nitrogen,
            phosphorus=request.phosphorus,
            potassium=request.potassium,
            irrigation_source=request.irrigation_source,
            temperature=request.temperature,
            rainfall=request.rainfall,
            humidity=request.humidity,
            latitude=request.latitude,
            longitude=request.longitude,
            top_k=request.top_k,
        )
        return results
    except Exception as exc:
        logger.exception("Error evaluating crop recommendations: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Crop recommendation engine failure: {str(exc)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)

