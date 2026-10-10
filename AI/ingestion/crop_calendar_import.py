"""
HarvestWindow Phase AI-1: Verified Crop Calendar & Agronomic Profile Ingestion
Reads verified CSV calendars and populates normalized relational models in MySQL.
"""
import os
import csv
import json
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import text

from .normalize import (
    normalize_crop_name,
    normalize_season_name,
    normalize_state_name,
    normalize_district_name,
    clean_text,
    safe_int,
    safe_float,
)
from .validate import validate_crop_calendar_record
from .provenance import (
    get_db_session,
    generate_id,
    get_or_create_data_source,
    create_import_batch,
    update_import_batch,
)

def import_crop_calendar_csv(
    file_path: str,
    dry_run: bool = False,
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Ingest a verified crop calendar CSV into normalized MySQL tables.
    Returns summary statistics dictionary.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Crop calendar file not found: {file_path}")

    session = None if dry_run else get_db_session()
    batch_id = None
    if not dry_run:
        batch_id = create_import_batch(
            session=session,
            dataset_name=os.path.basename(file_path),
            status="in_progress",
        )

    rows_read = 0
    rows_accepted = 0
    rows_rejected = 0
    rows_inserted = 0
    rows_updated = 0
    rows_skipped = 0
    rejected_records = []

    try:
        with open(file_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            now = datetime.utcnow()

            for row in reader:
                rows_read += 1
                if limit and rows_read > limit:
                    break

                # 1. Validate raw row
                is_valid, reasons = validate_crop_calendar_record(row)
                if not is_valid:
                    rows_rejected += 1
                    rejected_records.append({
                        "row_number": rows_read,
                        "crop_name": row.get("crop_name"),
                        "reasons": reasons,
                    })
                    continue

                rows_accepted += 1
                if dry_run:
                    rows_inserted += 1
                    continue

                # 2. Extract & normalize entities
                crop_canonical = normalize_crop_name(row.get("crop_name"))
                scientific_name = clean_text(row.get("scientific_name"))
                category = clean_text(row.get("category")) or "Cereals"
                variety_name = clean_text(row.get("variety_name"))
                state_canonical = normalize_state_name(row.get("state"))
                district_canonical = normalize_district_name(row.get("district"))
                season_canonical = normalize_season_name(row.get("season"))

                # Data source
                source_name = clean_text(row.get("source_name")) or "Official Agricultural Reference"
                source_url = clean_text(row.get("source_url"))
                publisher = clean_text(row.get("publisher"))
                verification_status = clean_text(row.get("verification_status")) or "verified"

                source_id = get_or_create_data_source(
                    session=session,
                    source_name=source_name,
                    source_url=source_url,
                    publisher=publisher,
                    verification_status=verification_status,
                )

                # 3. Upsert CropMaster
                crop_row = session.execute(
                    text("SELECT id FROM crop_masters WHERE name = :name LIMIT 1"),
                    {"name": crop_canonical},
                ).fetchone()

                if crop_row:
                    crop_id = crop_row[0]
                    session.execute(
                        text("""
                            UPDATE crop_masters 
                            SET scientificName = COALESCE(:scientificName, scientificName),
                                category = COALESCE(:category, category),
                                updatedAt = :now
                            WHERE id = :id
                        """),
                        {"id": crop_id, "scientificName": scientific_name, "category": category, "now": now},
                    )
                else:
                    crop_id = generate_id("crop")
                    session.execute(
                        text("""
                            INSERT INTO crop_masters (id, name, scientificName, category, isActive, createdAt, updatedAt)
                            VALUES (:id, :name, :scientificName, :category, 1, :now, :now)
                        """),
                        {"id": crop_id, "name": crop_canonical, "scientificName": scientific_name, "category": category, "now": now},
                    )
                    rows_inserted += 1

                # 4. Optional CropVariety
                variety_id = None
                if variety_name:
                    var_row = session.execute(
                        text("SELECT id FROM crop_varieties WHERE cropId = :cropId AND name = :name LIMIT 1"),
                        {"cropId": crop_id, "name": variety_name},
                    ).fetchone()

                    dur_min = safe_int(row.get("duration_min_days"))
                    dur_max = safe_int(row.get("duration_max_days"))

                    if var_row:
                        variety_id = var_row[0]
                    else:
                        variety_id = generate_id("var")
                        session.execute(
                            text("""
                                INSERT INTO crop_varieties 
                                (id, cropId, name, typicalDurationMinDays, typicalDurationMaxDays, 
                                 sourceId, verificationStatus, isActive, createdAt, updatedAt)
                                VALUES 
                                (:id, :cropId, :name, :durMin, :durMax, :sourceId, :vStatus, 1, :now, :now)
                            """),
                            {
                                "id": variety_id,
                                "cropId": crop_id,
                                "name": variety_name,
                                "durMin": dur_min,
                                "durMax": dur_max,
                                "sourceId": source_id,
                                "vStatus": verification_status,
                                "now": now,
                            },
                        )

                # 5. CropSeason
                season_row = session.execute(
                    text("SELECT id FROM crop_seasons WHERE name = :name LIMIT 1"),
                    {"name": season_canonical},
                ).fetchone()

                if season_row:
                    season_id = season_row[0]
                else:
                    season_id = generate_id("season")
                    session.execute(
                        text("""
                            INSERT INTO crop_seasons (id, name, description, geographicCoverage, verificationStatus, createdAt, updatedAt)
                            VALUES (:id, :name, :desc, 'India', :vStatus, :now, :now)
                        """),
                        {
                            "id": season_id,
                            "name": season_canonical,
                            "desc": f"Canonical {season_canonical} agricultural season in India",
                            "vStatus": verification_status,
                            "now": now,
                        },
                    )

                # 6. AgriculturalRegion
                region_row = session.execute(
                    text("SELECT id FROM agricultural_regions WHERE state = :state AND district = :district LIMIT 1"),
                    {"state": state_canonical, "district": district_canonical},
                ).fetchone()

                if region_row:
                    region_id = region_row[0]
                else:
                    region_id = generate_id("reg")
                    session.execute(
                        text("""
                            INSERT INTO agricultural_regions (id, country, state, district, provenance, createdAt, updatedAt)
                            VALUES (:id, 'India', :state, :district, :provenance, :now, :now)
                        """),
                        {
                            "id": region_id,
                            "state": state_canonical,
                            "district": district_canonical,
                            "provenance": source_name,
                            "now": now,
                        },
                    )

                # 7. Upsert CropCalendar
                s_start_m = safe_int(row.get("sowing_start_month"), 6)
                s_start_d = safe_int(row.get("sowing_start_day"))
                s_end_m = safe_int(row.get("sowing_end_month"), 7)
                s_end_d = safe_int(row.get("sowing_end_day"))
                h_start_m = safe_int(row.get("harvest_start_month"))
                h_start_d = safe_int(row.get("harvest_start_day"))
                h_end_m = safe_int(row.get("harvest_end_month"))
                h_end_d = safe_int(row.get("harvest_end_day"))
                notes = clean_text(row.get("notes"))

                cal_existing = session.execute(
                    text("""
                        SELECT id FROM crop_calendars 
                        WHERE cropId = :cropId AND regionId = :regionId AND seasonId = :seasonId
                        LIMIT 1
                    """),
                    {"cropId": crop_id, "regionId": region_id, "seasonId": season_id},
                ).fetchone()

                if cal_existing:
                    session.execute(
                        text("""
                            UPDATE crop_calendars
                            SET varietyId = :varietyId,
                                sowingStartMonth = :sStartM, sowingStartDay = :sStartD,
                                sowingEndMonth = :sEndM, sowingEndDay = :sEndD,
                                harvestStartMonth = :hStartM, harvestStartDay = :hStartD,
                                harvestEndMonth = :hEndM, harvestEndDay = :hEndD,
                                sourceId = :sourceId, verificationStatus = :vStatus,
                                notes = :notes, updatedAt = :now
                            WHERE id = :id
                        """),
                        {
                            "id": cal_existing[0],
                            "varietyId": variety_id,
                            "sStartM": s_start_m, "sStartD": s_start_d,
                            "sEndM": s_end_m, "sEndD": s_end_d,
                            "hStartM": h_start_m, "hStartD": h_start_d,
                            "hEndM": h_end_m, "hEndD": h_end_d,
                            "sourceId": source_id,
                            "vStatus": verification_status,
                            "notes": notes,
                            "now": now,
                        },
                    )
                    rows_updated += 1
                else:
                    cal_id = generate_id("cal")
                    session.execute(
                        text("""
                            INSERT INTO crop_calendars 
                            (id, cropId, varietyId, regionId, seasonId, 
                             sowingStartMonth, sowingStartDay, sowingEndMonth, sowingEndDay,
                             harvestStartMonth, harvestStartDay, harvestEndMonth, harvestEndDay,
                             sourceId, verificationStatus, notes, createdAt, updatedAt)
                            VALUES 
                            (:id, :cropId, :varietyId, :regionId, :seasonId,
                             :sStartM, :sStartD, :sEndM, :sEndD,
                             :hStartM, :hStartD, :hEndM, :hEndD,
                             :sourceId, :vStatus, :notes, :now, :now)
                        """),
                        {
                            "id": cal_id,
                            "cropId": crop_id,
                            "varietyId": variety_id,
                            "regionId": region_id,
                            "seasonId": season_id,
                            "sStartM": s_start_m, "sStartD": s_start_d,
                            "sEndM": s_end_m, "sEndD": s_end_d,
                            "hStartM": h_start_m, "hStartD": h_start_d,
                            "hEndM": h_end_m, "hEndD": h_end_d,
                            "sourceId": source_id,
                            "vStatus": verification_status,
                            "notes": notes,
                            "now": now,
                        },
                    )
                    rows_inserted += 1

                # 8. Upsert CropGrowthProfile
                dur_min = safe_int(row.get("duration_min_days"))
                dur_typ = safe_int(row.get("duration_typical_days"))
                dur_max = safe_int(row.get("duration_max_days"))
                base_t = safe_float(row.get("base_temp_c"))
                upper_t = safe_float(row.get("upper_temp_c"))
                gdd_min = safe_float(row.get("gdd_min"))
                gdd_typ = safe_float(row.get("gdd_typical"))
                gdd_max = safe_float(row.get("gdd_max"))
                gdd_method = clean_text(row.get("gdd_method"))
                conditions = clean_text(row.get("water_requirement_notes"))

                if dur_typ is not None:
                    profile_existing = session.execute(
                        text("SELECT id FROM crop_growth_profiles WHERE cropId = :cropId LIMIT 1"),
                        {"cropId": crop_id},
                    ).fetchone()

                    if profile_existing:
                        session.execute(
                            text("""
                                UPDATE crop_growth_profiles
                                SET minDurationDays = :minDur, typicalDurationDays = :typDur, maxDurationDays = :maxDur,
                                    baseTemperature = :baseT, upperTemperatureThreshold = :upperT,
                                    gddRequirementMin = :gddMin, gddRequirementTypical = :gddTyp, gddRequirementMax = :gddMax,
                                    gddMethod = :gddMethod, conditions = :cond, sourceId = :sourceId,
                                    verificationStatus = :vStatus, updatedAt = :now
                                WHERE id = :id
                            """),
                            {
                                "id": profile_existing[0],
                                "minDur": dur_min or dur_typ,
                                "typDur": dur_typ,
                                "maxDur": dur_max or dur_typ,
                                "baseT": base_t,
                                "upperT": upper_t,
                                "gddMin": gdd_min,
                                "gddTyp": gdd_typ,
                                "gddMax": gdd_max,
                                "gddMethod": gdd_method,
                                "cond": conditions,
                                "sourceId": source_id,
                                "vStatus": verification_status,
                                "now": now,
                            },
                        )
                    else:
                        gp_id = generate_id("growth")
                        session.execute(
                            text("""
                                INSERT INTO crop_growth_profiles
                                (id, cropId, varietyId, minDurationDays, typicalDurationDays, maxDurationDays,
                                 baseTemperature, upperTemperatureThreshold, gddRequirementMin, gddRequirementTypical, gddRequirementMax,
                                 gddMethod, conditions, sourceId, verificationStatus, createdAt, updatedAt)
                                VALUES
                                (:id, :cropId, :varietyId, :minDur, :typDur, :maxDur,
                                 :baseT, :upperT, :gddMin, :gddTyp, :gddMax,
                                 :gddMethod, :cond, :sourceId, :vStatus, :now, :now)
                            """),
                            {
                                "id": gp_id,
                                "cropId": crop_id,
                                "varietyId": variety_id,
                                "minDur": dur_min or dur_typ,
                                "typDur": dur_typ,
                                "maxDur": dur_max or dur_typ,
                                "baseT": base_t,
                                "upperT": upper_t,
                                "gddMin": gdd_min,
                                "gddTyp": gdd_typ,
                                "gddMax": gdd_max,
                                "gddMethod": gdd_method,
                                "cond": conditions,
                                "sourceId": source_id,
                                "vStatus": verification_status,
                                "now": now,
                            },
                        )

                # 9. Upsert CropSuitabilityProfile
                soil_types = clean_text(row.get("soil_types"))
                soil_ph_min = safe_float(row.get("soil_ph_min"))
                soil_ph_max = safe_float(row.get("soil_ph_max"))
                temp_min_c = safe_float(row.get("temp_min_c"))
                temp_max_c = safe_float(row.get("temp_max_c"))
                rf_min = safe_float(row.get("rainfall_min_mm"))
                rf_max = safe_float(row.get("rainfall_max_mm"))

                if soil_types or soil_ph_min or temp_min_c or rf_min:
                    suit_existing = session.execute(
                        text("SELECT id FROM crop_suitability_profiles WHERE cropId = :cropId LIMIT 1"),
                        {"cropId": crop_id},
                    ).fetchone()

                    if suit_existing:
                        session.execute(
                            text("""
                                UPDATE crop_suitability_profiles
                                SET soilTypes = :soilTypes, soilPhMin = :phMin, soilPhMax = :phMax,
                                    tempMinC = :tempMin, tempMaxC = :tempMax,
                                    rainfallMinMm = :rfMin, rainfallMaxMm = :rfMax,
                                    waterRequirementDescription = :waterDesc,
                                    sourceId = :sourceId, verificationStatus = :vStatus, updatedAt = :now
                                WHERE id = :id
                            """),
                            {
                                "id": suit_existing[0],
                                "soilTypes": soil_types,
                                "phMin": soil_ph_min, "phMax": soil_ph_max,
                                "tempMin": temp_min_c, "tempMax": temp_max_c,
                                "rfMin": rf_min, "rfMax": rf_max,
                                "waterDesc": conditions,
                                "sourceId": source_id,
                                "vStatus": verification_status,
                                "now": now,
                            },
                        )
                    else:
                        suit_id = generate_id("suit")
                        session.execute(
                            text("""
                                INSERT INTO crop_suitability_profiles
                                (id, cropId, soilTypes, soilPhMin, soilPhMax, tempMinC, tempMaxC,
                                 rainfallMinMm, rainfallMaxMm, waterRequirementDescription,
                                 sourceId, verificationStatus, createdAt, updatedAt)
                                VALUES
                                (:id, :cropId, :soilTypes, :phMin, :phMax, :tempMin, :tempMax,
                                 :rfMin, :rfMax, :waterDesc, :sourceId, :vStatus, :now, :now)
                            """),
                            {
                                "id": suit_id,
                                "cropId": crop_id,
                                "soilTypes": soil_types,
                                "phMin": soil_ph_min, "phMax": soil_ph_max,
                                "tempMin": temp_min_c, "tempMax": temp_max_c,
                                "rfMin": rf_min, "rfMax": rf_max,
                                "waterDesc": conditions,
                                "sourceId": source_id,
                                "vStatus": verification_status,
                                "now": now,
                            },
                        )

            if not dry_run and session:
                session.commit()

        if not dry_run and session and batch_id:
            update_import_batch(
                session=session,
                batch_id=batch_id,
                rows_read=rows_read,
                rows_accepted=rows_accepted,
                rows_rejected=rows_rejected,
                rows_inserted=rows_inserted,
                rows_updated=rows_updated,
                rows_skipped=rows_skipped,
                status="completed",
                rejected_details=rejected_records,
            )

    except Exception as e:
        if not dry_run and session and batch_id:
            session.rollback()
            update_import_batch(
                session=session,
                batch_id=batch_id,
                rows_read=rows_read,
                rows_accepted=rows_accepted,
                rows_rejected=rows_rejected,
                rows_inserted=rows_inserted,
                rows_updated=rows_updated,
                rows_skipped=rows_skipped,
                status="failed",
                error_summary=str(e),
                rejected_details=rejected_records,
            )
        raise e
    finally:
        if session:
            session.close()

    return {
        "status": "success",
        "dry_run": dry_run,
        "batch_id": batch_id,
        "rows_read": rows_read,
        "rows_accepted": rows_accepted,
        "rows_rejected": rows_rejected,
        "rows_inserted": rows_inserted,
        "rows_updated": rows_updated,
        "rows_skipped": rows_skipped,
        "rejected_count": len(rejected_records),
    }
