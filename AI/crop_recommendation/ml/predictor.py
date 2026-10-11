"""
HarvestWindow Phase AI-4: Supervised ML Auxiliary Predictor
Loads trained Random Forest classifier and provides optional class probability distribution
when laboratory soil test indicators (N, P, K, pH) are available.
"""

import os
import logging
from typing import Dict, Any, Optional
import numpy as np
import joblib

logger = logging.getLogger("crop_ml_predictor")

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "models",
    "crop_recommender_rf.joblib"
)


class CropMLPredictor:
    """
    Singleton loader for the Random Forest crop classification pipeline.
    """

    _instance = None
    _artifact = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._load()
        return cls._instance

    def _load(self):
        if os.path.exists(MODEL_PATH):
            try:
                self._artifact = joblib.load(MODEL_PATH)
                logger.info("Loaded ML recommender model artifact from %s", MODEL_PATH)
            except Exception as exc:
                logger.warning("Could not load ML artifact (%s): %s", MODEL_PATH, exc)
                self._artifact = None
        else:
            logger.info("ML artifact not found at %s. ML auxiliary signal disabled.", MODEL_PATH)
            self._artifact = None

    def is_available(self) -> bool:
        return self._artifact is not None and "pipeline" in self._artifact

    def predict_probabilities(
        self,
        nitrogen: Optional[float],
        phosphorus: Optional[float],
        potassium: Optional[float],
        temperature: Optional[float],
        humidity: Optional[float],
        ph: Optional[float],
        rainfall: Optional[float],
    ) -> Optional[Dict[str, float]]:
        """
        Calculates crop probability distribution if all required soil & climate features exist.
        Returns None if any feature is missing, following the strict no-fabrication rule.
        """
        if not self.is_available():
            return None

        # Check if all 7 features are present and valid numbers
        features = [nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall]
        if any(f is None or np.isnan(float(f)) for f in features):
            return None

        try:
            pipeline = self._artifact["pipeline"]
            classes = self._artifact["classes"]
            X = np.array([features], dtype=float)

            probs = pipeline.predict_proba(X)[0]
            prob_map = {cls_name: round(float(p), 4) for cls_name, p in zip(classes, probs)}
            return prob_map
        except Exception as exc:
            logger.warning("Failed during ML predict_proba execution: %s", exc)
            return None

    def get_model_info(self) -> Dict[str, Any]:
        if not self.is_available():
            return {
                "available": False,
                "status": "ML auxiliary model not loaded or unavailable",
            }
        return {
            "available": True,
            "version": self._artifact.get("model_version", "1.0.0"),
            "classes_count": len(self._artifact.get("classes", [])),
            "features": self._artifact.get("features", []),
            "metrics": self._artifact.get("metrics", {}),
            "trained_at": self._artifact.get("trained_at"),
        }
