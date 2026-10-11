"""
Crop Health & Disease Detection Package (Phase AI-6)
"""
from .inference import CropHealthInferenceService
from .config import (
    MODEL_PATH,
    CLASS_MAPPING_PATH,
    METADATA_PATH,
    SUPPORTED_CROPS
)

__all__ = [
    "CropHealthInferenceService",
    "MODEL_PATH",
    "CLASS_MAPPING_PATH",
    "METADATA_PATH",
    "SUPPORTED_CROPS"
]
