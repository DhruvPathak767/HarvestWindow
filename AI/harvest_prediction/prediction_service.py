"""
Harvest Window Prediction Service Orchestrator
Coordinates Layers A (Agronomic Baseline), B (GDD Accumulation), C (Weather-Aware Adjustment),
and D (Supervised ML Inference if available), assembling complete response contract.
"""

import os
import logging
from datetime import datetime, date, timedelta, timezone
from typing import Optional, Dict, Any, List

from .schemas import (
    HarvestPredictionRequest,
    HarvestPredictionResponse,
    PredictionDetail,
    UncertaintyRange,
    DataQualityIndicators,
    GddMetrics,
    ExplanationFactor,
    ValidateInputRequest,
    ValidateInputResponse
)
from .crop_knowledge import resolve_crop_profile, VERIFIED_CROP_KNOWLEDGE
from .agronomic_baseline import compute_agronomic_baseline, parse_iso_date
from .gdd import (
    accumulate_gdd_series,
    project_gdd_harvest_date
)
from .weather import (
    WeatherProvider,
    calculate_weather_aware_adjustments
)

logger = logging.getLogger("harvest_prediction.service")

MODEL_VERSION = "2.0.0-agronomic-gdd-weather"
ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

class HarvestPredictionService:
    def __init__(self, weather_provider: Optional[WeatherProvider] = None):
        self.weather_provider = weather_provider or WeatherProvider(timeout=5.0)

    def validate_inputs(self, req: ValidateInputRequest) -> ValidateInputResponse:
        """Validates incoming parameters and resolves agricultural availability."""
        profile = resolve_crop_profile(req.crop_name, req.variety)
        resolved_crop = profile.get("crop_name") if profile else None
        
        variety_matched = (profile.get("match_type") in ("EXACT_VARIETY", "EXACT_VARIETY_ALIAS"))

        sowing_valid = False
        if req.sowing_date:
            try:
                datetime.strptime(req.sowing_date, "%Y-%m-%d")
                sowing_valid = True
            except ValueError:
                sowing_valid = False

        coords_valid = False
        if req.latitude is not None and req.longitude is not None:
            if -90 <= req.latitude <= 90 and -180 <= req.longitude <= 180:
                coords_valid = True

        missing = []
        if not resolved_crop or profile.get("match_type") == "GENERIC_FALLBACK":
            missing.append("unsupported_crop")
        if not sowing_valid:
            missing.append("sowing_date")
        if not coords_valid:
            missing.append("farm_coordinates")

        recommendations = []
        if not sowing_valid:
            recommendations.append("Provide exact sowing/transplanting date for high-confidence estimation.")
        if not coords_valid:
            recommendations.append("Provide farm latitude and longitude to enable local microclimate weather & GDD accumulation.")
        if not variety_matched and req.variety:
            recommendations.append(f"Variety '{req.variety}' not explicitly recognized; using standard duration benchmarks for {req.crop_name}.")

        return ValidateInputResponse(
            valid=(resolved_crop is not None and sowing_valid),
            resolved_crop_profile=resolved_crop,
            variety_matched=variety_matched,
            sowing_date_valid=sowing_valid,
            coordinates_valid=coords_valid,
            missing_fields=missing,
            recommendations=recommendations
        )

    def predict(self, req: HarvestPredictionRequest) -> HarvestPredictionResponse:
        """
        Executes hybrid harvest prediction workflow.
        """
        ref_date = parse_iso_date(req.reference_date) or date.today()
        ref_dt_str = ref_date.isoformat()

        # Step 1: Agricultural Profile Resolution
        profile = resolve_crop_profile(
            crop_name=req.crop_name,
            variety=req.variety,
            external_knowledge=req.phase_ai1_knowledge
        )

        if not profile or profile.get("match_type") == "GENERIC_FALLBACK":
            return HarvestPredictionResponse(
                status="insufficient_data",
                message=f"No verified agronomic duration benchmarks found for crop '{req.crop_name}'.",
                prediction=None
            )

        # Step 2: Sowing Date Validation & Fallback Handling
        if not req.sowing_date:
            return HarvestPredictionResponse(
                status="insufficient_data",
                message=f"Sowing date is required to establish an active harvest window for {profile['crop_name']}.",
                prediction=None
            )

        sow_date = parse_iso_date(req.sowing_date)
        if not sow_date:
            return HarvestPredictionResponse(
                status="insufficient_data",
                message=f"Invalid ISO format for sowing_date: '{req.sowing_date}'. Expected YYYY-MM-DD.",
                prediction=None
            )

        if sow_date > ref_date:
            return HarvestPredictionResponse(
                status="insufficient_data",
                message=f"Sowing date ({req.sowing_date}) cannot be in the future relative to reference date ({ref_dt_str}).",
                prediction=None
            )

        # Step 3: Layer A - Agronomic Baseline Calculation
        baseline_res = compute_agronomic_baseline(
            crop_name=req.crop_name,
            variety=req.variety,
            sowing_date_str=req.sowing_date,
            reference_date_str=ref_dt_str,
            phase_ai1_knowledge=req.phase_ai1_knowledge
        )

        if baseline_res.get("status") != "success":
            return HarvestPredictionResponse(
                status="insufficient_data",
                message=baseline_res.get("message", "Unable to compute agronomic baseline."),
                prediction=None
            )

        earliest_dt_str = baseline_res["earliest_harvest_date"]
        most_likely_dt_str = baseline_res["most_likely_harvest_date"]
        latest_dt_str = baseline_res["latest_harvest_date"]
        method_used = "agronomic_baseline"
        
        explanations: List[ExplanationFactor] = [
            ExplanationFactor(
                factor="crop_duration_baseline",
                impact="baseline",
                description=(
                    f"Calculated using ICAR/SAU verified crop duration range "
                    f"({profile['min_days']}-{profile['max_days']} days, typical {profile['typical_days']} days) "
                    f"from sowing date ({req.sowing_date})."
                )
            )
        ]
        assumptions = [
            f"Expected duration: {profile['typical_days']} days (range {profile['min_days']}-{profile['max_days']} days) for {profile['crop_name']}.",
            "Field management assumes standard agronomic practices without catastrophic pest outbreak or severe drought.",
            f"Agronomic data source: {profile.get('source', 'Agricultural benchmarks')}."
        ]

        if profile.get("variety"):
            explanations.append(ExplanationFactor(
                factor="cultivar_variety_specification",
                impact="neutral",
                description=f"Calibrated for specific cultivar '{profile['variety']}' ({profile.get('applicability', 'regional package')})."
            ))

        # Step 4: Layer B & C - Weather & GDD Accumulation
        weather_records = []
        weather_available = False
        historical_days_count = 0
        forecast_days_count = 0
        missing_weather_days = 0
        gdd_metrics: Optional[GddMetrics] = None
        weather_adj_days = 0

        # Collect weather if coordinates provided or custom series supplied
        if req.custom_weather_series:
            weather_records = req.custom_weather_series
            weather_available = len(weather_records) > 0
            historical_days_count = sum(1 for r in weather_records if not r.is_forecast)
            forecast_days_count = sum(1 for r in weather_records if r.is_forecast)
        elif req.latitude is not None and req.longitude is not None:
            max_days = int(profile["max_days"])
            end_fetch = (sow_date + timedelta(days=max_days + 15)).isoformat()
            fetched, w_meta = self.weather_provider.fetch_weather_series(
                latitude=req.latitude,
                longitude=req.longitude,
                start_date=req.sowing_date,
                end_date=end_fetch
            )
            if fetched:
                weather_records = fetched
                weather_available = True
                historical_days_count = w_meta.get("historical_days", 0)
                forecast_days_count = w_meta.get("forecast_days", 0)

        # Accumulate GDD if weather is available and crop has GDD benchmark
        base_temp = profile.get("base_temperature_c")
        required_gdd = profile.get("required_gdd_c")
        upper_threshold = profile.get("upper_temperature_c")

        if weather_available and base_temp is not None and required_gdd is not None:
            gdd_acc_res = accumulate_gdd_series(
                weather_records=weather_records,
                sowing_date=sow_date,
                reference_date=ref_date,
                base_temp=base_temp,
                upper_threshold=upper_threshold
            )
            accum_gdd = gdd_acc_res["accumulated_gdd"]
            historical_days_count = gdd_acc_res["observed_days_count"]
            missing_weather_days = gdd_acc_res["missing_days_count"]

            forecast_records = [r for r in weather_records if r.is_forecast]
            proj_date, gdd_notes = project_gdd_harvest_date(
                accumulated_gdd=accum_gdd,
                required_gdd=required_gdd,
                reference_date=ref_date,
                forecast_records=forecast_records,
                base_temp=base_temp,
                upper_threshold=upper_threshold
            )

            progress_pct = round((accum_gdd / required_gdd) * 100.0, 1) if required_gdd > 0 else 0.0

            gdd_metrics = GddMetrics(
                base_temperature_c=base_temp,
                upper_threshold_c=upper_threshold,
                accumulated_gdd=accum_gdd,
                required_maturity_gdd=required_gdd,
                progress_percentage=progress_pct,
                gdd_maturity_estimated_date=proj_date.isoformat() if proj_date else None
            )

            # Refine harvest date if GDD projected date is valid and reasonable
            if proj_date:
                baseline_dt = parse_iso_date(most_likely_dt_str)
                diff_days = (proj_date - baseline_dt).days if baseline_dt else 0
                
                # Defensible bounded adjustment from thermal time: within +/- 15 days of baseline
                if abs(diff_days) <= 15:
                    most_likely_dt_str = proj_date.isoformat()
                    method_used = "agronomic_gdd_weather"
                    if diff_days > 0:
                        explanations.append(ExplanationFactor(
                            factor="thermal_degree_days",
                            impact="delay",
                            description=f"Cooler seasonal temperatures slowed thermal accumulation ({accum_gdd:.1f} of {required_gdd:.1f} GDD), shifting maturity by +{diff_days} days."
                        ))
                    elif diff_days < 0:
                        explanations.append(ExplanationFactor(
                            factor="thermal_degree_days",
                            impact="accelerate",
                            description=f"Higher temperatures accelerated thermal development ({accum_gdd:.1f} of {required_gdd:.1f} GDD), shifting maturity ~{abs(diff_days)} days earlier."
                        ))
                    else:
                        explanations.append(ExplanationFactor(
                            factor="thermal_degree_days",
                            impact="neutral",
                            description=f"Accumulated heat units ({accum_gdd:.1f} GDD) align directly with expected historical maturity pacing."
                        ))

            # Step 5: Weather-Aware Near-Harvest Adjustments (Rainfall & Heat Stress)
            adj_days, weather_factors = calculate_weather_aware_adjustments(
                weather_series=weather_records,
                tentative_harvest_date=most_likely_dt_str,
                window_days=7
            )
            weather_adj_days = adj_days
            if adj_days != 0:
                current_ml = parse_iso_date(most_likely_dt_str)
                if current_ml:
                    adjusted_dt = current_ml + timedelta(days=adj_days)
                    most_likely_dt_str = adjusted_dt.isoformat()
                # Expand latest date if delayed
                if adj_days > 0:
                    current_latest = parse_iso_date(latest_dt_str)
                    if current_latest:
                        latest_dt_str = (current_latest + timedelta(days=adj_days)).isoformat()
            
            explanations.extend(weather_factors)
        else:
            assumptions.append("Weather API data was not available or farm coordinates omitted; estimation relies on regional agronomic baseline duration.")

        # Step 6: Days remaining calculation and past-due handling
        final_target_dt = parse_iso_date(most_likely_dt_str)
        days_rem = (final_target_dt - ref_date).days if final_target_dt else 0
        is_past_due = days_rem < 0

        # Enforce rule: Never return negative days remaining as if harvest were in the future
        display_days_until_harvest = max(0, days_rem) if not is_past_due else 0

        if is_past_due:
            explanations.append(ExplanationFactor(
                factor="past_due_status",
                impact="delay",
                description=f"The expected harvest window concluded {abs(days_rem)} days ago. Inspect field immediately for lodging, seed shattering, or over-maturity."
            ))

        # Uncertainty range
        earliest_dt = parse_iso_date(earliest_dt_str)
        latest_dt = parse_iso_date(latest_dt_str)
        range_span = (latest_dt - earliest_dt).days if (latest_dt and earliest_dt) else int(profile["max_days"] - profile["min_days"])

        uncertainty = UncertaintyRange(
            type="duration_range",
            lower_date=earliest_dt_str,
            upper_date=latest_dt_str,
            range_days=range_span
        )

        data_quality = DataQualityIndicators(
            crop_profile_available=True,
            sowing_date_available=True,
            weather_data_available=weather_available,
            verified_gdd_available=(base_temp is not None),
            historical_observations_count=historical_days_count,
            forecast_days_included=forecast_days_count,
            missing_weather_days=missing_weather_days
        )

        prediction_detail = PredictionDetail(
            estimated_harvest_start=earliest_dt_str,
            most_likely_harvest_date=most_likely_dt_str,
            estimated_harvest_end=latest_dt_str,
            days_until_harvest=display_days_until_harvest,
            is_past_due=is_past_due,
            prediction_method=method_used,
            model_version=MODEL_VERSION,
            crop_name=profile["crop_name"],
            variety=req.variety or profile.get("variety"),
            sowing_date=req.sowing_date,
            uncertainty=uncertainty,
            data_quality=data_quality,
            gdd_metrics=gdd_metrics,
            weather_adjustment_days=weather_adj_days,
            explanation=explanations,
            assumptions_and_limitations=assumptions,
            calculated_at=datetime.now(timezone.utc).isoformat()
        )

        return HarvestPredictionResponse(
            status="success",
            message=None,
            prediction=prediction_detail
        )
