"""
Pydantic schemas for Crop Recommendation & Suitability Engine (Phase AI-4)
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class CropRecommendationRequest(BaseModel):
    farm_id: str = Field(..., description="Unique farm identifier")
    state: Optional[str] = Field(None, description="State name (e.g. Gujarat, Punjab)")
    district: Optional[str] = Field(None, description="District name")
    season: Optional[str] = Field(None, description="Agricultural season: Kharif, Rabi, Zaid, or Whole Year")
    current_month: Optional[int] = Field(None, ge=1, le=12, description="Evaluation calendar month (1-12)")
    soil_type: Optional[str] = Field(None, description="Soil classification (Alluvial, Black, Red, etc.)")
    soil_ph: Optional[float] = Field(None, ge=3.0, le=11.0, description="Measured or tested soil pH")
    nitrogen: Optional[float] = Field(None, ge=0.0, le=300.0, description="Available Soil Nitrogen in kg/ha or ppm")
    phosphorus: Optional[float] = Field(None, ge=0.0, le=200.0, description="Available Soil Phosphorus in kg/ha or ppm")
    potassium: Optional[float] = Field(None, ge=0.0, le=300.0, description="Available Soil Potassium in kg/ha or ppm")
    irrigation_source: Optional[str] = Field(None, description="Irrigation availability (Canal, Borewell, Drip, Rainfed, etc.)")
    temperature: Optional[float] = Field(None, ge=-10.0, le=55.0, description="Ambient or seasonal mean temperature in °C")
    rainfall: Optional[float] = Field(None, ge=0.0, le=4000.0, description="Seasonal or annual rainfall in mm")
    humidity: Optional[float] = Field(None, ge=0.0, le=100.0, description="Relative humidity in %")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Geographic latitude")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Geographic longitude")
    top_k: int = Field(15, ge=1, le=50, description="Maximum number of candidates to return")


class ReasonItem(BaseModel):
    factor: str
    message: str
    source: str


class ConstraintItem(BaseModel):
    constraintId: str
    observedValue: str
    requiredCondition: str
    dataSource: str
    explanation: str
    disqualifies: bool


class ScoreBreakdown(BaseModel):
    season: Optional[float] = None
    climate: Optional[float] = None
    soil: Optional[float] = None
    water: Optional[float] = None
    regionalSuitability: Optional[float] = None


class CropRecommendationCandidate(BaseModel):
    cropId: str
    cropName: str
    hindiName: Optional[str] = None
    category_type: Optional[str] = None
    scientificName: Optional[str] = None
    variety: Optional[str] = None
    suitabilityScore: float
    category: str
    confidence: str
    evidenceCoverage: float
    scoreBreakdown: ScoreBreakdown
    reasons: List[ReasonItem]
    constraints: List[ConstraintItem]
    missingInformation: List[str]
    agronomicSummary: Optional[str] = None


class CropRecommendationResponse(BaseModel):
    farmId: str
    location: Dict[str, Any]
    season: str
    currentMonth: int
    generatedAt: str
    engineVersion: str
    evidenceSummary: Dict[str, Any]
    recommendations: List[CropRecommendationCandidate]
    dataLimitations: List[str]


class RecommendationMetadataResponse(BaseModel):
    engine_name: str
    engine_version: str
    supported_crops_count: int
    supported_crops: List[str]
    supported_seasons: List[str]
    recognized_soil_types: List[str]
    factor_weights: Dict[str, float]
    ml_model_status: Dict[str, Any]
    fao_gaez_status: Dict[str, Any]
