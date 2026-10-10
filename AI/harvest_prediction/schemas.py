"""
Pydantic Schemas for Harvest Window Prediction Engine
Defines strict input validation, data-quality reporting, and stable output contracts.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class DailyWeatherRecord(BaseModel):
    date: str = Field(..., description="ISO date YYYY-MM-DD")
    t_max: float = Field(..., description="Maximum daily temperature in Celsius")
    t_min: float = Field(..., description="Minimum daily temperature in Celsius")
    t_mean: Optional[float] = Field(None, description="Mean daily temperature in Celsius")
    precipitation_mm: Optional[float] = Field(0.0, description="Daily precipitation sum in mm")
    is_forecast: bool = Field(False, description="True if forecasted, False if historical observation")

class HarvestPredictionRequest(BaseModel):
    crop_name: str = Field(..., min_length=1, description="Common crop name (e.g., Wheat, Rice (Paddy), Cotton)")
    variety: Optional[str] = Field(None, description="Cultivar or variety name (e.g., HD-2967, Basmati)")
    sowing_date: Optional[str] = Field(None, description="ISO date YYYY-MM-DD when crop was sown/transplanted")
    farm_id: Optional[str] = Field(None, description="Farm identifier")
    crop_id: Optional[str] = Field(None, description="Crop instance identifier")
    state: Optional[str] = Field(None, description="Indian State (e.g., Punjab, Maharashtra)")
    district: Optional[str] = Field(None, description="District name")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Farm latitude")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Farm longitude")
    observed_growth_stage: Optional[str] = Field(None, description="Currently visible growth stage (e.g. Tillering)")
    reference_date: Optional[str] = Field(None, description="ISO calculation reference date (defaults to today)")
    custom_weather_series: Optional[List[DailyWeatherRecord]] = Field(None, description="Explicit daily weather data")
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Farmer preferences")
    phase_ai1_knowledge: Optional[Dict[str, Any]] = Field(None, description="External Phase AI-1 knowledge payload")

class UncertaintyRange(BaseModel):
    type: str = Field(..., description="Uncertainty formulation: 'duration_range' | 'empirical_residual'")
    lower_date: str = Field(..., description="Earliest expected harvest date")
    upper_date: str = Field(..., description="Latest expected harvest date")
    range_days: int = Field(..., description="Total span of the harvest window in days")

class DataQualityIndicators(BaseModel):
    crop_profile_available: bool = Field(..., description="Whether verified agronomic crop parameters were resolved")
    sowing_date_available: bool = Field(..., description="Whether a valid historical sowing date was provided")
    weather_data_available: bool = Field(..., description="Whether microclimate weather was retrieved and used")
    verified_gdd_available: bool = Field(..., description="Whether verified base temperature and GDD targets exist")
    historical_observations_count: int = Field(0, description="Number of observed historical weather days accumulated")
    forecast_days_included: int = Field(0, description="Number of forecast days included in projection")
    missing_weather_days: int = Field(0, description="Number of missing or interpolated weather days")

class GddMetrics(BaseModel):
    base_temperature_c: float = Field(..., description="Base temperature threshold T_base in Celsius")
    upper_threshold_c: Optional[float] = Field(None, description="Upper threshold temperature T_upper in Celsius")
    accumulated_gdd: float = Field(..., description="Growing degree-days accumulated since sowing")
    required_maturity_gdd: float = Field(..., description="Target GDD required for physiological maturity")
    progress_percentage: float = Field(..., description="Percentage of required GDD accumulated (0-100+)")
    gdd_maturity_estimated_date: Optional[str] = Field(None, description="Date when required GDD is projected to be reached")

class ExplanationFactor(BaseModel):
    factor: str = Field(..., description="Agronomic or environmental factor key")
    impact: str = Field(..., description="'baseline' | 'delay' | 'accelerate' | 'neutral'")
    description: str = Field(..., description="Human-readable explanation for farmer guidance")

class PredictionDetail(BaseModel):
    estimated_harvest_start: Optional[str] = Field(None, description="Earliest harvest window opening date (YYYY-MM-DD)")
    most_likely_harvest_date: Optional[str] = Field(None, description="Target median harvest readiness date (YYYY-MM-DD)")
    estimated_harvest_end: Optional[str] = Field(None, description="Latest safe harvest date before over-ripeness/lodging (YYYY-MM-DD)")
    days_until_harvest: Optional[int] = Field(None, description="Days remaining until most likely harvest date")
    is_past_due: bool = Field(False, description="True if expected harvest window has already passed")
    prediction_method: str = Field(..., description="'agronomic_baseline' | 'agronomic_gdd_weather' | 'supervised_ml'")
    model_version: str = Field(..., description="Version of prediction engine and rules applied")
    crop_name: str
    variety: Optional[str] = None
    sowing_date: Optional[str] = None
    uncertainty: UncertaintyRange
    data_quality: DataQualityIndicators
    gdd_metrics: Optional[GddMetrics] = None
    weather_adjustment_days: int = Field(0, description="Days adjusted due to rainfall delays or heat acceleration")
    explanation: List[ExplanationFactor]
    assumptions_and_limitations: List[str]
    calculated_at: str

class HarvestPredictionResponse(BaseModel):
    status: str = Field(..., description="'success' | 'insufficient_data' | 'error'")
    message: Optional[str] = None
    prediction: Optional[PredictionDetail] = None

class ValidateInputRequest(BaseModel):
    crop_name: str
    variety: Optional[str] = None
    sowing_date: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ValidateInputResponse(BaseModel):
    valid: bool
    resolved_crop_profile: Optional[str] = None
    variety_matched: bool = False
    sowing_date_valid: bool = False
    coordinates_valid: bool = False
    missing_fields: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)

class ModelMetadataResponse(BaseModel):
    engine_name: str = "HarvestWindow Harvest Prediction Engine"
    version: str = "2.0.0"
    prediction_layers: List[str] = Field(
        default_factory=lambda: [
            "Layer A: Agronomic Baseline (ICAR/SAU verified duration benchmarks)",
            "Layer B: Growing Degree-Day (GDD) Accumulation & Maturity Engine",
            "Layer C: Microclimate Weather-Aware Dynamic Adjustments",
            "Layer D: Supervised ML Regression (Pipeline ready; production inference deferred pending real farm observation records)"
        ]
    )
    supported_crops_count: int
    data_suitability_summary: Dict[str, Any]
    last_calibrated: str

class HealthCheckResponse(BaseModel):
    status: str = "healthy"
    version: str = "2.0.0"
    service: str = "harvest_prediction_ai"
    timestamp: str
