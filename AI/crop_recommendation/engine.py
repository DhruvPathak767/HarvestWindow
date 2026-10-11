"""
HarvestWindow Phase AI-4: Hybrid Crop Recommendation & Suitability Engine
Combines agronomic rules, ICAR/SAU growing calendars, pedological requirements,
FAO GAEZ agro-climatic boundaries, and optional supervised ML classification.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from crop_recommendation.knowledge import (
    CROPS_KNOWLEDGE_BASE,
    CROPS_BY_ID,
    SUPPORTED_SEASONS,
    RECOGNIZED_SOIL_TYPES,
)
from crop_recommendation.data.fao_gaez_adapter import FaoGaezAdapter
from crop_recommendation.ml.predictor import CropMLPredictor

logger = logging.getLogger("crop_recommendation_engine")

# Provisional engineering weights (sum to 1.0)
DEFAULT_FACTOR_WEIGHTS = {
    "season": 0.25,
    "climate": 0.25,
    "soil": 0.25,
    "water": 0.15,
    "regional": 0.10,
}

# Operational category thresholds
THRESHOLD_HIGH = 75.0
THRESHOLD_MODERATE = 55.0
THRESHOLD_LOW = 35.0


class CropRecommendationEngine:
    """
    Evaluates farm parameters against agronomic benchmarks and produces ranked,
    explainable crop suitability scores.
    """

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or DEFAULT_FACTOR_WEIGHTS
        self.ml_predictor = CropMLPredictor.get_instance()

    def evaluate_farm_suitability(
        self,
        farm_id: str,
        state: Optional[str],
        district: Optional[str] = None,
        season: Optional[str] = None,
        current_month: Optional[int] = None,
        soil_type: Optional[str] = None,
        soil_ph: Optional[float] = None,
        nitrogen: Optional[float] = None,
        phosphorus: Optional[float] = None,
        potassium: Optional[float] = None,
        irrigation_source: Optional[str] = None,
        temperature: Optional[float] = None,
        rainfall: Optional[float] = None,
        humidity: Optional[float] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        top_k: int = 15,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end suitability evaluation for a farm.
        """
        generated_at = datetime.now(timezone.utc).isoformat()
        current_month = current_month or datetime.now(timezone.utc).month
        season = self._normalize_season(season, current_month)

        # 1. Resolve Agro-Ecological Zone via FAO GAEZ Adapter
        aez_info = FaoGaezAdapter.resolve_zone(
            state=state,
            district=district,
            latitude=latitude,
            longitude=longitude,
        )

        # 2. Query ML auxiliary signal if soil fertility NPK data is present
        ml_probs = None
        if all(v is not None for v in [nitrogen, phosphorus, potassium, temperature, humidity, soil_ph, rainfall]):
            ml_probs = self.ml_predictor.predict_probabilities(
                nitrogen=nitrogen,
                phosphorus=phosphorus,
                potassium=potassium,
                temperature=temperature,
                humidity=humidity,
                ph=soil_ph,
                rainfall=rainfall,
            )

        # 3. Track farm-level missing information
        farm_missing_info = []
        if soil_ph is None:
            farm_missing_info.append("Measured soil pH (tested value)")
        if not soil_type:
            farm_missing_info.append("Farm soil classification (type)")
        if not irrigation_source:
            farm_missing_info.append("Water / irrigation infrastructure source")
        if nitrogen is None or phosphorus is None or potassium is None:
            farm_missing_info.append("Laboratory soil N-P-K nutrient profile")
        if temperature is None:
            farm_missing_info.append("Local temperature forecast / historical average")
        if rainfall is None:
            farm_missing_info.append("Expected seasonal rainfall / water budget")

        # 4. Evaluate each crop in knowledge base
        evaluated_candidates = []
        for crop_meta in CROPS_KNOWLEDGE_BASE:
            candidate_result = self._evaluate_single_crop(
                crop_meta=crop_meta,
                season=season,
                current_month=current_month,
                state=state,
                district=district,
                soil_type=soil_type,
                soil_ph=soil_ph,
                irrigation_source=irrigation_source,
                temperature=temperature,
                rainfall=rainfall,
                humidity=humidity,
                ml_probs=ml_probs,
                aez_info=aez_info,
            )
            evaluated_candidates.append(candidate_result)

        # 5. Sort candidates by final suitability score descending
        evaluated_candidates.sort(key=lambda c: (c["category"] != "UNSUITABLE", c["suitabilityScore"]), reverse=True)

        # Assign ranks
        for idx, cand in enumerate(evaluated_candidates[:top_k], start=1):
            cand["rank"] = idx

        ranked_list = evaluated_candidates[:top_k]

        return {
            "farmId": farm_id,
            "location": {
                "state": state,
                "district": district,
                "latitude": latitude,
                "longitude": longitude,
                "agroEcologicalZone": aez_info.get("zone_id"),
                "zoneName": aez_info.get("zone_name"),
            },
            "season": season,
            "currentMonth": current_month,
            "generatedAt": generated_at,
            "engineVersion": "1.0.0-hybrid-gaez",
            "evidenceSummary": {
                "mlAssisted": ml_probs is not None,
                "evaluatedCandidatesCount": len(evaluated_candidates),
                "farmMissingInformation": farm_missing_info,
            },
            "recommendations": ranked_list,
            "dataLimitations": [
                "Suitability scores indicate agronomic compatibility; they do not guarantee farm yield or commercial profit.",
                "Weather evaluations use 10-day short-term or seasonal climate averages. Always review daily weather risk before planting.",
                "Soil recommendations are enhanced when an official Soil Health Card (SHC) test is uploaded."
            ]
        }

    def _normalize_season(self, season: Optional[str], month: int) -> str:
        """Determines active season if not explicitly supplied."""
        if season and season.strip():
            for s in SUPPORTED_SEASONS:
                if s.lower() == season.strip().lower():
                    return s

        # Auto-resolve season from calendar month
        if month in [6, 7, 8, 9, 10]:
            return "Kharif"
        elif month in [11, 12, 1, 2, 3]:
            return "Rabi"
        else:
            return "Zaid"

    def _evaluate_single_crop(
        self,
        crop_meta: Dict[str, Any],
        season: str,
        current_month: int,
        state: Optional[str],
        district: Optional[str],
        soil_type: Optional[str],
        soil_ph: Optional[float],
        irrigation_source: Optional[str],
        temperature: Optional[float],
        rainfall: Optional[float],
        humidity: Optional[float],
        ml_probs: Optional[Dict[str, float]],
        aez_info: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Evaluates constraints, factor scores, reasons, and missing info for one crop."""
        crop_name = crop_meta["crop_name"]
        crop_id = crop_meta["id"]
        constraints = []
        reasons = []
        missing_info = []

        scores: Dict[str, Optional[float]] = {
            "season": None,
            "climate": None,
            "soil": None,
            "water": None,
            "regionalSuitability": None,
        }
        evaluated_weights = {}

        # ======================================================================
        # 1. HARD CONSTRAINTS EVALUATION
        # ======================================================================
        is_hard_disqualified = False

        # Constraint 1: Season Compatibility
        supported_seasons = crop_meta.get("supported_seasons", [])
        if season not in supported_seasons and "Whole Year" not in supported_seasons:
            is_hard_disqualified = True
            constraints.append({
                "constraintId": "SEASON_INCOMPATIBLE",
                "observedValue": season,
                "requiredCondition": f"Must be in {', '.join(supported_seasons)}",
                "dataSource": "ICAR/SAU Crop Calendar",
                "explanation": f"{crop_name} is not adapted for cultivation during the {season} season.",
                "disqualifies": True,
            })

        # Constraint 2: Fatal Temperature Exceedance
        t_range = crop_meta.get("temperature_range", {})
        if temperature is not None:
            crit_min = t_range.get("critical_min", -50.0)
            crit_max = t_range.get("critical_max", 60.0)
            if temperature < crit_min or temperature > crit_max:
                is_hard_disqualified = True
                constraints.append({
                    "constraintId": "TEMPERATURE_FATAL_BOUND",
                    "observedValue": f"{temperature:.1f}°C",
                    "requiredCondition": f"Safe physiological range: {crit_min}°C to {crit_max}°C",
                    "dataSource": "Agronomic Thermal Thresholds",
                    "explanation": f"Observed temperature ({temperature:.1f}°C) violates lethal biological limits for {crop_name}.",
                    "disqualifies": True,
                })

        # Constraint 3: Fatal Soil pH Exceedance
        ph_range = crop_meta.get("soil_ph", {})
        if soil_ph is not None:
            crit_ph_min = ph_range.get("critical_min", 3.0)
            crit_ph_max = ph_range.get("critical_max", 11.0)
            if soil_ph < crit_ph_min or soil_ph > crit_ph_max:
                is_hard_disqualified = True
                constraints.append({
                    "constraintId": "SOIL_PH_FATAL_BOUND",
                    "observedValue": f"pH {soil_ph:.1f}",
                    "requiredCondition": f"Tolerable range: {crit_ph_min:.1f} to {crit_ph_max:.1f}",
                    "dataSource": "ICAR Soil Pathology Standards",
                    "explanation": f"Soil pH ({soil_ph:.1f}) is toxic or hostile for {crop_name} root systems.",
                    "disqualifies": True,
                })

        # Constraint 4: Un-irrigated High Water Deficit
        water_req = crop_meta.get("water_requirement", "MODERATE")
        if irrigation_source and irrigation_source.lower() == "rainfed":
            if water_req in ["VERY_HIGH", "HIGH"] and rainfall is not None and rainfall < 500.0:
                is_hard_disqualified = True
                constraints.append({
                    "constraintId": "SEVERE_WATER_DEFICIT",
                    "observedValue": f"Rainfed with low rainfall ({rainfall:.0f}mm)",
                    "requiredCondition": "Requires continuous canal, tube well, or drip irrigation",
                    "dataSource": "Crop Water Requirement Index",
                    "explanation": f"{crop_name} requires high water supply and will suffer crop failure under un-irrigated rainfed conditions.",
                    "disqualifies": True,
                })

        # ======================================================================
        # 2. FACTOR 1: SEASON & SOWING WINDOW (Weight: 25%)
        # ======================================================================
        sowing_months = crop_meta.get("sowing_months", [])
        if is_hard_disqualified:
            season_score = 0.0
        elif season in supported_seasons or "Whole Year" in supported_seasons:
            if current_month in sowing_months:
                season_score = 100.0
                reasons.append({
                    "factor": "season",
                    "message": f"Optimal sowing window: Current month ({current_month}) directly matches the primary sowing calendar.",
                    "source": "crop-calendar-icariari",
                })
            else:
                # Close month (+/- 1 month)
                dist = min(abs(current_month - m) for m in sowing_months)
                if dist == 1 or dist == 11:
                    season_score = 75.0
                    reasons.append({
                        "factor": "season",
                        "message": f"Approaching sowing window: Suitable for preparation and nursery sowing in season {season}.",
                        "source": "crop-calendar-icariari",
                    })
                else:
                    season_score = 60.0
                    reasons.append({
                        "factor": "season",
                        "message": f"Cultivable in {season} season, but optimal primary sowing occurs in months {sowing_months}.",
                        "source": "crop-calendar-icariari",
                    })
        else:
            season_score = 15.0

        scores["season"] = season_score
        evaluated_weights["season"] = self.weights["season"]

        # ======================================================================
        # 3. FACTOR 2: CLIMATE COMPATIBILITY (Weight: 25%)
        # ======================================================================
        climate_evaluations = []
        if temperature is not None:
            opt_min = t_range.get("optimal_min", 15.0)
            opt_max = t_range.get("optimal_max", 30.0)
            crit_min = t_range.get("critical_min", 5.0)
            crit_max = t_range.get("critical_max", 40.0)

            if opt_min <= temperature <= opt_max:
                t_score = 100.0
                reasons.append({
                    "factor": "climate",
                    "message": f"Temperature ({temperature:.1f}°C) is within ideal physiological growth range ({opt_min}-{opt_max}°C).",
                    "source": "agronomic-temperature-baseline",
                })
            elif crit_min <= temperature <= crit_max:
                # Linear interpolation
                if temperature < opt_min:
                    t_score = 60.0 + 40.0 * (temperature - crit_min) / max(opt_min - crit_min, 1.0)
                else:
                    t_score = 60.0 + 40.0 * (crit_max - temperature) / max(crit_max - opt_max, 1.0)
                reasons.append({
                    "factor": "climate",
                    "message": f"Temperature ({temperature:.1f}°C) is tolerable, though outside prime optimum ({opt_min}-{opt_max}°C).",
                    "source": "agronomic-temperature-baseline",
                })
            else:
                t_score = 20.0
            climate_evaluations.append(t_score)
        else:
            missing_info.append("Local temperature readings")

        if rainfall is not None:
            rf_range = crop_meta.get("rainfall_mm", {})
            rf_opt_min = rf_range.get("optimal_min", 400.0)
            rf_opt_max = rf_range.get("optimal_max", 1200.0)
            rf_crit_min = rf_range.get("critical_min", 200.0)
            rf_crit_max = rf_range.get("critical_max", 2500.0)

            if rf_opt_min <= rainfall <= rf_opt_max:
                rf_score = 100.0
                reasons.append({
                    "factor": "climate",
                    "message": f"Expected rainfall ({rainfall:.0f} mm) satisfies water requirements naturally.",
                    "source": "crop-water-requirement-index",
                })
            elif rf_crit_min <= rainfall <= rf_crit_max:
                rf_score = 70.0
            else:
                rf_score = 30.0
            climate_evaluations.append(rf_score)
        else:
            missing_info.append("Seasonal precipitation data")

        if climate_evaluations:
            scores["climate"] = round(float(sum(climate_evaluations) / len(climate_evaluations)), 1)
            evaluated_weights["climate"] = self.weights["climate"]
        else:
            scores["climate"] = None

        # ======================================================================
        # 4. FACTOR 3: SOIL COMPATIBILITY (Weight: 25%)
        # ======================================================================
        soil_evaluations = []
        if soil_type:
            supported_soils = crop_meta.get("soil_types", [])
            norm_soil = soil_type.strip().lower()
            if any(norm_soil in s.lower() or s.lower() in norm_soil for s in supported_soils):
                st_score = 100.0
                reasons.append({
                    "factor": "soil",
                    "message": f"Farm soil type ({soil_type}) matches documented soil affinity.",
                    "source": "icar-soil-suitability",
                })
            else:
                st_score = 45.0
                constraints.append({
                    "constraintId": "SUBOPTIMAL_SOIL_TYPE",
                    "observedValue": soil_type,
                    "requiredCondition": f"Preferred: {', '.join(supported_soils[:3])}",
                    "dataSource": "Pedological Crop Profiles",
                    "explanation": f"Crop performance may be reduced in {soil_type} compared to optimal soil types.",
                    "disqualifies": False,
                })
            soil_evaluations.append(st_score)
        else:
            missing_info.append("Soil classification type")

        if soil_ph is not None:
            ph_opt_min = ph_range.get("optimal_min", 6.0)
            ph_opt_max = ph_range.get("optimal_max", 7.5)
            ph_crit_min = ph_range.get("critical_min", 5.0)
            ph_crit_max = ph_range.get("critical_max", 8.5)

            if ph_opt_min <= soil_ph <= ph_opt_max:
                ph_score = 100.0
                reasons.append({
                    "factor": "soil",
                    "message": f"Measured soil pH ({soil_ph:.1f}) falls squarely in the preferred range ({ph_opt_min}-{ph_opt_max}).",
                    "source": "soil-ph-standards",
                })
            elif ph_crit_min <= soil_ph <= ph_crit_max:
                ph_score = 70.0
                reasons.append({
                    "factor": "soil",
                    "message": f"Soil pH ({soil_ph:.1f}) is tolerable, with minor amendment recommended.",
                    "source": "soil-ph-standards",
                })
            else:
                ph_score = 25.0
            soil_evaluations.append(ph_score)
        else:
            missing_info.append("Measured soil pH")

        if soil_evaluations:
            scores["soil"] = round(float(sum(soil_evaluations) / len(soil_evaluations)), 1)
            evaluated_weights["soil"] = self.weights["soil"]
        else:
            scores["soil"] = None

        # ======================================================================
        # 5. FACTOR 4: WATER & IRRIGATION COMPATIBILITY (Weight: 15%)
        # ======================================================================
        if irrigation_source:
            compatible_sources = crop_meta.get("compatible_irrigation", [])
            norm_irr = irrigation_source.strip().lower()
            matched = any(norm_irr in src.lower() or src.lower() in norm_irr for src in compatible_sources)

            if matched:
                water_score = 100.0
                reasons.append({
                    "factor": "water",
                    "message": f"Irrigation facility ({irrigation_source}) is well-suited for {crop_name}'s water requirements.",
                    "source": "irrigation-management-guide",
                })
            elif norm_irr == "rainfed" and crop_meta.get("water_requirement") == "LOW":
                water_score = 85.0
                reasons.append({
                    "factor": "water",
                    "message": f"{crop_name} is drought-hardy and thrives under rainfed moisture.",
                    "source": "dryland-agriculture-handbook",
                })
            elif norm_irr == "rainfed" and crop_meta.get("water_requirement") in ["HIGH", "VERY_HIGH"]:
                water_score = 30.0
            else:
                water_score = 65.0

            scores["water"] = water_score
            evaluated_weights["water"] = self.weights["water"]
        else:
            missing_info.append("Irrigation / water infrastructure status")
            scores["water"] = None

        # ======================================================================
        # 6. FACTOR 5: REGIONAL SUITABILITY (Weight: 10%)
        # ======================================================================
        primary_states = crop_meta.get("primary_states", [])
        if state:
            if any(state.strip().lower() in ps.lower() for ps in primary_states):
                regional_score = 100.0
                reasons.append({
                    "factor": "regional",
                    "message": f"{state} is a primary recognized agro-climatic cultivation zone for {crop_name}.",
                    "source": "fao-gaez-and-icar-agro-zones",
                })
            else:
                regional_score = 60.0
            scores["regionalSuitability"] = regional_score
            evaluated_weights["regional"] = self.weights["regional"]
        else:
            scores["regionalSuitability"] = None

        # ======================================================================
        # 7. SCORE AGGREGATION & EVIDENCE COVERAGE
        # ======================================================================
        total_eval_weight = sum(evaluated_weights.values())
        evidence_coverage = round(float(total_eval_weight / sum(self.weights.values())), 2)

        if is_hard_disqualified:
            final_score = 15.0
        elif total_eval_weight > 0:
            def _get_val(k):
                return scores.get(k) if scores.get(k) is not None else scores.get("regionalSuitability")

            weighted_sum = sum(_get_val(f) * evaluated_weights[f] for f in evaluated_weights)
            final_score = round(float(weighted_sum / total_eval_weight), 1)

            # Optional ML Auxiliary Signal calibration (up to +/- 8 points based on data)
            if ml_probs and crop_meta["id"] in ml_probs:
                p = ml_probs[crop_meta["id"]]
                if p > 0.4:
                    final_score = min(100.0, final_score + 6.0)
                    reasons.append({
                        "factor": "ml_signal",
                        "message": f"Soil NPK & climate features strongly align with supervised benchmark patterns (confidence {p*100:.1f}%).",
                        "source": "supervised-random-forest-crop-classifier",
                    })
                elif p < 0.02:
                    final_score = max(20.0, final_score - 4.0)
        else:
            final_score = 50.0  # Neutral fallback

        # Determine Category
        if is_hard_disqualified or final_score < THRESHOLD_LOW:
            category = "UNSUITABLE"
        elif final_score >= THRESHOLD_HIGH:
            category = "HIGH"
        elif final_score >= THRESHOLD_MODERATE:
            category = "MODERATE"
        else:
            category = "LOW"

        # Determine Confidence
        if evidence_coverage >= 0.75 and len(missing_info) <= 1:
            confidence = "HIGH"
        elif evidence_coverage >= 0.40:
            confidence = "MODERATE"
        else:
            confidence = "LOW"

        return {
            "cropId": crop_id,
            "cropName": crop_name,
            "hindiName": crop_meta.get("hindi_name"),
            "category_type": crop_meta.get("category"),
            "scientificName": crop_meta.get("scientific_name"),
            "variety": None,
            "suitabilityScore": final_score,
            "category": category,
            "confidence": confidence,
            "evidenceCoverage": evidence_coverage,
            "scoreBreakdown": scores,
            "reasons": reasons,
            "constraints": constraints,
            "missingInformation": missing_info,
            "agronomicSummary": crop_meta.get("management_notes", ""),
        }
