"""
Unit tests for agronomic boundary and rule validation in AI/ingestion/validate.py
"""
import pytest
try:
    from ingestion.validate import (
        validate_crop_calendar_record,
        validate_growth_profile,
        validate_suitability_profile,
    )
except ImportError:
    from AI.ingestion.validate import (
        validate_crop_calendar_record,
        validate_growth_profile,
        validate_suitability_profile,
    )

def test_valid_crop_calendar_record():
    valid_record = {
        "crop_name": "Wheat",
        "state": "Punjab",
        "season": "Rabi",
        "sowing_start_month": "11",
        "sowing_start_day": "1",
        "sowing_end_month": "11",
        "sowing_end_day": "25",
        "harvest_start_month": "4",
        "harvest_end_month": "4",
        "duration_min_days": "125",
        "duration_typical_days": "135",
        "duration_max_days": "145",
        "base_temp_c": "4.5",
        "upper_temp_c": "30.0",
        "gdd_min": "1500",
        "gdd_typical": "1650",
        "gdd_max": "1800",
        "soil_ph_min": "6.0",
        "soil_ph_max": "7.5",
        "rainfall_min_mm": "300",
        "rainfall_max_mm": "450",
        "source_name": "PAU Ludhiana",
        "verification_status": "verified",
    }
    is_valid, issues = validate_crop_calendar_record(valid_record)
    assert is_valid is True
    assert len(issues) == 0

def test_invalid_duration_bounds():
    invalid_record = {
        "crop_name": "Rice",
        "state": "Karnataka",
        "season": "Kharif",
        "sowing_start_month": "6",
        "sowing_end_month": "7",
        "duration_min_days": "150",
        "duration_typical_days": "130",  # min > typical (invalid!)
        "duration_max_days": "140",
        "source_name": "ICAR",
    }
    is_valid, issues = validate_crop_calendar_record(invalid_record)
    assert is_valid is False
    assert any("duration_min_days (150) exceeds duration_typical_days (130)" in i for i in issues)

def test_invalid_gdd_without_base_temp():
    record_missing_base = {
        "crop_name": "Maize",
        "state": "Bihar",
        "season": "Kharif",
        "sowing_start_month": "6",
        "sowing_end_month": "7",
        "gdd_typical": "1550",
        # missing base_temp_c (invalid!)
        "source_name": "IIMR",
    }
    is_valid, issues = validate_crop_calendar_record(record_missing_base)
    assert is_valid is False
    assert any("explicit base_temp_c" in i for i in issues)

def test_invalid_ph_ranges():
    record_bad_ph = {
        "crop_name": "Cotton",
        "state": "Gujarat",
        "season": "Kharif",
        "sowing_start_month": "6",
        "sowing_end_month": "7",
        "soil_ph_min": "8.5",
        "soil_ph_max": "6.5",  # min > max (invalid!)
        "source_name": "CICR",
    }
    is_valid, issues = validate_crop_calendar_record(record_bad_ph)
    assert is_valid is False
    assert any("soil_ph_min (8.5) exceeds soil_ph_max (6.5)" in i for i in issues)

def test_growth_profile_validation():
    ok_prof, _ = validate_growth_profile({
        "minDurationDays": 90,
        "typicalDurationDays": 105,
        "maxDurationDays": 120,
    })
    assert ok_prof is True

    bad_prof, issues = validate_growth_profile({
        "minDurationDays": 130,
        "typicalDurationDays": 100,
        "maxDurationDays": 110,
    })
    assert bad_prof is False
    assert len(issues) > 0
