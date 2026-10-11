"""
Pydantic Schemas for Phase AI-6 Crop Disease & Health Detection
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class AlternativePrediction(BaseModel):
    class_id: str
    display_name: str
    crop: str
    confidence_pct: float
    condition_category: str
    is_healthy: bool

class RecommendationDetails(BaseModel):
    condition_id: str
    display_name: str
    symptoms: List[str]
    immediate_actions: List[str]
    preventive_measures: List[str]
    hygiene_practices: List[str]
    when_to_contact_expert: str
    provenance: str = "ICAR / State Agricultural Universities agronomic guidelines"
    notes: Optional[str] = None

class ImageQualityAssessment(BaseModel):
    is_acceptable: bool = True
    blur_score: Optional[float] = None
    is_blurry: bool = False
    brightness_score: Optional[float] = None
    is_poor_exposure: bool = False
    warnings: List[str] = Field(default_factory=list)

class CropHealthPredictionResponse(BaseModel):
    success: bool = True
    status: str = Field(description="HEALTHY | DISEASED | UNFAMILIAR | INCONCLUSIVE")
    predicted_class_id: str
    predicted_display_name: str
    crop: str
    condition_category: str = Field(description="HEALTHY | FUNGAL_DISEASE | BACTERIAL_DISEASE | VIRAL_DISEASE | PEST_DAMAGE | UNKNOWN_OR_UNSUPPORTED")
    is_healthy: bool
    confidence_pct: float
    confidence_level: str = Field(description="HIGH_CONFIDENCE | MODERATE_CONFIDENCE | LOW_CONFIDENCE | INCONCLUSIVE")
    confidence_interpretation: str
    top_alternatives: List[AlternativePrediction] = Field(default_factory=list)
    symptoms: List[str] = Field(default_factory=list)
    recommendations: Optional[RecommendationDetails] = None
    expert_guidance: str
    image_quality: ImageQualityAssessment
    model_version: str
    model_name: str
    inference_latency_ms: float
    timestamp: str

class ModelInfoResponse(BaseModel):
    model_name: str
    model_version: str
    architecture: str
    total_classes: int
    supported_crops: List[str]
    supported_classes: List[str]
    input_dimensions: str
    readiness_status: str
    evaluation_metrics: Optional[Dict[str, Any]] = None
    training_dataset: Optional[str] = None

class HealthStatusResponse(BaseModel):
    status: str
    version: str
    service: str = "crop_health_ai"
    model_loaded: bool
    timestamp: str
