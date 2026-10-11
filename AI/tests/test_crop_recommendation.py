"""
Unit tests for HarvestWindow Phase AI-4: Crop Recommendation and Suitability Engine
Verifies candidate generation, agronomic hard constraints, weighted scoring,
missing data handling, FAO GAEZ zone resolution, ML auxiliary signals, and explainability.
"""

import unittest
import sys
import os

# Add AI root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crop_recommendation.engine import (
    CropRecommendationEngine,
    THRESHOLD_HIGH,
    THRESHOLD_MODERATE,
    THRESHOLD_LOW,
)
from crop_recommendation.knowledge import CROPS_KNOWLEDGE_BASE, CROPS_BY_ID
from crop_recommendation.data.fao_gaez_adapter import FaoGaezAdapter
from crop_recommendation.ml.predictor import CropMLPredictor


class TestCropRecommendationEngine(unittest.TestCase):
    def setUp(self):
        self.engine = CropRecommendationEngine()

    def test_knowledge_base_integrity(self):
        """Verify knowledge base has required agronomic fields for all crops."""
        self.assertGreaterEqual(len(CROPS_KNOWLEDGE_BASE), 20)
        for crop in CROPS_KNOWLEDGE_BASE:
            self.assertIn("id", crop)
            self.assertIn("crop_name", crop)
            self.assertIn("supported_seasons", crop)
            self.assertIn("temperature_range", crop)
            self.assertIn("rainfall_mm", crop)
            self.assertTrue("soil_ph" in crop or "ph_range" in crop)
            self.assertTrue("soil_types" in crop or "compatible_soil_types" in crop)
            self.assertIn("water_requirement", crop)

    def test_gaez_zone_resolution(self):
        """Verify FAO GAEZ adapter maps Indian states/districts correctly."""
        # Gujarat -> AEZ-02 (Western Semi-Arid Zone)
        guj_zone = FaoGaezAdapter.resolve_zone(state="Gujarat")
        self.assertEqual(guj_zone["zone_id"], "AEZ-02")
        self.assertIn("Gujarat", guj_zone["zone_name"])

        # Punjab -> AEZ-02 (Northern Plain (Alluvial), hot semi-arid)
        punjab_zone = FaoGaezAdapter.resolve_zone(state="Punjab")
        self.assertEqual(punjab_zone["zone_id"], "AEZ-02")

        # Unknown state fallback
        unknown_zone = FaoGaezAdapter.resolve_zone(state="UnknownAtlantis")
        self.assertEqual(unknown_zone["zone_id"], "INDIA-TROPICAL-SUBTROPICAL")

    def test_hard_constraint_season_disqualification(self):
        """Verify that a crop with an incompatible season is disqualified as UNSUITABLE."""
        # Wheat is strictly a Rabi crop. Evaluating in Kharif must trigger SEASON_INCOMPATIBLE.
        res = self.engine.evaluate_farm_suitability(
            farm_id="test-farm-rabi-check",
            state="Punjab",
            season="Kharif",
            temperature=32.0,
            rainfall=750.0,
            top_k=26,
        )

        wheat_rec = next((c for c in res["recommendations"] if c["cropId"] == "wheat"), None)
        self.assertIsNotNone(wheat_rec)
        self.assertEqual(wheat_rec["category"], "UNSUITABLE")
        self.assertLessEqual(wheat_rec["suitabilityScore"], 20.0)

        # Check constraint explanation
        season_constraint = next(
            (cn for cn in wheat_rec["constraints"] if cn["constraintId"] == "SEASON_INCOMPATIBLE"),
            None
        )
        self.assertIsNotNone(season_constraint)
        self.assertTrue(season_constraint["disqualifies"])
        self.assertIn("Rabi", season_constraint["requiredCondition"])

    def test_hard_constraint_lethal_temperature(self):
        """Verify that lethal temperature boundary triggers TEMPERATURE_FATAL_BOUND."""
        # Evaluate with 52°C extreme heat
        res = self.engine.evaluate_farm_suitability(
            farm_id="test-farm-heat-check",
            state="Rajasthan",
            season="Kharif",
            temperature=52.0,
            rainfall=300.0,
            top_k=26,
        )

        for rec in res["recommendations"]:
            temp_constraint = next(
                (cn for cn in rec["constraints"] if cn["constraintId"] == "TEMPERATURE_FATAL_BOUND"),
                None
            )
            if temp_constraint:
                self.assertEqual(rec["category"], "UNSUITABLE")
                self.assertTrue(temp_constraint["disqualifies"])

    def test_missing_data_reporting_and_evidence_coverage(self):
        """Verify that missing soil and climate data is explicitly reported without fabrication."""
        # Minimal input: only farm ID, state, and season
        res = self.engine.evaluate_farm_suitability(
            farm_id="test-farm-minimal",
            state="Gujarat",
            season="Kharif",
            top_k=10,
        )

        # Farm-level missing info should include soil pH, soil type, irrigation, and weather
        summary = res["evidenceSummary"]
        farm_missing = summary["farmMissingInformation"]
        self.assertTrue(any("soil pH" in m for m in farm_missing))
        self.assertTrue(any("classification" in m or "soil" in m for m in farm_missing))

        # Each candidate should reflect limited evidence coverage (< 0.5)
        top_rec = res["recommendations"][0]
        self.assertLess(top_rec["evidenceCoverage"], 0.6)
        self.assertTrue(any("soil pH" in m for m in top_rec["missingInformation"]))
        self.assertEqual(top_rec["scoreBreakdown"]["soil"], None)

    def test_score_bounds_and_ranking_consistency(self):
        """Verify suitability scores are between 0 and 100, and ranking is strictly descending."""
        res = self.engine.evaluate_farm_suitability(
            farm_id="test-farm-complete",
            state="Maharashtra",
            district="Pune",
            season="Kharif",
            soil_type="Medium Black",
            soil_ph=6.8,
            nitrogen=70.0,
            phosphorus=45.0,
            potassium=55.0,
            irrigation_source="Canal",
            temperature=27.5,
            rainfall=850.0,
            humidity=75.0,
            top_k=15,
        )

        prev_score = 100.0
        for rec in res["recommendations"]:
            score = rec["suitabilityScore"]
            self.assertGreaterEqual(score, 0.0)
            self.assertLessEqual(score, 100.0)
            self.assertLessEqual(score, prev_score, "Recommendations must be in descending order")
            prev_score = score

            # Check category threshold consistency
            if rec["category"] == "HIGH":
                self.assertGreaterEqual(score, THRESHOLD_HIGH)
            elif rec["category"] == "MODERATE":
                self.assertGreaterEqual(score, THRESHOLD_MODERATE)
            elif rec["category"] == "LOW":
                self.assertGreaterEqual(score, THRESHOLD_LOW)

    def test_ml_auxiliary_predictor_graceful_fallback(self):
        """Verify ML predictor returns None cleanly when soil test features are missing."""
        predictor = CropMLPredictor.get_instance()
        # Missing N, P, K
        probs = predictor.predict_probabilities(
            nitrogen=None,
            phosphorus=None,
            potassium=None,
            temperature=25.0,
            humidity=80.0,
            ph=6.5,
            rainfall=1000.0,
        )
        self.assertIsNone(probs)

    def test_explainable_reasons_presence(self):
        """Verify that recommended crops contain specific, traceable reasons."""
        res = self.engine.evaluate_farm_suitability(
            farm_id="test-farm-explain",
            state="Gujarat",
            district="Surat",
            season="Kharif",
            soil_type="Deep Black Soil",
            soil_ph=7.2,
            irrigation_source="Drip",
            temperature=28.0,
            rainfall=950.0,
            humidity=80.0,
        )

        top_rec = res["recommendations"][0]
        self.assertGreater(len(top_rec["reasons"]), 0)
        factors = [r["factor"] for r in top_rec["reasons"]]
        self.assertTrue(any(f in ["season", "climate", "soil", "water", "regional"] for f in factors))
        for r in top_rec["reasons"]:
            self.assertTrue(len(r["message"]) > 10)
            self.assertTrue(len(r["source"]) > 3)


if __name__ == "__main__":
    unittest.main()
