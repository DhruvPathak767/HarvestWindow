"""
HarvestWindow Phase AI-1: Agronomic Validation Rules
Enforces physical and biological boundaries for crop growth, GDD, seasons, and soil requirements.
"""
from typing import Dict, Any, Tuple, List
from .normalize import safe_int, safe_float, clean_text

VALID_VERIFICATION_STATUSES = {"verified", "reference_only", "unverified", "synthetic"}
VALID_DATA_ORIGINS = {"official_reference", "observed", "derived", "synthetic", "unknown"}

def validate_crop_calendar_record(record: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate a complete crop calendar and agronomic profile record.
    Returns (True, []) if valid, or (False, [reasons...]) if invalid.
    """
    issues: List[str] = []

    # 1. Essential identification
    crop_name = clean_text(record.get("crop_name"))
    if not crop_name or crop_name.lower() == "unknown":
        issues.append("Missing or invalid crop_name")

    state = clean_text(record.get("state"))
    if not state or state.lower() == "unknown":
        issues.append("Missing or invalid state")

    season = clean_text(record.get("season"))
    if not season:
        issues.append("Missing season")

    # 2. Sowing calendar validation
    s_start_m = safe_int(record.get("sowing_start_month"))
    s_end_m = safe_int(record.get("sowing_end_month"))

    if s_start_m is None or not (1 <= s_start_m <= 12):
        issues.append(f"Invalid sowing_start_month: {record.get('sowing_start_month')}")
    if s_end_m is None or not (1 <= s_end_m <= 12):
        issues.append(f"Invalid sowing_end_month: {record.get('sowing_end_month')}")

    s_start_d = safe_int(record.get("sowing_start_day"))
    if s_start_d is not None and not (1 <= s_start_d <= 31):
        issues.append(f"Invalid sowing_start_day: {s_start_d}")

    s_end_d = safe_int(record.get("sowing_end_day"))
    if s_end_d is not None and not (1 <= s_end_d <= 31):
        issues.append(f"Invalid sowing_end_day: {s_end_d}")

    # 3. Optional harvest window validation
    h_start_m = safe_int(record.get("harvest_start_month"))
    if h_start_m is not None and not (1 <= h_start_m <= 12):
        issues.append(f"Invalid harvest_start_month: {h_start_m}")

    h_end_m = safe_int(record.get("harvest_end_month"))
    if h_end_m is not None and not (1 <= h_end_m <= 12):
        issues.append(f"Invalid harvest_end_month: {h_end_m}")

    # 4. Growth duration validation
    dur_min = safe_int(record.get("duration_min_days"))
    dur_typ = safe_int(record.get("duration_typical_days"))
    dur_max = safe_int(record.get("duration_max_days"))

    if dur_min is not None and dur_min <= 0:
        issues.append(f"duration_min_days must be positive, got {dur_min}")

    if dur_min is not None and dur_typ is not None:
        if dur_min > dur_typ:
            issues.append(f"duration_min_days ({dur_min}) exceeds duration_typical_days ({dur_typ})")

    if dur_typ is not None and dur_max is not None:
        if dur_typ > dur_max:
            issues.append(f"duration_typical_days ({dur_typ}) exceeds duration_max_days ({dur_max})")

    if dur_min is not None and dur_max is not None:
        if dur_min > dur_max:
            issues.append(f"duration_min_days ({dur_min}) exceeds duration_max_days ({dur_max})")

    # 5. Growing Degree Days (GDD) validation
    gdd_min = safe_float(record.get("gdd_min"))
    gdd_typ = safe_float(record.get("gdd_typical"))
    gdd_max = safe_float(record.get("gdd_max"))
    base_t = safe_float(record.get("base_temp_c"))
    upper_t = safe_float(record.get("upper_temp_c"))

    if gdd_min is not None and gdd_min < 0:
        issues.append(f"gdd_min cannot be negative: {gdd_min}")

    if gdd_min is not None and gdd_typ is not None and gdd_min > gdd_typ:
        issues.append(f"gdd_min ({gdd_min}) exceeds gdd_typical ({gdd_typ})")

    if gdd_typ is not None and gdd_max is not None and gdd_typ > gdd_max:
        issues.append(f"gdd_typical ({gdd_typ}) exceeds gdd_max ({gdd_max})")

    if (gdd_min is not None or gdd_typ is not None) and base_t is None:
        issues.append("GDD requirement specified without explicit base_temp_c")

    if base_t is not None and upper_t is not None and base_t >= upper_t:
        issues.append(f"base_temp_c ({base_t}) must be less than upper_temp_c ({upper_t})")

    # 6. Environmental / Soil suitability validation
    ph_min = safe_float(record.get("soil_ph_min"))
    ph_max = safe_float(record.get("soil_ph_max"))

    if ph_min is not None and not (3.0 <= ph_min <= 11.0):
        issues.append(f"soil_ph_min out of realistic range (3.0 - 11.0): {ph_min}")
    if ph_max is not None and not (3.0 <= ph_max <= 11.0):
        issues.append(f"soil_ph_max out of realistic range (3.0 - 11.0): {ph_max}")
    if ph_min is not None and ph_max is not None and ph_min > ph_max:
        issues.append(f"soil_ph_min ({ph_min}) exceeds soil_ph_max ({ph_max})")

    t_min = safe_float(record.get("temp_min_c"))
    t_max = safe_float(record.get("temp_max_c"))
    if t_min is not None and t_max is not None and t_min > t_max:
        issues.append(f"temp_min_c ({t_min}) exceeds temp_max_c ({t_max})")

    r_min = safe_float(record.get("rainfall_min_mm"))
    r_max = safe_float(record.get("rainfall_max_mm"))
    if r_min is not None and r_min < 0:
        issues.append(f"rainfall_min_mm cannot be negative: {r_min}")
    if r_min is not None and r_max is not None and r_min > r_max:
        issues.append(f"rainfall_min_mm ({r_min}) exceeds rainfall_max_mm ({r_max})")

    # 7. Provenance & verification validation
    source_name = clean_text(record.get("source_name"))
    if not source_name:
        issues.append("Missing source_name for data provenance")

    status = clean_text(record.get("verification_status"))
    if status and status.lower() not in VALID_VERIFICATION_STATUSES:
        issues.append(f"Invalid verification_status '{status}'; expected one of {VALID_VERIFICATION_STATUSES}")

    return len(issues) == 0, issues

def validate_growth_profile(record: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate standalone growth profile parameters."""
    issues = []
    dur_min = safe_int(record.get("minDurationDays"))
    dur_typ = safe_int(record.get("typicalDurationDays"))
    dur_max = safe_int(record.get("maxDurationDays"))

    if not dur_min or dur_min <= 0:
        issues.append("minDurationDays must be positive integer")
    if not dur_typ or dur_typ <= 0:
        issues.append("typicalDurationDays must be positive integer")
    if not dur_max or dur_max <= 0:
        issues.append("maxDurationDays must be positive integer")

    if dur_min and dur_typ and dur_min > dur_typ:
        issues.append("minDurationDays cannot exceed typicalDurationDays")
    if dur_typ and dur_max and dur_typ > dur_max:
        issues.append("typicalDurationDays cannot exceed maxDurationDays")

    return len(issues) == 0, issues

def validate_suitability_profile(record: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate standalone suitability profile parameters."""
    issues = []
    ph_min = safe_float(record.get("soilPhMin"))
    ph_max = safe_float(record.get("soilPhMax"))
    if ph_min is not None and ph_max is not None and ph_min > ph_max:
        issues.append("soilPhMin cannot exceed soilPhMax")

    t_min = safe_float(record.get("tempMinC"))
    t_max = safe_float(record.get("tempMaxC"))
    if t_min is not None and t_max is not None and t_min > t_max:
        issues.append("tempMinC cannot exceed tempMaxC")

    return len(issues) == 0, issues
