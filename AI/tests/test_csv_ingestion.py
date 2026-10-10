"""
Unit and integration tests for CSV ingestion pipeline in AI/ingestion/crop_calendar_import.py
"""
import os
import tempfile
import pytest
from AI.ingestion.crop_calendar_import import import_crop_calendar_csv

SAMPLE_CSV_CONTENT = """crop_name,scientific_name,category,variety_name,state,district,season,sowing_start_month,sowing_start_day,sowing_end_month,sowing_end_day,harvest_start_month,harvest_start_day,harvest_end_month,harvest_end_day,duration_min_days,duration_typical_days,duration_max_days,base_temp_c,upper_temp_c,gdd_min,gdd_typical,gdd_max,gdd_method,soil_types,soil_ph_min,soil_ph_max,temp_min_c,temp_max_c,rainfall_min_mm,rainfall_max_mm,water_requirement_notes,source_name,source_url,publisher,verification_status,notes
Wheat,Triticum aestivum,Cereals,PBW 343,Punjab,Ludhiana,Rabi,11,1,11,25,4,1,4,20,125,135,145,4.5,30.0,1500,1650,1800,Standard Daily Mean,"Alluvial",6.0,7.5,10.0,25.0,300,450,4 critical irrigations,PAU Ludhiana,https://pau.edu,PAU,verified,Standard North wheat
Rice,Oryza sativa,Cereals,Sona Masoori,Karnataka,Raichur,Kharif,6,15,7,31,11,1,11,30,130,140,150,10.0,35.0,1850,2050,2200,Standard Daily Mean,"Deep Black Soil",5.8,7.8,20.0,35.0,900,1300,Standing water needed,UAS Raichur,https://uasraichur.edu.in,UAS,verified,Major paddy
InvalidCrop,None,Cereals,BadVar,StateX,DistY,Kharif,14,1,15,31,11,1,11,30,150,120,110,None,None,None,None,None,None,None,None,None,None,None,None,None,None,SourceZ,None,None,verified,Should be rejected
"""

def test_dry_run_csv_ingestion():
    with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf-8") as f:
        f.write(SAMPLE_CSV_CONTENT)
        temp_path = f.name

    try:
        res = import_crop_calendar_csv(temp_path, dry_run=True)
        assert res["status"] == "success"
        assert res["dry_run"] is True
        assert res["rows_read"] == 3
        assert res["rows_accepted"] == 2
        assert res["rows_rejected"] == 1
        assert res["rejected_count"] == 1
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
