"""
Automated Pytest Suite for Phase AI-6 Crop Disease & Health Detection
Tests preprocessing, image validation, class registry, recommendation lookups,
inference engine, uncertainty logic, and FastAPI endpoints.
"""
import io
import os
import sys
import pytest
from PIL import Image
import numpy as np
import torch
from fastapi.testclient import TestClient

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_ROOT = os.path.dirname(CURRENT_DIR)
if AI_ROOT not in sys.path:
    sys.path.insert(0, AI_ROOT)

from crop_health.config import (
    IMAGE_SIZE,
    CONFIDENCE_THRESHOLD_HIGH,
    CONFIDENCE_THRESHOLD_LOW,
    MAX_IMAGE_FILE_SIZE_BYTES
)
from crop_health.image_validation import (
    decode_and_validate_image,
    assess_image_quality,
    compute_blur_variance,
    ImageValidationError
)
from crop_health.preprocessing import (
    get_inference_transform,
    preprocess_pil_image
)
from crop_health.class_registry import (
    CLASS_REGISTRY,
    get_class_info,
    get_all_classes
)
from crop_health.recommendations import (
    RECOMMENDATIONS_REGISTRY,
    get_recommendation_for_class
)
from crop_health.inference import CropHealthInferenceService
from main import app


client = TestClient(app)

@pytest.fixture
def sample_valid_image_bytes():
    """Generates a synthetic 224x224 RGB JPEG image bytes."""
    img = Image.new("RGB", (224, 224), color=(60, 140, 70))
    # Add simple variation so variance is non-zero
    for x in range(50, 150):
        for y in range(50, 150):
            img.putpixel((x, y), (120, 80, 40))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

@pytest.fixture
def sample_rgba_image_bytes():
    """Generates a synthetic RGBA PNG image bytes."""
    img = Image.new("RGBA", (100, 100), color=(50, 150, 50, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

# --------------------------------------------------------------------------
# 1. Image Preprocessing & RGB Conversion Tests
# --------------------------------------------------------------------------
def test_valid_image_preprocessing(sample_valid_image_bytes):
    img = decode_and_validate_image(sample_valid_image_bytes)
    assert img.mode == "RGB"
    tensor = preprocess_pil_image(img)
    assert isinstance(tensor, torch.Tensor)
    assert tensor.shape == (1, 3, IMAGE_SIZE, IMAGE_SIZE)

def test_rgba_to_rgb_conversion(sample_rgba_image_bytes):
    img = decode_and_validate_image(sample_rgba_image_bytes)
    assert img.mode == "RGB"
    tensor = preprocess_pil_image(img)
    assert tensor.shape == (1, 3, 224, 224)

# --------------------------------------------------------------------------
# 2. Image Validation & Corrupt / Invalid Rejection Tests
# --------------------------------------------------------------------------
def test_empty_bytes_rejection():
    with pytest.raises(ImageValidationError, match="empty"):
        decode_and_validate_image(b"")

def test_corrupt_bytes_rejection():
    with pytest.raises(ImageValidationError, match="Invalid or corrupted"):
        decode_and_validate_image(b"not_an_image_header_random_junk_bytes")

def test_tiny_dimension_rejection():
    tiny = Image.new("RGB", (10, 10), color="green")
    buf = io.BytesIO()
    tiny.save(buf, format="JPEG")
    with pytest.raises(ImageValidationError, match="too small"):
        decode_and_validate_image(buf.getvalue())

def test_oversized_file_rejection():
    fake_huge_bytes = b"0" * (MAX_IMAGE_FILE_SIZE_BYTES + 1024)
    with pytest.raises(ImageValidationError, match="exceeds maximum allowed limit"):
        decode_and_validate_image(fake_huge_bytes)

def test_blur_variance_and_quality_assessment(sample_valid_image_bytes):
    img = decode_and_validate_image(sample_valid_image_bytes)
    quality = assess_image_quality(img)
    assert quality["is_acceptable"] is True
    assert "blur_score" in quality
    assert isinstance(quality["warnings"], list)

# --------------------------------------------------------------------------
# 3. Class Registry & Recommendation Registry Tests
# --------------------------------------------------------------------------
def test_class_registry_completeness():
    classes = get_all_classes()
    assert len(classes) == 25
    assert "Potato___Early_blight" in classes
    assert "Tomato___healthy" in classes

    for c in classes:
        info = get_class_info(c)
        assert info is not None
        assert "crop" in info
        assert "category" in info
        assert "display_name" in info
        assert isinstance(info["is_healthy"], bool)
        assert len(info["symptoms"]) > 0

def test_recommendation_registry_covers_diseases():
    for c in ["Potato___Early_blight", "Potato___Late_blight", "Tomato___Bacterial_spot"]:
        rec = get_recommendation_for_class(c)
        assert rec is not None
        assert "immediate_actions" in rec
        assert "preventive_measures" in rec
        assert "when_to_contact_expert" in rec
        assert len(rec["immediate_actions"]) > 0

# --------------------------------------------------------------------------
# 4. Inference Service Smoke & Determinism Tests
# --------------------------------------------------------------------------
def test_inference_service_loaded():
    service = CropHealthInferenceService()
    assert service.is_ready is True
    assert len(service.index_to_class) == 25

def test_deterministic_inference(sample_valid_image_bytes):
    service = CropHealthInferenceService()
    res1 = service.predict_image(sample_valid_image_bytes)
    res2 = service.predict_image(sample_valid_image_bytes)

    assert res1.predicted_class_id == res2.predicted_class_id
    assert res1.confidence_pct == res2.confidence_pct
    assert res1.status in ["HEALTHY", "DISEASED", "UNFAMILIAR", "INCONCLUSIVE"]
    assert res1.confidence_level in ["HIGH_CONFIDENCE", "MODERATE_CONFIDENCE", "LOW_CONFIDENCE", "INCONCLUSIVE"]
    assert len(res1.top_alternatives) <= 3

# --------------------------------------------------------------------------
# 5. FastAPI Endpoints Integration Tests
# --------------------------------------------------------------------------
def test_fastapi_health_endpoint():
    res = client.get("/crop-health/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "crop_health_ai"
    assert data["model_loaded"] is True

def test_fastapi_ready_endpoint():
    res = client.get("/crop-health/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["classes_count"] == 25

def test_fastapi_model_info_endpoint():
    res = client.get("/crop-health/model-info")
    assert res.status_code == 200
    data = res.json()
    assert data["model_version"] == "1.0.0"
    assert "MobileNetV3" in data["architecture"]
    assert data["total_classes"] == 25
    assert "Tomato" in data["supported_crops"]

def test_fastapi_predict_endpoint(sample_valid_image_bytes):
    response = client.post(
        "/crop-health/predict",
        files={"file": ("test_leaf.jpg", sample_valid_image_bytes, "image/jpeg")},
        data={"crop_hint": "Potato"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "predicted_class_id" in data
    assert "confidence_pct" in data
    assert "status" in data
    assert "image_quality" in data
    assert "top_alternatives" in data
