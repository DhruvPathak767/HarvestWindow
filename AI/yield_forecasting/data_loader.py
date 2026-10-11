"""
Data loading and normalization module for Yield Forecasting (Phase AI-5).
"""
import os
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, Optional

from .config import (
    INDIA_CROP_YIELD_CSV,
    KAGGLE_CROP_PRODUCTION_CSV,
    TYPICAL_YIELD_BENCHMARKS
)

# Standard Crop Name Normalization Map
CROP_NAME_MAPPINGS = {
    "rice (paddy)": "Rice",
    "paddy": "Rice",
    "dhan": "Rice",
    "wheat": "Wheat",
    "gehu": "Wheat",
    "cotton(lint)": "Cotton",
    "cotton": "Cotton",
    "kapas": "Cotton",
    "rapeseed &mustard": "Mustard",
    "mustard": "Mustard",
    "sarson": "Mustard",
    "gram": "Chickpea",
    "chana": "Chickpea",
    "chickpea": "Chickpea",
    "arhar/tur": "Pigeon Pea",
    "tur": "Pigeon Pea",
    "arhar": "Pigeon Pea",
    "pigeon pea": "Pigeon Pea",
    "moong(green gram)": "Moong",
    "moong": "Moong",
    "urad": "Urad",
    "maize": "Maize",
    "makka": "Maize",
    "corn": "Maize",
    "bajra": "Bajra",
    "pearl millet": "Bajra",
    "jowar": "Jowar",
    "sorghum": "Jowar",
    "soyabean": "Soybean",
    "soybean": "Soybean",
    "groundnut": "Groundnut",
    "moongphali": "Groundnut",
    "potato": "Potato",
    "aloo": "Potato",
    "onion": "Onion",
    "pyaz": "Onion",
    "tomato": "Tomato",
    "tamatar": "Tomato",
    "sugarcane": "Sugarcane",
    "ganna": "Sugarcane",
}


def normalize_crop_name(name: str) -> str:
    if not name or not isinstance(name, str):
        return "Unknown"
    cleaned = name.strip().lower()
    return CROP_NAME_MAPPINGS.get(cleaned, name.strip().title())


def load_cleaned_yield_dataset(
    csv_path: Optional[str] = None,
    exclude_coconut: bool = True
) -> pd.DataFrame:
    """
    Loads and cleans the India crop yield dataset for supervised model training.
    Filters out invalid areas, zero productions, and unit outliers.
    """
    path = csv_path or INDIA_CROP_YIELD_CSV
    if not os.path.exists(path):
        raise FileNotFoundError(f"Crop yield dataset not found at: {path}")

    df = pd.read_csv(path)

    # Required columns check
    required = ["State", "Crop", "Season", "Area", "Production", "Yield"]
    for col in required:
        if col not in df.columns:
            raise ValueError(f"Dataset missing required column: {col}")

    # Standardize string columns
    df["State"] = df["State"].astype(str).str.strip().str.title()
    df["Season"] = df["Season"].astype(str).str.strip().str.title()
    df["Crop_Raw"] = df["Crop"].astype(str).str.strip()
    df["Crop"] = df["Crop_Raw"].apply(normalize_crop_name)

    # Filter out Coconut as Indian national statistics record coconut in 'nuts' (count), not tonnes
    if exclude_coconut:
        df = df[df["Crop_Raw"] != "Coconut"].copy()

    # Numeric conversions and invalid record pruning
    df["Area"] = pd.to_numeric(df["Area"], errors="coerce")
    df["Production"] = pd.to_numeric(df["Production"], errors="coerce")
    df["Yield"] = pd.to_numeric(df["Yield"], errors="coerce")

    # Prune nonpositive area or negative production
    df = df.dropna(subset=["Area", "Production", "Yield"])
    df = df[(df["Area"] > 0) & (df["Production"] >= 0) & (df["Yield"] > 0)].copy()

    # Re-verify Yield = Production / Area where sensible, else keep reported yield
    # Handle physical upper bounds per crop group to eliminate data entry typos
    valid_mask = []
    for _, row in df.iterrows():
        crop = row["Crop"]
        y = row["Yield"]
        benchmark = TYPICAL_YIELD_BENCHMARKS.get(crop, None)
        if benchmark:
            # Allow up to 2.5x the typical max yield to tolerate high-yield microclimates but drop 100x typos
            valid = (y >= 0.05) and (y <= benchmark["max"] * 2.5)
        else:
            # Generic sanity bounds: 0.05 to 50.0 t/ha
            valid = (y >= 0.05) and (y <= 50.0)
        valid_mask.append(valid)

    df = df[valid_mask].copy()

    # Fill optional numeric features with regional/dataset medians
    if "Annual_Rainfall" in df.columns:
        df["Annual_Rainfall"] = pd.to_numeric(df["Annual_Rainfall"], errors="coerce").fillna(df["Annual_Rainfall"].median())
    else:
        df["Annual_Rainfall"] = 1100.0

    if "Fertilizer" in df.columns:
        df["Fertilizer"] = pd.to_numeric(df["Fertilizer"], errors="coerce").fillna(df["Fertilizer"].median())
    else:
        df["Fertilizer"] = 100.0

    if "Pesticide" in df.columns:
        df["Pesticide"] = pd.to_numeric(df["Pesticide"], errors="coerce").fillna(df["Pesticide"].median())
    else:
        df["Pesticide"] = 5.0

    return df.reset_index(drop=True)
