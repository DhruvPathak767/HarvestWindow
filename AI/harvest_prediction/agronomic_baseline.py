"""
Layer A: Agronomic Baseline Prediction Engine
Calculates earliest, typical, and latest harvest window bounds using verified
cultivar duration benchmarks from sowing date without statistical extrapolation.
"""

from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional, Tuple
from .crop_knowledge import resolve_crop_profile

def parse_iso_date(date_str: Optional[str]) -> Optional[date]:
    """
    Safely parses an ISO date string (YYYY-MM-DD) into a Python date object.
    Robust against trailing times or whitespace.
    """
    if not date_str or not isinstance(date_str, str):
        return None
    cleaned = date_str.strip().split("T")[0]
    try:
        parts = cleaned.split("-")
        if len(parts) == 3:
            return date(int(parts[0]), int(parts[1]), int(parts[2]))
        return datetime.fromisoformat(cleaned).date()
    except (ValueError, TypeError):
        return None

def compute_agronomic_baseline(
    crop_name: str,
    variety: Optional[str] = None,
    sowing_date_str: Optional[str] = None,
    reference_date_str: Optional[str] = None,
    phase_ai1_knowledge: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Computes Layer A agronomic baseline estimation.
    Returns structured results or explicit missing-data diagnostics.
    """
    ref_date = parse_iso_date(reference_date_str) or date.today()
    profile = resolve_crop_profile(crop_name, variety, phase_ai1_knowledge)
    
    # 1. Validation of Sowing Date
    sow_date = parse_iso_date(sowing_date_str)
    if not sow_date:
        return {
            "status": "insufficient_data",
            "reason": "MISSING_SOWING_DATE",
            "message": "Sowing date is required to establish a field-specific harvest window. A generic calendar estimate cannot represent an active crop block without planting confirmation.",
            "crop_profile": profile,
            "required_inputs": ["sowing_date"],
        }
    
    # 2. Duration Bounds Validation
    min_days = int(profile["min_days"])
    typical_days = int(profile["typical_days"])
    max_days = int(profile["max_days"])
    
    # Guard against invalid duration ranges
    if min_days > typical_days:
        min_days = int(typical_days * 0.9)
    if max_days < typical_days:
        max_days = int(typical_days * 1.15)
        
    earliest_harvest = sow_date + timedelta(days=min_days)
    most_likely_harvest = sow_date + timedelta(days=typical_days)
    latest_harvest = sow_date + timedelta(days=max_days)
    
    days_since_sowing = (ref_date - sow_date).days
    days_remaining = (most_likely_harvest - ref_date).days
    is_past_due = ref_date > latest_harvest
    
    range_span = (latest_harvest - earliest_harvest).days
    
    return {
        "status": "success",
        "crop_profile": profile,
        "sowing_date": sow_date.isoformat(),
        "reference_date": ref_date.isoformat(),
        "days_since_sowing": days_since_sowing,
        "earliest_harvest_date": earliest_harvest.isoformat(),
        "most_likely_harvest_date": most_likely_harvest.isoformat(),
        "latest_harvest_date": latest_harvest.isoformat(),
        "days_until_harvest": max(0, days_remaining) if not is_past_due else 0,
        "is_past_due": is_past_due,
        "duration_bounds": {
            "min_days": min_days,
            "typical_days": typical_days,
            "max_days": max_days,
            "window_range_days": range_span,
        },
        "method": "agronomic_baseline",
    }
