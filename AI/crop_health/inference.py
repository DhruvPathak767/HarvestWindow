"""
Crop Health Inference Engine
Loads trained MobileNetV3-Small once at startup, performs deterministic evaluation,
confidence calibration, quality checks, top-k alternatives, and recommendations linking.
"""
import os
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
from torchvision.models import MobileNet_V3_Small_Weights

from .config import (
    MODEL_PATH,
    CLASS_MAPPING_PATH,
    METADATA_PATH,
    CONFIDENCE_THRESHOLD_HIGH,
    CONFIDENCE_THRESHOLD_MODERATE,
    CONFIDENCE_THRESHOLD_LOW,
    TOP_MARGIN_THRESHOLD,
    SUPPORTED_CROPS
)
from .preprocessing import preprocess_pil_image
from .image_validation import (
    decode_and_validate_image,
    assess_image_quality,
    ImageValidationError
)
from .class_registry import get_class_info, CLASS_REGISTRY
from .recommendations import get_recommendation_for_class
from .schemas import (
    CropHealthPredictionResponse,
    AlternativePrediction,
    RecommendationDetails,
    ImageQualityAssessment
)

class CropHealthInferenceService:
    """
    Thread-safe inference service for plant disease and health classification.
    """
    def __init__(self):
        self.device = torch.device("cpu")
        self.model: Optional[nn.Module] = None
        self.index_to_class: Dict[int, str] = {}
        self.class_to_index: Dict[str, int] = {}
        self.metadata: Dict[str, Any] = {}
        self.is_ready = False
        self._load_model_artifacts()

    def _load_model_artifacts(self) -> None:
        """Loads model weights, mapping, and metadata if available."""
        if not MODEL_PATH.exists() or not CLASS_MAPPING_PATH.exists():
            print(f"[CropHealthService] Model artifact not found at {MODEL_PATH}. Inference offline until trained.")
            self.is_ready = False
            return

        try:
            with open(CLASS_MAPPING_PATH, "r") as f:
                mapping_data = json.load(f)
            self.index_to_class = {int(k): v for k, v in mapping_data["index_to_class"].items()}
            self.class_to_index = mapping_data["class_to_index"]
            num_classes = len(self.index_to_class)

            # Build model
            model = models.mobilenet_v3_small(weights=None)
            in_features = model.classifier[3].in_features
            model.classifier[3] = nn.Linear(in_features, num_classes)

            state_dict = torch.load(MODEL_PATH, map_location=self.device)
            model.load_state_dict(state_dict)
            model.to(self.device)
            model.eval()
            self.model = model

            if METADATA_PATH.exists():
                with open(METADATA_PATH, "r") as f:
                    self.metadata = json.load(f)
            else:
                self.metadata = {
                    "model_name": "HarvestWindow Crop Disease & Health Detection Engine",
                    "model_version": "1.0.0",
                    "architecture": "MobileNetV3-Small"
                }

            self.is_ready = True
            print(f"[CropHealthService] Model successfully loaded ({num_classes} classes). Ready for inference.")
        except Exception as exc:
            print(f"[CropHealthService] Failed to load model artifacts: {exc}")
            self.is_ready = False

    def predict_image(
        self,
        image_bytes: bytes,
        crop_hint: Optional[str] = None
    ) -> CropHealthPredictionResponse:
        """
        Executes end-to-end inference on uploaded raw image bytes.
        """
        t0 = time.time()
        now_str = datetime.now(timezone.utc).isoformat()

        # 1. Image validation & quality assessment
        pil_image = decode_and_validate_image(image_bytes)
        quality_info = assess_image_quality(pil_image)
        quality_assessment = ImageQualityAssessment(
            is_acceptable=quality_info["is_acceptable"],
            blur_score=quality_info["blur_score"],
            is_blurry=quality_info["is_blurry"],
            brightness_score=quality_info["brightness_score"],
            is_poor_exposure=quality_info["is_poor_exposure"],
            warnings=quality_info["warnings"]
        )

        # 2. Check if model is loaded
        if not self.is_ready or self.model is None:
            raise RuntimeError(
                "Crop health model artifact is not loaded or unavailable. Please verify service readiness."
            )

        # 3. Deterministic Preprocessing
        input_tensor = preprocess_pil_image(pil_image).to(self.device)

        # 4. Neural Network Inference
        with torch.no_grad():
            logits = self.model(input_tensor)
            probabilities = F.softmax(logits, dim=1).squeeze(0).cpu().numpy()

        # 5. Extract top predictions
        sorted_indices = probabilities.argsort()[::-1]
        top1_idx = int(sorted_indices[0])
        top1_prob = float(probabilities[top1_idx])
        top1_class = self.index_to_class[top1_idx]

        top2_prob = float(probabilities[int(sorted_indices[1])]) if len(sorted_indices) > 1 else 0.0
        prob_margin = top1_prob - top2_prob

        # 6. Confidence Calibration & Level
        conf_pct = round(top1_prob * 100.0, 1)

        if top1_prob >= CONFIDENCE_THRESHOLD_HIGH and prob_margin >= TOP_MARGIN_THRESHOLD:
            conf_level = "HIGH_CONFIDENCE"
            conf_interp = f"The model exhibits high confidence ({conf_pct}%) with distinctive visual symptom alignment."
        elif top1_prob >= CONFIDENCE_THRESHOLD_MODERATE:
            conf_level = "MODERATE_CONFIDENCE"
            conf_interp = f"Moderate confidence ({conf_pct}%). Key visual symptoms detected, but alternative conditions share visual traits."
        elif top1_prob >= CONFIDENCE_THRESHOLD_LOW:
            conf_level = "LOW_CONFIDENCE"
            conf_interp = f"Low confidence ({conf_pct}%). Visual symptoms are ambiguous or masked by lighting/angle."
        else:
            conf_level = "INCONCLUSIVE"
            conf_interp = f"Inconclusive ({conf_pct}%). Probability falls below safe diagnostic certainty threshold (40%)."

        # 7. Status classification (HEALTHY, DISEASED, UNFAMILIAR, INCONCLUSIVE)
        class_meta = get_class_info(top1_class) or {
            "class_id": top1_class,
            "crop": top1_class.split("___")[0],
            "display_name": top1_class.replace("___", " "),
            "category": "UNKNOWN_OR_UNSUPPORTED",
            "is_healthy": False,
            "symptoms": ["Unspecified visual symptoms."]
        }

        is_healthy = class_meta.get("is_healthy", False)

        if conf_level == "INCONCLUSIVE":
            status = "INCONCLUSIVE"
        elif quality_info.get("is_blurry") and conf_level == "LOW_CONFIDENCE":
            status = "INCONCLUSIVE"
        elif is_healthy:
            status = "HEALTHY"
        else:
            status = "DISEASED"

        # 8. Alternative predictions (Top-2 to Top-4)
        alternatives: List[AlternativePrediction] = []
        for rank in range(1, min(4, len(sorted_indices))):
            alt_idx = int(sorted_indices[rank])
            alt_prob = float(probabilities[alt_idx])
            alt_class = self.index_to_class[alt_idx]
            alt_meta = get_class_info(alt_class) or {
                "display_name": alt_class.replace("___", " "),
                "crop": alt_class.split("___")[0],
                "category": "UNKNOWN_OR_UNSUPPORTED",
                "is_healthy": False
            }
            alternatives.append(
                AlternativePrediction(
                    class_id=alt_class,
                    display_name=alt_meta["display_name"],
                    crop=alt_meta["crop"],
                    confidence_pct=round(alt_prob * 100.0, 1),
                    condition_category=alt_meta["category"],
                    is_healthy=alt_meta.get("is_healthy", False)
                )
            )

        # 9. Recommendations & Expert Guidance
        rec_data = get_recommendation_for_class(top1_class)
        rec_model = None
        if rec_data:
            rec_model = RecommendationDetails(
                condition_id=rec_data["condition_id"],
                display_name=rec_data["display_name"],
                symptoms=rec_data["symptoms"],
                immediate_actions=rec_data["immediate_actions"],
                preventive_measures=rec_data["preventive_measures"],
                hygiene_practices=rec_data["hygiene_practices"],
                when_to_contact_expert=rec_data["when_to_contact_expert"],
                notes=rec_data.get("notes")
            )

        expert_guidance = (
            rec_data.get("when_to_contact_expert")
            if rec_data
            else "Consult your local Krishi Vigyan Kendra (KVK) or district agricultural extension officer before applying chemical treatments."
        )

        latency_ms = round((time.time() - t0) * 1000.0, 2)

        return CropHealthPredictionResponse(
            success=True,
            status=status,
            predicted_class_id=top1_class,
            predicted_display_name=class_meta["display_name"],
            crop=class_meta["crop"],
            condition_category=class_meta["category"],
            is_healthy=is_healthy,
            confidence_pct=conf_pct,
            confidence_level=conf_level,
            confidence_interpretation=conf_interp,
            top_alternatives=alternatives,
            symptoms=class_meta.get("symptoms", []),
            recommendations=rec_model,
            expert_guidance=expert_guidance,
            image_quality=quality_assessment,
            model_version=self.metadata.get("model_version", "1.0.0"),
            model_name=self.metadata.get("model_name", "HarvestWindow Crop Health Engine"),
            inference_latency_ms=latency_ms,
            timestamp=now_str
        )
