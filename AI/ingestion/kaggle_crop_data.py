"""
HarvestWindow Phase AI-1: Kaggle Indian Crop Production Dataset Ingestion
Processes and standardizes the historical 246,000+ row crop_production.csv dataset.
"""
import os
import csv
from datetime import datetime
from typing import Dict, Any, Optional, List
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
from .provenance import (
    get_db_session,
    generate_id,
    get_or_create_data_source,
    create_import_batch,
    update_import_batch,
)

SOURCE_NAME = "Kaggle/Indian-Crop-Production"
SOURCE_URL = "https://www.kaggle.com/datasets/abhinand05/crop-production-in-india"

def ingest_kaggle_crop_production(
    csv_path: str,
    dry_run: bool = False,
    limit: Optional[int] = None,
    chunk_size: int = 5000,
) -> Dict[str, Any]:
    """
    Ingest rows from crop_production.csv into the crop_yield_observations table.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Kaggle crop production CSV not found at: {csv_path}")

    session = None if dry_run else get_db_session()
    batch_id = None

    if not dry_run:
        source_id = get_or_create_data_source(
            session=session,
            source_name=SOURCE_NAME,
            source_url=SOURCE_URL,
            dataset_title="Crop Production in India (Government of India / Kaggle)",
            publisher="Ministry of Agriculture and Farmers Welfare (DES)",
            license_str="Open Government Data (OGD) Platform India",
            geographic_coverage="All States & Union Territories of India",
            data_origin="observed",
            verification_status="reference_only",
            notes="Historical district-level crop area and production statistics (1997-2015)",
        )
        batch_id = create_import_batch(
            session=session,
            dataset_name=os.path.basename(csv_path),
            source_id=source_id,
            status="in_progress",
        )

    rows_read = 0
    rows_accepted = 0
    rows_rejected = 0
    rows_inserted = 0
    rows_skipped = 0
    rejected_records: List[Dict[str, Any]] = []
    insert_buffer = []

    try:
        with open(csv_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            now = datetime.utcnow()

            for row in reader:
                rows_read += 1
                if limit and rows_read > limit:
                    break

                # Extract and clean
                raw_crop = clean_text(row.get("Crop"))
                raw_state = clean_text(row.get("State_Name"))
                raw_district = clean_text(row.get("District_Name"))
                raw_season = clean_text(row.get("Season"))
                year = safe_int(row.get("Crop_Year"))
                area = safe_float(row.get("Area"))
                prod = safe_float(row.get("Production"))

                # Validate data plausibility
                reasons = []
                if not raw_crop:
                    reasons.append("Missing crop name")
                if not raw_state:
                    reasons.append("Missing state name")
                if not year or year < 1950 or year > 2030:
                    reasons.append(f"Invalid crop year: {year}")
                if area is None or area < 0:
                    reasons.append(f"Invalid negative or missing area: {area}")
                if prod is not None and prod < 0:
                    reasons.append(f"Invalid negative production: {prod}")

                # Calculate and check yield
                yield_val = None
                if area and area > 0 and prod is not None:
                    yield_val = round(prod / area, 4)
                    # Check for implausible yield outlier (> 500 tonnes/ha)
                    if yield_val > 500.0:
                        reasons.append(f"Implausibly high yield: {yield_val} tonnes/ha")

                if reasons:
                    rows_rejected += 1
                    if len(rejected_records) < 100:
                        rejected_records.append({
                            "row_number": rows_read,
                            "crop": raw_crop,
                            "state": raw_state,
                            "year": year,
                            "reasons": reasons,
                        })
                    continue

                rows_accepted += 1
                if dry_run:
                    rows_inserted += 1
                    continue

                canonical_crop = normalize_crop_name(raw_crop)
                canonical_state = normalize_state_name(raw_state)
                canonical_district = normalize_district_name(raw_district)
                canonical_season = normalize_season_name(raw_season)

                insert_buffer.append({
                    "id": generate_id("obs"),
                    "cropNameRaw": canonical_crop,
                    "stateRaw": canonical_state,
                    "districtRaw": canonical_district,
                    "seasonRaw": canonical_season,
                    "year": year,
                    "areaHectares": area,
                    "productionTonnes": prod,
                    "yieldTonnesPerHectare": yield_val,
                    "sourceName": SOURCE_NAME,
                    "isSynthetic": 0,
                    "dataOrigin": "observed",
                    "verificationStatus": "reference_only",
                    "now": now,
                })

                if len(insert_buffer) >= chunk_size:
                    session.execute(
                        text("""
                            INSERT INTO crop_yield_observations 
                            (id, cropNameRaw, stateRaw, districtRaw, seasonRaw, year, 
                             areaHectares, productionTonnes, yieldTonnesPerHectare, 
                             sourceName, isSynthetic, dataOrigin, verificationStatus, createdAt)
                            VALUES 
                            (:id, :cropNameRaw, :stateRaw, :districtRaw, :seasonRaw, :year, 
                             :areaHectares, :productionTonnes, :yieldTonnesPerHectare, 
                             :sourceName, :isSynthetic, :dataOrigin, :verificationStatus, :now)
                        """),
                        insert_buffer,
                    )
                    session.commit()
                    rows_inserted += len(insert_buffer)
                    insert_buffer.clear()

            # Flush remaining buffer
            if insert_buffer and not dry_run and session:
                session.execute(
                    text("""
                        INSERT INTO crop_yield_observations 
                        (id, cropNameRaw, stateRaw, districtRaw, seasonRaw, year, 
                         areaHectares, productionTonnes, yieldTonnesPerHectare, 
                         sourceName, isSynthetic, dataOrigin, verificationStatus, createdAt)
                        VALUES 
                        (:id, :cropNameRaw, :stateRaw, :districtRaw, :seasonRaw, :year, 
                         :areaHectares, :productionTonnes, :yieldTonnesPerHectare, 
                         :sourceName, :isSynthetic, :dataOrigin, :verificationStatus, :now)
                    """),
                    insert_buffer,
                )
                session.commit()
                rows_inserted += len(insert_buffer)
                insert_buffer.clear()

        if not dry_run and session and batch_id:
            update_import_batch(
                session=session,
                batch_id=batch_id,
                rows_read=rows_read,
                rows_accepted=rows_accepted,
                rows_rejected=rows_rejected,
                rows_inserted=rows_inserted,
                rows_updated=0,
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
                rows_updated=0,
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
        "dataset": "Kaggle/crop_production.csv",
        "dry_run": dry_run,
        "batch_id": batch_id,
        "rows_read": rows_read,
        "rows_accepted": rows_accepted,
        "rows_rejected": rows_rejected,
        "rows_inserted": rows_inserted,
        "rejected_count": len(rejected_records),
    }
