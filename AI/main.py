"""
FastAPI Server for Harvest Window Prediction Engine (Phase AI-2)
Exposes endpoints for prediction, validation, model metadata, and dataset readiness.
"""

import os
import json
import logging
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, status
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

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("harvest_prediction_api")

app = FastAPI(
    title="HarvestWindow AI Engine",
    description="Agronomic, GDD, and Weather-Aware Harvest Window Prediction Service",
    version="2.0.0"
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
