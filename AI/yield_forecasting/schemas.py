"""
Pydantic schemas for Yield Forecasting & Production Estimation Engine (Phase AI-5).
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class PlantedAreaInput(BaseModel):
    value: float = Field(..., gt=0, description="Planted area magnitude")
    unit: str = Field("HECTARE", description="Area unit (HECTARE, ACRE, SQ_METER, etc.)")


class YieldPredictionRequest(BaseModel):
    crop_name: str = Field(..., description="Canonical or local crop name")
    variety: Optional[str] = Field(None, description="Crop variety if known")
    state: str = Field(..., description="Indian State name")
    district: Optional[str] = Field(None, description="District name")
    season: Optional[str] = Field("Kharif", description="Agricultural season (Kharif, Rabi, Summer, Whole Year)")
    planted_area: PlantedAreaInput = Field(..., description="Planted area specification")
    sowing_date: Optional[str] = Field(None, description="ISO sowing date YYYY-MM-DD")
    expected_harvest_date: Optional[str] = Field(None, description="ISO expected harvest date YYYY-MM-DD")
    soil_type: Optional[str] = Field(None, description="Soil type (Alluvial, Black, Red, Sandy, etc.)")
    annual_rainfall_mm: Optional[float] = Field(None, ge=0, description="Annual/seasonal cumulative rainfall in mm")
    fertilizer_kg: Optional[float] = Field(None, ge=0, description="Total or per-hectare fertilizer applied")
    pesticide_kg: Optional[float] = Field(None, ge=0, description="Total or per-hectare pesticide applied")
    prediction_stage: Optional[str] = Field(None, description="Optional override for crop prediction stage")


class UncertaintyInterval(BaseModel):
    available: bool = True
    method: Optional[str] = "CALIBRATED_RESIDUAL_PERCENTILES"
    confidence_level_pct: float = 80.0
    lower_yield_t_ha: float
    upper_yield_t_ha: float
    lower_production_tonnes: float
    upper_production_tonnes: float


class PlantedAreaResponse(BaseModel):
    original_value: float
    original_unit: str
    area_hectares: float


class YieldValueResponse(BaseModel):
    value: float
    unit: str = "TONNE_PER_HECTARE"


class ProductionValueResponse(BaseModel):
    value: float
    unit: str = "TONNE"


class ModelInfoResponse(BaseModel):
    name: str = "HarvestWindow Yield Forecasting Engine"
    version: str = "1.0.0"
    algorithm: str
    target_unit: str = "t/ha"


class DataQualityResponse(BaseModel):
    missing_features: List[str] = []
    warnings: List[str] = []
    used_fallback: bool = False


class YieldPredictionResponse(BaseModel):
    crop_name: str
    state: str
    season: str
    prediction_stage: str
    planted_area: PlantedAreaResponse
    yield_estimate: YieldValueResponse
    production_estimate: ProductionValueResponse
    uncertainty: UncertaintyInterval
    confidence: str  # "HIGH", "MODERATE", "LOW"
    model: ModelInfoResponse
    data_quality: DataQualityResponse
    generated_at: str


class ProductionEstimateRequest(BaseModel):
    predicted_yield_t_ha: float = Field(..., gt=0, description="Yield in tonnes per hectare")
    planted_area: PlantedAreaInput
    crop_name: Optional[str] = None
    lower_yield_t_ha: Optional[float] = None
    upper_yield_t_ha: Optional[float] = None


class ProductionEstimateResponse(BaseModel):
    crop_name: Optional[str]
    planted_area: PlantedAreaResponse
    predicted_yield_t_ha: float
    expected_production_tonnes: float
    lower_production_tonnes: Optional[float] = None
    upper_production_tonnes: Optional[float] = None
    area_hectares: float
