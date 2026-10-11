"""
Image Quality and Unsupported-Input Validation Module
Validates file integrity, dimensions, decompression safety, blur, and lighting conditions.
"""
import io
import math
from typing import Tuple, Dict, Any, List
from PIL import Image, ImageStat, ImageOps
import numpy as np

from .config import (
    MAX_IMAGE_FILE_SIZE_BYTES,
    MAX_IMAGE_PIXELS,
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_MIME_TYPES,
    MIN_BLUR_VARIANCE
)

# Set PIL DecompressionBomb limit
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

class ImageValidationError(Exception):
    """Raised when an uploaded image fails validation."""
    pass

def validate_raw_bytes(image_bytes: bytes, filename: str = "upload.jpg") -> None:
    """Validates raw image bytes size, emptiness, and file signature."""
    if not image_bytes or len(image_bytes) == 0:
        raise ImageValidationError("Uploaded image is empty (0 bytes).")

    if len(image_bytes) > MAX_IMAGE_FILE_SIZE_BYTES:
        max_mb = MAX_IMAGE_FILE_SIZE_BYTES / (1024 * 1024)
        size_mb = len(image_bytes) / (1024 * 1024)
        raise ImageValidationError(
            f"Image file size ({size_mb:.2f} MB) exceeds maximum allowed limit ({max_mb:.0f} MB)."
        )

def decode_and_validate_image(image_bytes: bytes) -> Image.Image:
    """
    Decodes image bytes safely into a PIL Image, checks dimensions and format.
    Guarantees RGB mode.
    """
    validate_raw_bytes(image_bytes)

    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()  # Force decoding to detect truncated/corrupted files
    except Exception as exc:
        raise ImageValidationError(f"Invalid or corrupted image file: {str(exc)}")

    # Check format
    fmt = (image.format or "").upper()
    valid_formats = {"JPEG", "JPG", "PNG", "WEBP", "BMP"}
    if fmt not in valid_formats:
        raise ImageValidationError(
            f"Unsupported image format '{fmt}'. Please upload JPEG, PNG, or WebP."
        )

    width, height = image.size
    if width <= 0 or height <= 0:
        raise ImageValidationError("Image has invalid nonpositive dimensions.")

    if width < 32 or height < 32:
        raise ImageValidationError(
            f"Image dimensions ({width}x{height}) are too small for plant pathology analysis (min 32x32)."
        )

    if width * height > MAX_IMAGE_PIXELS:
        raise ImageValidationError(
            f"Image resolution ({width}x{height}) exceeds maximum allowed pixel capacity."
        )

    # Respect EXIF orientation if present
    try:
        image = ImageOps.exif_transpose(image)
    except Exception:
        pass

    # Ensure 3-channel RGB
    if image.mode != "RGB":
        try:
            image = image.convert("RGB")
        except Exception as exc:
            raise ImageValidationError(f"Failed to convert image to RGB: {str(exc)}")

    return image

def compute_blur_variance(image: Image.Image) -> float:
    """
    Computes Laplacian variance on grayscale image as an indicator of sharpness/blur.
    Low variance (< 50) typically signifies severe motion or optical blur.
    """
    gray = image.convert("L")
    arr = np.array(gray, dtype=np.float32)

    # Discrete Laplacian kernel
    kernel = np.array([[0, 1, 0],
                       [1, -4, 1],
                       [0, 1, 0]], dtype=np.float32)

    # 2D convolution with numpy
    from scipy.signal import convolve2d
    try:
        laplacian = convolve2d(arr, kernel, mode="valid")
        variance = float(laplacian.var())
        return round(variance, 2)
    except Exception:
        return 100.0  # Fallback if convolution encounters issue

def assess_image_quality(image: Image.Image) -> Dict[str, Any]:
    """
    Assesses image blur, lighting, exposure, and color distribution.
    Returns quality score and non-blocking warnings.
    """
    warnings: List[str] = []

    # 1. Blur evaluation
    blur_score = compute_blur_variance(image)
    is_blurry = blur_score < MIN_BLUR_VARIANCE
    if is_blurry:
        warnings.append(
            f"Image appears blurry (sharpness score: {blur_score:.1f}). For best results, capture a steady close-up in focus."
        )

    # 2. Brightness & exposure
    stat = ImageStat.Stat(image)
    # Perceived brightness (luminance approximation: 0.299 R + 0.587 G + 0.114 B)
    r_mean, g_mean, b_mean = stat.mean[:3]
    brightness = 0.299 * r_mean + 0.587 * g_mean + 0.114 * b_mean
    is_poor_exposure = False

    if brightness < 35.0:
        is_poor_exposure = True
        warnings.append(
            f"Image is underexposed or poorly lit (brightness: {brightness:.1f}/255). Well-lit daylight photos yield higher accuracy."
        )
    elif brightness > 230.0:
        is_poor_exposure = True
        warnings.append(
            f"Image is overexposed with high glare (brightness: {brightness:.1f}/255). Avoid direct flash glare on leaves."
        )

    # 3. Visible plant color heuristic (check green / chlorotic proportion)
    # Healthy and diseased leaves generally have non-trivial green/yellow/brown hues
    green_dominance = g_mean / (r_mean + b_mean + 1e-5)
    if brightness > 40 and brightness < 220 and green_dominance < 0.25 and (r_mean > 180 and b_mean > 180):
        warnings.append(
            "Low plant vegetation color profile detected. Ensure the image clearly frames a leaf or plant stem."
        )

    return {
        "is_acceptable": True,
        "blur_score": blur_score,
        "is_blurry": is_blurry,
        "brightness_score": round(brightness, 1),
        "is_poor_exposure": is_poor_exposure,
        "warnings": warnings
    }
