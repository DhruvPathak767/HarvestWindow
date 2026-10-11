"""
Production Estimation Engine (Phase AI-5).
Calculates total expected farm production from predicted yield and normalized planted area.
Provides unit conversion, production bounds, and input sanity validations.
"""
from typing import Dict, Any, Optional, Tuple
from .config import (
    AREA_TO_HECTARES,
    CANONICAL_AREA_UNIT,
    CANONICAL_PRODUCTION_UNIT,
    CANONICAL_YIELD_UNIT
)


class ProductionEstimationError(ValueError):
    """Raised when area or yield parameters violate validation constraints."""
    pass


def convert_to_hectares(area_value: float, area_unit: str) -> float:
    """
    Converts any supported agricultural area unit into canonical hectares.
    Supported: HECTARE, ACRE, SQ_METER, BIGHA, GUNTHA.
    """
    if area_value is None or not isinstance(area_value, (int, float)):
        raise ProductionEstimationError("Planted area value must be a valid number.")

    if area_value <= 0:
        raise ProductionEstimationError(f"Planted area must be strictly positive (>0), got: {area_value}")

    normalized_unit = str(area_unit).strip().upper()
    factor = AREA_TO_HECTARES.get(normalized_unit)
    if factor is None:
        raise ProductionEstimationError(
            f"Unsupported area unit: '{area_unit}'. Supported units: {list(AREA_TO_HECTARES.keys())}"
        )

    return round(float(area_value) * factor, 6)


def estimate_total_production(
    predicted_yield_t_ha: float,
    planted_area_value: float,
    planted_area_unit: str = "HECTARE",
    lower_yield_t_ha: Optional[float] = None,
    upper_yield_t_ha: Optional[float] = None
) -> Dict[str, Any]:
    """
    Computes total expected production in metric tonnes with uncertainty bounds.
    Formula:
        expectedProductionTonnes = predictedYieldTonnesPerHectare * areaHectares
    """
    if predicted_yield_t_ha is None or not isinstance(predicted_yield_t_ha, (int, float)):
        raise ProductionEstimationError("Predicted yield must be a valid numeric value.")

    if predicted_yield_t_ha <= 0:
        raise ProductionEstimationError(f"Predicted yield must be positive, got: {predicted_yield_t_ha}")

    area_ha = convert_to_hectares(planted_area_value, planted_area_unit)
    expected_production_tonnes = round(predicted_yield_t_ha * area_ha, 4)

    lower_prod = None
    upper_prod = None
    if lower_yield_t_ha is not None and lower_yield_t_ha > 0:
        lower_prod = round(lower_yield_t_ha * area_ha, 4)
    if upper_yield_t_ha is not None and upper_yield_t_ha > 0:
        upper_prod = round(upper_yield_t_ha * area_ha, 4)

    return {
        "area_hectares": area_ha,
        "original_area_value": float(planted_area_value),
        "original_area_unit": str(planted_area_unit).upper(),
        "predicted_yield_t_ha": round(float(predicted_yield_t_ha), 4),
        "expected_production_tonnes": expected_production_tonnes,
        "lower_production_tonnes": lower_prod,
        "upper_production_tonnes": upper_prod,
        "canonical_yield_unit": CANONICAL_YIELD_UNIT,
        "canonical_production_unit": CANONICAL_PRODUCTION_UNIT,
    }
