"""
FastAPI Server for Harvest Window Prediction Engine (Phase AI-2)
Exposes endpoints for prediction, validation, model metadata, and dataset readiness.
"""

import os
import sys

# Ensure AI directory is in Python path regardless of execution cwd
ai_dir = os.path.dirname(os.path.abspath(__file__))
if ai_dir not in sys.path:
    sys.path.insert(0, ai_dir)

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

from yield_forecasting.schemas import (
    YieldPredictionRequest,
    YieldPredictionResponse,
    ProductionEstimateRequest,
    ProductionEstimateResponse
)
from yield_forecasting.predict import YieldPredictionService
from yield_forecasting.production_estimator import estimate_total_production

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
yield_service = YieldPredictionService()
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

# ============================================================================
# Phase AI-5: Yield Forecasting and Production Estimation Endpoints
# ============================================================================

@app.post("/yield/predict", response_model=YieldPredictionResponse)
def predict_crop_yield(request: YieldPredictionRequest):
    try:
        return yield_service.predict(request)
    except Exception as exc:
        logger.exception("Error executing yield prediction: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal yield prediction failure: {str(exc)}"
        )

@app.post("/yield/estimate-production", response_model=ProductionEstimateResponse)
def estimate_production(request: ProductionEstimateRequest):
    try:
        from yield_forecasting.production_estimator import convert_to_hectares
        area_ha = convert_to_hectares(request.planted_area.value, request.planted_area.unit)
        prod_res = estimate_total_production(
            predicted_yield_t_ha=request.predicted_yield_t_ha,
            planted_area_value=request.planted_area.value,
            planted_area_unit=request.planted_area.unit,
            lower_yield_t_ha=request.lower_yield_t_ha,
            upper_yield_t_ha=request.upper_yield_t_ha
        )
        from yield_forecasting.schemas import PlantedAreaResponse
        return ProductionEstimateResponse(
            crop_name=request.crop_name,
            planted_area=PlantedAreaResponse(
                original_value=float(request.planted_area.value),
                original_unit=str(request.planted_area.unit).upper(),
                area_hectares=area_ha
            ),
            predicted_yield_t_ha=request.predicted_yield_t_ha,
            expected_production_tonnes=prod_res["expected_production_tonnes"],
            lower_production_tonnes=prod_res["lower_production_tonnes"],
            upper_production_tonnes=prod_res["upper_production_tonnes"],
            area_hectares=area_ha
        )
    except Exception as exc:
        logger.exception("Error estimating production: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Production estimation error: {str(exc)}"
        )

@app.get("/yield/metadata")
def get_yield_model_metadata():
    return {
        "status": "ready",
        "engine": "HarvestWindow Yield Forecasting Engine",
        "version": "1.0.0",
        "metadata": yield_service.metadata
    }

@app.get("/yield/health")
def get_yield_health():
    return {
        "status": "healthy",
        "service": "yield_forecasting_ai",
        "model_loaded": yield_service.model is not None,
        "baseline_loaded": yield_service.baseline is not None,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ============================================================================
# Phase AI-6: Crop Disease and Health Detection Endpoints
# ============================================================================
from fastapi import UploadFile, File, Form
from crop_health.inference import CropHealthInferenceService
from crop_health.schemas import (
    CropHealthPredictionResponse,
    ModelInfoResponse,
    HealthStatusResponse
)
from crop_health.class_registry import get_all_classes
from crop_health.config import SUPPORTED_CROPS

crop_health_service = CropHealthInferenceService()

@app.get("/crop-health/health", response_model=HealthStatusResponse)
def crop_health_health():
    return HealthStatusResponse(
        status="healthy",
        version="1.0.0",
        service="crop_health_ai",
        model_loaded=crop_health_service.is_ready,
        timestamp=datetime.now(timezone.utc).isoformat()
    )

@app.get("/crop-health/ready")
def crop_health_readiness():
    return {
        "status": "ready" if crop_health_service.is_ready else "unavailable",
        "model_loaded": crop_health_service.is_ready,
        "classes_count": len(crop_health_service.index_to_class),
        "supported_crops": SUPPORTED_CROPS,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/crop-health/model-info", response_model=ModelInfoResponse)
def crop_health_model_info():
    meta = crop_health_service.metadata
    all_classes = sorted(get_all_classes())
    return ModelInfoResponse(
        model_name=meta.get("model_name", "HarvestWindow Crop Disease & Health Detection Engine"),
        model_version=meta.get("model_version", "1.0.0"),
        architecture=meta.get("architecture", "MobileNetV3-Small (Transfer Learning)"),
        total_classes=len(all_classes),
        supported_crops=SUPPORTED_CROPS,
        supported_classes=all_classes,
        input_dimensions=meta.get("input_dimensions", "224x224x3"),
        readiness_status=meta.get("readiness_status", "READY" if crop_health_service.is_ready else "UNAVAILABLE"),
        evaluation_metrics=meta.get("evaluation_metrics"),
        training_dataset=meta.get("training_dataset", "Jharkhand Agricultural Field Plant Pathology Dataset")
    )

@app.post("/crop-health/predict", response_model=CropHealthPredictionResponse)
async def predict_crop_health(
    file: UploadFile = File(...),
    crop_hint: str = Form(None)
):
    try:
        contents = await file.read()
        return crop_health_service.predict_image(contents, crop_hint=crop_hint)
    except Exception as exc:
        logger.exception("Crop health prediction error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inference error: {str(exc)}"
        )


# ============================================================================
# Phase AI-9: Prediction Monitoring and Continuous Improvement Endpoints
# ============================================================================
from monitoring.schemas import (
    BatchEvaluationRequest,
    BatchEvaluationResponse,
    DriftAnalysisRequest,
    DriftAnalysisResponse,
    PerformanceDriftRequest,
    RetrainingEligibilityCheckRequest,
    RetrainingEligibilityResponse,
    CandidateComparisonResponse
)
from monitoring.evaluator import run_batch_evaluation
from monitoring.drift_detector import analyze_input_data_drift, analyze_performance_drift
from monitoring.retraining_policy import evaluate_retraining_eligibility
from monitoring.candidate_trainer import candidate_trainer
from monitoring.mlflow_tracker import tracker

@app.get("/monitoring/health")
def monitoring_health():
    return {
        "status": "healthy",
        "service": "prediction_monitoring_ai",
        "mlflow_tracking_uri": tracker.tracking_uri,
        "experiment_name": tracker.experiment_name,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/monitoring/evaluate", response_model=BatchEvaluationResponse)
def evaluate_predictions(request: BatchEvaluationRequest):
    try:
        return run_batch_evaluation(request)
    except Exception as exc:
        logger.exception("Prediction evaluation error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation execution failure: {str(exc)}"
        )

@app.post("/monitoring/drift/input", response_model=DriftAnalysisResponse)
def check_input_drift(request: DriftAnalysisRequest):
    try:
        return analyze_input_data_drift(
            reference_records=request.reference_records,
            current_records=request.current_records,
            features_to_check=request.features_to_check,
            model_version=request.model_version or "2.0.0-agronomic-gdd-weather"
        )
    except Exception as exc:
        logger.exception("Input drift analysis error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Input drift check failure: {str(exc)}"
        )

@app.post("/monitoring/drift/performance", response_model=DriftAnalysisResponse)
def check_performance_drift(request: PerformanceDriftRequest):
    try:
        return analyze_performance_drift(
            baseline_evaluations=request.baseline_evaluations,
            current_evaluations=request.current_evaluations,
            model_version=request.model_version or "2.0.0-agronomic-gdd-weather"
        )
    except Exception as exc:
        logger.exception("Performance drift analysis error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Performance drift check failure: {str(exc)}"
        )

@app.post("/monitoring/retraining/check", response_model=RetrainingEligibilityResponse)
def check_retraining_eligibility(request: RetrainingEligibilityCheckRequest):
    try:
        return evaluate_retraining_eligibility(
            verified_outcomes_count=request.verified_outcomes_count,
            training_consented_count=request.training_consented_count,
            current_dataset_fingerprint=request.current_dataset_fingerprint,
            last_trained_dataset_fingerprint=request.last_trained_dataset_fingerprint,
            recent_drift_severity=request.recent_drift_severity,
            days_since_last_training=request.days_since_last_training,
            crop_diversity_count=request.crop_diversity_count,
            region_diversity_count=request.region_diversity_count
        )
    except Exception as exc:
        logger.exception("Retraining eligibility check error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Eligibility evaluation failure: {str(exc)}"
        )

@app.post("/monitoring/retraining/train-candidate", response_model=CandidateComparisonResponse)
def train_candidate_model(request: BatchEvaluationRequest):
    try:
        return candidate_trainer.train_and_evaluate_candidate(
            consented_pairs=request.pairs
        )
    except Exception as exc:
        logger.exception("Candidate training failure: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidate training failed: {str(exc)}"
        )

@app.get("/monitoring/mlflow/runs")
def get_mlflow_runs():
    try:
        return {
            "status": "success",
            "runs": tracker.list_recent_runs(max_results=15)
        }
    except Exception as exc:
        logger.exception("MLflow runs retrieval error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not retrieve MLflow runs: {str(exc)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)


