"""
HarvestWindow Phase AI-1: Data Normalization Utilities
Handles canonical crop names, season standardizing, geographic cleanups, and safe numeric casts.
"""
from typing import Optional, Any
import math

# Controlled mapping for common crop variants to canonical names
CROP_CANONICAL_MAP = {
    "rice": "Rice",
    "paddy": "Rice",
    "dhan": "Rice",
    "wheat": "Wheat",
    "gehun": "Wheat",
    "maize": "Maize",
    "makka": "Maize",
    "corn": "Maize",
    "cotton": "Cotton",
    "cotton(lint)": "Cotton",
    "kapas": "Cotton",
    "sugarcane": "Sugarcane",
    "ganna": "Sugarcane",
    "mustard": "Mustard",
    "rapeseed": "Mustard",
    "rapeseed &mustard": "Mustard",
    "rapeseed and mustard": "Mustard",
    "sarson": "Mustard",
    "toria": "Mustard",
    "gram": "Chickpea",
    "chickpea": "Chickpea",
    "bengal gram": "Chickpea",
    "chana": "Chickpea",
    "soyabean": "Soybean",
    "soybean": "Soybean",
    "groundnut": "Groundnut",
    "peanut": "Groundnut",
    "moongphali": "Groundnut",
    "tomato": "Tomato",
    "potato": "Potato",
    "onion": "Onion",
    "arhar/tur": "Pigeon Pea",
    "arhar": "Pigeon Pea",
    "tur": "Pigeon Pea",
    "pigeon pea": "Pigeon Pea",
    "red gram": "Pigeon Pea",
    "bajra": "Pearl Millet",
    "pearl millet": "Pearl Millet",
    "jowar": "Sorghum",
    "sorghum": "Sorghum",
    "moong(green gram)": "Green Gram",
    "moong": "Green Gram",
    "green gram": "Green Gram",
    "urad": "Black Gram",
    "black gram": "Black Gram",
    "barley": "Barley",
    "jau": "Barley",
    "jute": "Jute",
    "tea": "Tea",
    "coffee": "Coffee",
    "tobacco": "Tobacco",
    "sunflower": "Sunflower",
    "sesamum": "Sesamum",
    "linseed": "Linseed",
    "castor seed": "Castor",
    "arecanut": "Arecanut",
    "coconut": "Coconut",
    "cashewnut": "Cashewnut",
    "banana": "Banana",
    "ginger": "Ginger",
    "dry ginger": "Ginger",
    "turmeric": "Turmeric",
    "sweet potato": "Sweet Potato",
    "tapioca": "Tapioca",
    "cardamom": "Cardamom",
    "black pepper": "Black Pepper",
    "coriander": "Coriander",
    "garlic": "Garlic",
}

# Controlled mapping for season labels in Indian agricultural statistics
SEASON_CANONICAL_MAP = {
    "kharif": "Kharif",
    "rabi": "Rabi",
    "zaid": "Zaid",
    "summer": "Zaid",
    "whole year": "Whole Year",
    "autumn": "Kharif",
    "winter": "Rabi",
}

# Controlled state spelling standardizations
STATE_NAME_STANDARDIZATION = {
    "orissa": "Odisha",
    "uttaranchal": "Uttarakhand",
    "pondicherry": "Puducherry",
    "andaman and nicobar islands": "Andaman and Nicobar Islands",
    "dadra and nagar haveli": "Dadra and Nagar Haveli",
    "daman and diu": "Daman and Diu",
    "jammu and kashmir": "Jammu and Kashmir",
    "delhi": "NCT of Delhi",
}

def clean_text(val: Any) -> Optional[str]:
    """Trim whitespace and collapse multiple spaces, returning None if empty."""
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() in ("nan", "none", "null", "n/a", "-"):
        return None
    return " ".join(s.split())

def normalize_crop_name(name: Any) -> str:
    """Normalize raw crop name into its canonical agricultural master name."""
    cleaned = clean_text(name)
    if not cleaned:
        return "Unknown"
    lower_key = cleaned.lower()
    if lower_key in CROP_CANONICAL_MAP:
        return CROP_CANONICAL_MAP[lower_key]
    # Return formatted title case for unmapped crops
    return cleaned.title()

def normalize_season_name(season: Any) -> str:
    """Normalize raw season label to canonical Kharif, Rabi, Zaid, or Whole Year."""
    cleaned = clean_text(season)
    if not cleaned:
        return "Whole Year"
    lower_key = cleaned.lower()
    return SEASON_CANONICAL_MAP.get(lower_key, cleaned.title())

def normalize_state_name(state: Any) -> str:
    """Normalize Indian state / UT name to official standardized name."""
    cleaned = clean_text(state)
    if not cleaned:
        return "Unknown"
    lower_key = cleaned.lower()
    if lower_key in STATE_NAME_STANDARDIZATION:
        return STATE_NAME_STANDARDIZATION[lower_key]
    return cleaned.title()

def normalize_district_name(district: Any) -> Optional[str]:
    """Normalize district name to standard Title Case."""
    cleaned = clean_text(district)
    if not cleaned:
        return None
    return cleaned.title()

def safe_float(val: Any, default: Optional[float] = None) -> Optional[float]:
    """Convert input to float safely, returning None or default on NaN / error."""
    if val is None:
        return default
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (ValueError, TypeError):
        return default

def safe_int(val: Any, default: Optional[int] = None) -> Optional[int]:
    """Convert input to integer safely, returning None or default on error."""
    if val is None:
        return default
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return int(f)
    except (ValueError, TypeError):
        return default
