"""
HarvestWindow Phase AI-1: Hugging Face Indian Crop Yield Dataset Ingestion
Integrates dhyann2815/india-crop-yield-prediction with full provenance tracking.
"""
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import text

from .normalize import (
    normalize_crop_name,
    normalize_season_name,
    normalize_state_name,
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

DATASET_REPO = "dhyann2815/india-crop-yield-prediction"
SOURCE_NAME = f"HuggingFace/{DATASET_REPO}"

def ingest_huggingface_yield_dataset(
    dry_run: bool = False,
    limit: Optional[int] = 1000,
    split: str = "train",
) -> Dict[str, Any]:
    """
    Load dhyann2815/india-crop-yield-prediction from Hugging Face and ingest into MySQL.
    """
    from datasets import load_dataset

    session = None if dry_run else get_db_session()
    batch_id = None

    if not dry_run:
        source_id = get_or_create_data_source(
            session=session,
            source_name=SOURCE_NAME,
            source_url=f"https://huggingface.co/datasets/{DATASET_REPO}",
            dataset_title="India Crop Yield Prediction Dataset",
            publisher="Dhyan / Hugging Face Community",
            license_str="Open Access / Research",
            geographic_coverage="India (Multiple States)",
            data_origin="derived",
            verification_status="reference_only",
            notes="Aggregated Indian crop yield, rainfall, fertilizer, and pesticide metrics for ML forecasting",
        )
        batch_id = create_import_batch(
            session=session,
            dataset_name=DATASET_REPO,
            source_id=source_id,
            status="in_progress",
        )

    rows_read = 0
    rows_accepted = 0
    rows_rejected = 0
    rows_inserted = 0
    rejected_records = []
    insert_buffer = []

    try:
        # Load Hugging Face dataset (streaming if large or standard load)
        ds = load_dataset(DATASET_REPO, split=split)
        now = datetime.utcnow()

        for item in ds:
            rows_read += 1
            if limit and rows_read > limit:
                break

            raw_crop = clean_text(item.get("Crop"))
            raw_state = clean_text(item.get("State"))
            raw_season = clean_text(item.get("Season"))
            year = safe_int(item.get("Year"))
            area = safe_float(item.get("Area"))
            prod = safe_float(item.get("Production"))
            rainfall = safe_float(item.get("Annual_Rainfall"))
            fertilizer = safe_float(item.get("Fertilizer"))
            pesticide = safe_float(item.get("Pesticide"))
            yield_val = safe_float(item.get("Yield"))

            reasons = []
            if not raw_crop:
                reasons.append("Missing crop name")
            if not raw_state:
                reasons.append("Missing state name")
            if not year:
                reasons.append("Missing year")
            if area is not None and area < 0:
                reasons.append("Negative area")
            if prod is not None and prod < 0:
                reasons.append("Negative production")

            if reasons:
                rows_rejected += 1
                if len(rejected_records) < 50:
                    rejected_records.append({
                        "index": rows_read,
                        "crop": raw_crop,
                        "state": raw_state,
                        "reasons": reasons,
                    })
                continue

            rows_accepted += 1
            if dry_run:
                rows_inserted += 1
                continue

            insert_buffer.append({
                "id": generate_id("obs"),
                "cropNameRaw": normalize_crop_name(raw_crop),
                "stateRaw": normalize_state_name(raw_state),
                "districtRaw": None,
                "seasonRaw": normalize_season_name(raw_season),
                "year": year,
                "areaHectares": area,
                "productionTonnes": prod,
                "yieldTonnesPerHectare": yield_val,
                "annualRainfallMm": rainfall,
                "fertilizerUsageKg": fertilizer,
                "pesticideUsageKg": pesticide,
                "sourceName": SOURCE_NAME,
                "isSynthetic": 0,
                "dataOrigin": "derived",
                "verificationStatus": "reference_only",
                "now": now,
            })

            if len(insert_buffer) >= 200:
                session.execute(
                    text("""
                        INSERT INTO crop_yield_observations 
                        (id, cropNameRaw, stateRaw, districtRaw, seasonRaw, year, 
                         areaHectares, productionTonnes, yieldTonnesPerHectare, 
                         annualRainfallMm, fertilizerUsageKg, pesticideUsageKg,
                         sourceName, isSynthetic, dataOrigin, verificationStatus, createdAt)
                        VALUES 
                        (:id, :cropNameRaw, :stateRaw, :districtRaw, :seasonRaw, :year, 
                         :areaHectares, :productionTonnes, :yieldTonnesPerHectare, 
                         :annualRainfallMm, :fertilizerUsageKg, :pesticideUsageKg,
                         :sourceName, :isSynthetic, :dataOrigin, :verificationStatus, :now)
                    """),
                    insert_buffer,
                )
                session.commit()
                rows_inserted += len(insert_buffer)
                insert_buffer.clear()

        # Flush remaining
        if insert_buffer and not dry_run and session:
            session.execute(
                text("""
                    INSERT INTO crop_yield_observations 
                    (id, cropNameRaw, stateRaw, districtRaw, seasonRaw, year, 
                     areaHectares, productionTonnes, yieldTonnesPerHectare, 
                     annualRainfallMm, fertilizerUsageKg, pesticideUsageKg,
                     sourceName, isSynthetic, dataOrigin, verificationStatus, createdAt)
                    VALUES 
                    (:id, :cropNameRaw, :stateRaw, :districtRaw, :seasonRaw, :year, 
                     :areaHectares, :productionTonnes, :yieldTonnesPerHectare, 
                     :annualRainfallMm, :fertilizerUsageKg, :pesticideUsageKg,
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
                rows_skipped=0,
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
                rows_skipped=0,
                status="failed",
                error_summary=str(e),
                rejected_details=rejected_records,
            )
        raise e
    finally:
        if session:
            session.close()

    return {
        "dataset": DATASET_REPO,
        "dry_run": dry_run,
        "batch_id": batch_id,
        "rows_read": rows_read,
        "rows_accepted": rows_accepted,
        "rows_rejected": rows_rejected,
        "rows_inserted": rows_inserted,
        "rejected_count": len(rejected_records),
    }
