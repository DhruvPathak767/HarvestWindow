"""
Weather Provider Integration and Dynamic Weather-Aware Adjustments (Layer C)
Integrates with Open-Meteo Historical & Forecast APIs with local in-memory caching,
resilience against rate-limits or timeouts, and defensible agronomic rules.
"""

import time
import logging
from datetime import datetime, date, timedelta
from typing import List, Optional, Tuple, Dict, Any
import requests

from .schemas import DailyWeatherRecord, ExplanationFactor

logger = logging.getLogger("harvest_prediction.weather")

OPEN_METEO_HISTORICAL_URL = "https://archive-api.open-meteo.com/v1/archive"
OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# In-memory LRU/Bounded Cache: key -> (timestamp, data)
_WEATHER_CACHE: Dict[str, Tuple[float, List[DailyWeatherRecord]]] = {}
CACHE_TTL_SECONDS = 3600  # 1 hour cache
MAX_CACHE_ENTRIES = 200

def _get_cache_key(lat: float, lon: float, start_date: str, end_date: str) -> str:
    return f"{round(lat, 3)}_{round(lon, 3)}_{start_date}_{end_date}"

class WeatherProvider:
    """
    Modular weather provider interface.
    Fetches historical daily observations and short-term forecasts for farm coordinates.
    """

    def __init__(self, timeout: float = 6.0):
        self.timeout = timeout

    def fetch_weather_series(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str
    ) -> Tuple[List[DailyWeatherRecord], Dict[str, Any]]:
        """
        Retrieves daily weather records spanning start_date to end_date.
        Combines historical archive and forecast if end_date crosses today.
        Returns: (records, metadata)
        """
        metadata = {
            "source": "Open-Meteo",
            "provider_available": True,
            "historical_days": 0,
            "forecast_days": 0,
            "missing_days": 0,
            "notes": []
        }

        cache_key = _get_cache_key(latitude, longitude, start_date, end_date)
        now = time.time()
        if cache_key in _WEATHER_CACHE:
            cached_time, cached_records = _WEATHER_CACHE[cache_key]
            if now - cached_time < CACHE_TTL_SECONDS:
                metadata["notes"].append("Loaded from local weather cache")
                metadata["historical_days"] = sum(1 for r in cached_records if not r.is_forecast)
                metadata["forecast_days"] = sum(1 for r in cached_records if r.is_forecast)
                return cached_records, metadata

        records: List[DailyWeatherRecord] = []
        today_str = date.today().isoformat()

        try:
            # 1. Historical data needed? (if start_date < today)
            hist_start = start_date
            hist_end = min(end_date, today_str)

            if hist_start <= hist_end:
                hist_records = self._fetch_historical(latitude, longitude, hist_start, hist_end)
                records.extend(hist_records)
                metadata["historical_days"] = len(hist_records)

            # 2. Forecast data needed? (if end_date >= today)
            if end_date >= today_str:
                fc_records = self._fetch_forecast(latitude, longitude)
                # Filter to dates > hist_end and <= end_date
                fc_filtered = [
                    r for r in fc_records 
                    if r.date > hist_end and r.date <= end_date
                ]
                records.extend(fc_filtered)
                metadata["forecast_days"] = len(fc_filtered)

            # Deduplicate by date
            seen_dates = set()
            deduped: List[DailyWeatherRecord] = []
            for r in records:
                if r.date not in seen_dates:
                    seen_dates.add(r.date)
                    deduped.append(r)
            deduped.sort(key=lambda x: x.date)

            # Store in bounded cache
            if len(_WEATHER_CACHE) >= MAX_CACHE_ENTRIES:
                oldest_key = min(_WEATHER_CACHE.keys(), key=lambda k: _WEATHER_CACHE[k][0])
                del _WEATHER_CACHE[oldest_key]
            _WEATHER_CACHE[cache_key] = (now, deduped)

            return deduped, metadata

        except Exception as exc:
            logger.warning("Weather API request failed: %s", exc)
            metadata["provider_available"] = False
            metadata["notes"].append(f"Weather retrieval failed: {str(exc)}")
            return [], metadata

    def _fetch_historical(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str
    ) -> List[DailyWeatherRecord]:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start_date,
            "end_date": end_date,
            "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum",
            "timezone": "auto"
        }
        resp = requests.get(OPEN_METEO_HISTORICAL_URL, params=params, timeout=self.timeout)
        if resp.status_code != 200:
            logger.warning("Open-Meteo historical error %d: %s", resp.status_code, resp.text)
            return []

        data = resp.json()
        daily = data.get("daily", {})
        dates = daily.get("time", [])
        t_max = daily.get("temperature_2m_max", [])
        t_min = daily.get("temperature_2m_min", [])
        t_mean = daily.get("temperature_2m_mean", [])
        precip = daily.get("precipitation_sum", [])

        records = []
        for i, d in enumerate(dates):
            mx = t_max[i] if i < len(t_max) and t_max[i] is not None else 25.0
            mn = t_min[i] if i < len(t_min) and t_min[i] is not None else 15.0
            me = t_mean[i] if i < len(t_mean) and t_mean[i] is not None else (mx + mn) / 2.0
            pr = precip[i] if i < len(precip) and precip[i] is not None else 0.0
            records.append(DailyWeatherRecord(
                date=d,
                t_max=mx,
                t_min=mn,
                t_mean=me,
                precipitation_mm=pr,
                is_forecast=False
            ))
        return records

    def _fetch_forecast(
        self,
        latitude: float,
        longitude: float
    ) -> List[DailyWeatherRecord]:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum",
            "forecast_days": 16,
            "timezone": "auto"
        }
        resp = requests.get(OPEN_METEO_FORECAST_URL, params=params, timeout=self.timeout)
        if resp.status_code != 200:
            logger.warning("Open-Meteo forecast error %d: %s", resp.status_code, resp.text)
            return []

        data = resp.json()
        daily = data.get("daily", {})
        dates = daily.get("time", [])
        t_max = daily.get("temperature_2m_max", [])
        t_min = daily.get("temperature_2m_min", [])
        t_mean = daily.get("temperature_2m_mean", [])
        precip = daily.get("precipitation_sum", [])

        records = []
        for i, d in enumerate(dates):
            mx = t_max[i] if i < len(t_max) and t_max[i] is not None else 30.0
            mn = t_min[i] if i < len(t_min) and t_min[i] is not None else 18.0
            me = t_mean[i] if i < len(t_mean) and t_mean[i] is not None else (mx + mn) / 2.0
            pr = precip[i] if i < len(precip) and precip[i] is not None else 0.0
            records.append(DailyWeatherRecord(
                date=d,
                t_max=mx,
                t_min=mn,
                t_mean=me,
                precipitation_mm=pr,
                is_forecast=True
            ))
        return records


def calculate_weather_aware_adjustments(
    weather_series: List[DailyWeatherRecord],
    tentative_harvest_date: str,
    window_days: int = 7
) -> Tuple[int, List[ExplanationFactor]]:
    """
    Defensible agronomic adjustments based on forecast/observed weather near harvest:
    1. Rainfall delay: Heavy rainfall (> 20mm) forecast in the harvest window causes soil trafficability
       issues and high grain moisture, delaying mechanical/manual harvesting (+2 to +4 days).
    2. Heat acceleration: Severe sustained heat (> 38°C) during maturation forces premature drying (-1 to -2 days).
    """
    if not weather_series:
        return 0, []

    factors: List[ExplanationFactor] = []
    total_adjustment = 0

    try:
        target_dt = datetime.strptime(tentative_harvest_date, "%Y-%m-%d").date()
    except Exception:
        return 0, []

    window_start = target_dt - timedelta(days=2)
    window_end = target_dt + timedelta(days=window_days)

    relevant_days = [
        r for r in weather_series 
        if window_start.isoformat() <= r.date <= window_end.isoformat()
    ]

    if not relevant_days:
        return 0, []

    # Check heavy rainfall
    total_rainfall_window = sum(r.precipitation_mm or 0.0 for r in relevant_days)
    rainy_days = [r for r in relevant_days if (r.precipitation_mm or 0.0) >= 10.0]

    if total_rainfall_window >= 35.0 or len(rainy_days) >= 3:
        adjustment = 4
        total_adjustment += adjustment
        factors.append(ExplanationFactor(
            factor="heavy_rainfall_delay",
            impact="delay",
            description=f"Significant rainfall ({round(total_rainfall_window, 1)} mm) forecast near expected harvest window. Field wetness and moisture thresholds delay safe harvesting by ~{adjustment} days."
        ))
    elif total_rainfall_window >= 18.0 or len(rainy_days) >= 1:
        adjustment = 2
        total_adjustment += adjustment
        factors.append(ExplanationFactor(
            factor="moderate_rainfall_delay",
            impact="delay",
            description=f"Moderate rainfall ({round(total_rainfall_window, 1)} mm) forecast around harvest window. Recommended to wait ~{adjustment} days for soil drying and grain moisture stabilization."
        ))

    # Check heat stress / early forced maturity
    extreme_heat_days = [r for r in relevant_days if r.t_max >= 38.0]
    if len(extreme_heat_days) >= 4:
        adjustment = -2
        total_adjustment += adjustment
        factors.append(ExplanationFactor(
            factor="extreme_heat_acceleration",
            impact="accelerate",
            description=f"Sustained extreme temperatures (>38°C) forecast during maturation. High evaporative demand forces rapid physiological drying, shifting harvest readiness ~2 days earlier."
        ))
    elif len(extreme_heat_days) >= 2:
        adjustment = -1
        total_adjustment += adjustment
        factors.append(ExplanationFactor(
            factor="high_temperature_maturation",
            impact="accelerate",
            description=f"Elevated temperatures (>38°C) observed or forecast during ripening stage. Accelerates final crop desiccation by ~1 day."
        ))

    return total_adjustment, factors
