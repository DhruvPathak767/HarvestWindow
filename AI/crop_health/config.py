"""
HarvestWindow Phase AI-6: Crop Disease and Health Detection Configuration
Defines operational thresholds, directory paths, model hyperparameters, and supported crops.
"""
import os
from pathlib import Path

# Directories
MODULE_DIR = Path(__file__).parent.resolve()
AI_DIR = MODULE_DIR.parent.resolve()
ARTIFACTS_DIR = MODULE_DIR / "artifacts"
REPORTS_DIR = AI_DIR / "reports"
DATASETS_DIR = AI_DIR / "datasets"

ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Model Artifact Paths
MODEL_PATH = ARTIFACTS_DIR / "crop_health_mobilenet_v3.pth"
CLASS_MAPPING_PATH = ARTIFACTS_DIR / "class_mapping.json"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"

# Image Input Dimensions for MobileNetV3
IMAGE_SIZE = 224
IMAGE_RESIZE = 256
IMAGE_CHANNELS = 3
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# Maximum Upload Constraints
MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_IMAGE_PIXELS = 4096 * 4096                # Max decoded dimensions
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}

# Confidence Thresholds
CONFIDENCE_THRESHOLD_HIGH = 0.85
CONFIDENCE_THRESHOLD_MODERATE = 0.60
CONFIDENCE_THRESHOLD_LOW = 0.40
# Predictions below CONFIDENCE_THRESHOLD_LOW are marked as INCONCLUSIVE

# Out-of-Distribution / Margin Threshold
TOP_MARGIN_THRESHOLD = 0.15  # Margin between top-1 and top-2

# Blur Threshold (Laplacian Variance)
MIN_BLUR_VARIANCE = 50.0  # Images with variance below this are flagged as blurry

# Supported Crops in Model
SUPPORTED_CROPS = ["Potato", "Tomato", "Corn (Maize)", "Grape", "Apple"]
