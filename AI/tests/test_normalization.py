"""
Unit tests for data normalization utilities in AI/ingestion/normalize.py
"""
import pytest
try:
    from ingestion.normalize import (
        clean_text,
        normalize_crop_name,
        normalize_season_name,
        normalize_state_name,
        normalize_district_name,
        safe_float,
        safe_int,
    )
except ImportError:
    from AI.ingestion.normalize import (
        clean_text,
        normalize_crop_name,
        normalize_season_name,
        normalize_state_name,
        normalize_district_name,
        safe_float,
        safe_int,
    )

def test_clean_text():
    assert clean_text("   Rice   ") == "Rice"
    assert clean_text("Multiple   spaces    here") == "Multiple spaces here"
    assert clean_text("") is None
    assert clean_text("nan") is None
    assert clean_text("null") is None
    assert clean_text(None) is None

def test_normalize_crop_name():
    assert normalize_crop_name("paddy") == "Rice"
    assert normalize_crop_name("rice") == "Rice"
    assert normalize_crop_name("gehun") == "Wheat"
    assert normalize_crop_name("gram") == "Chickpea"
    assert normalize_crop_name("cotton(lint)") == "Cotton"
    assert normalize_crop_name("rapeseed &mustard") == "Mustard"
    assert normalize_crop_name("arhar/tur") == "Pigeon Pea"
    assert normalize_crop_name("groundnut") == "Groundnut"
    assert normalize_crop_name("peanut") == "Groundnut"
    # Unmapped crops return title case
    assert normalize_crop_name("Dragon Fruit") == "Dragon Fruit"
    assert normalize_crop_name(None) == "Unknown"

def test_normalize_season_name():
    assert normalize_season_name("Kharif     ") == "Kharif"
    assert normalize_season_name("rabi") == "Rabi"
    assert normalize_season_name("Summer") == "Zaid"
    assert normalize_season_name("whole year") == "Whole Year"
    assert normalize_season_name("Autumn") == "Kharif"
    assert normalize_season_name(None) == "Whole Year"

def test_normalize_state_name():
    assert normalize_state_name("orissa") == "Odisha"
    assert normalize_state_name("uttaranchal") == "Uttarakhand"
    assert normalize_state_name("pondicherry") == "Puducherry"
    assert normalize_state_name("karnataka") == "Karnataka"
    assert normalize_state_name(None) == "Unknown"

def test_safe_numeric_conversions():
    assert safe_float("1254.50") == 1254.50
    assert safe_float("invalid") is None
    assert safe_float(None, default=0.0) == 0.0
    assert safe_int("145") == 145
    assert safe_int("nan") is None
    assert safe_int(None, default=10) == 10
