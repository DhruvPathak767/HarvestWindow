"""
Layer B: Growing Degree-Day (GDD) Calculation & Phenological Accumulation Engine
Implements crop-specific thermal time accumulation grounded in validated physiological thresholds.
"""

from datetime import date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from .schemas import DailyWeatherRecord
from .agronomic_baseline import parse_iso_date

def calculate_daily_gdd(
    t_max: float,
    t_min: float,
    base_temp: float,
    upper_threshold: Optional[float] = None
) -> float:
    """
    Calculates daily Growing Degree-Days (GDD) using the standard agricultural average method
    with optional upper threshold truncation (Baskerville-Emin / McMaster & Wilhelm standard).
    
    Formula:
    T_max_eff = min(t_max, upper_threshold) if upper_threshold else t_max
    T_min_eff = max(t_min, base_temp)
    T_mean = (T_max_eff + T_min_eff) / 2.0
    GDD = max(0.0, T_mean - base_temp)
    """
    if t_max is None or t_min is None or base_temp is None:
        return 0.0
        
    # Safeguard against inversion in corrupted sensor readings
    if t_min > t_max:
        t_max, t_min = t_min, t_max
        
    t_max_eff = min(t_max, upper_threshold) if upper_threshold is not None else t_max
    t_min_eff = max(t_min, base_temp)
    
    # If maximum temperature never exceeds base temperature, no development occurs
    if t_max_eff < base_temp:
        return 0.0
        
    t_mean = (t_max_eff + t_min_eff) / 2.0
    return max(0.0, round(t_mean - base_temp, 2))

def accumulate_gdd_series(
    weather_records: List[DailyWeatherRecord],
    sowing_date: date,
    reference_date: date,
    base_temp: float,
    upper_threshold: Optional[float] = None
) -> Dict[str, Any]:
    """
    Accumulates daily GDD from sowing_date up to reference_date across an ordered weather series.
    Distinguishes historical observed records from future forecast records.
    """
    total_accumulated = 0.0
    observed_count = 0
    forecast_count = 0
    missing_days = 0
    daily_gdd_log = []
    
    # Create lookup map by ISO date string
    record_map = {r.date: r for r in weather_records}
    
    curr = sowing_date
    while curr <= reference_date:
        curr_str = curr.isoformat()
        rec = record_map.get(curr_str)
        if rec:
            daily_val = calculate_daily_gdd(rec.t_max, rec.t_min, base_temp, upper_threshold)
            total_accumulated += daily_val
            if rec.is_forecast:
                forecast_count += 1
            else:
                observed_count += 1
            daily_gdd_log.append({
                "date": curr_str,
                "t_max": rec.t_max,
                "t_min": rec.t_min,
                "gdd": daily_val,
                "is_forecast": rec.is_forecast,
            })
        else:
            missing_days += 1
        curr += timedelta(days=1)
        
    return {
        "accumulated_gdd": round(total_accumulated, 1),
        "observed_days_count": observed_count,
        "forecast_days_count": forecast_count,
        "missing_days_count": missing_days,
        "daily_log": daily_gdd_log,
    }

def project_gdd_harvest_date(
    accumulated_gdd: float,
    required_gdd: float,
    reference_date: date,
    forecast_records: List[DailyWeatherRecord],
    base_temp: float,
    upper_threshold: Optional[float] = None,
    fallback_daily_gdd_rate: float = 14.5
) -> Tuple[Optional[date], List[str]]:
    """
    Projects the date when accumulated GDD reaches the required maturity threshold.
    Uses daily forecast records first, then continues with the average daily GDD rate.
    """
    explanations = []
    if required_gdd <= 0:
        return None, ["Required GDD threshold is not configured for this crop profile."]
        
    if accumulated_gdd >= required_gdd:
        explanations.append(
            f"Thermal time requirement reached: Crop has accumulated {accumulated_gdd:.1f} GDD (required: {required_gdd:.1f} GDD). Physiological maturity completed."
        )
        return reference_date, explanations
        
    remaining_gdd = required_gdd - accumulated_gdd
    curr = reference_date + timedelta(days=1)
    projected_accum = 0.0
    
    # 1. Consume near-term daily forecast records
    forecast_map = {r.date: r for r in forecast_records if r.is_forecast}
    while projected_accum < remaining_gdd:
        curr_str = curr.isoformat()
        if curr_str in forecast_map:
            rec = forecast_map[curr_str]
            daily_val = calculate_daily_gdd(rec.t_max, rec.t_min, base_temp, upper_threshold)
            projected_accum += daily_val
        else:
            # Fallback to rolling average rate
            rate = max(1.0, fallback_daily_gdd_rate)
            projected_accum += rate
            
        if projected_accum >= remaining_gdd:
            break
            
        curr += timedelta(days=1)
        # Circuit breaker against infinite loop if temperature < base
        if (curr - reference_date).days > 365:
            explanations.append("Thermal accumulation projection exceeded 365 days; default calendar limit applied.")
            break
            
    explanations.append(
        f"GDD maturity projected on {curr.isoformat()} based on {accumulated_gdd:.1f}/{required_gdd:.1f} GDD ({round((accumulated_gdd/required_gdd)*100, 1)}% complete)."
    )
    return curr, explanations
