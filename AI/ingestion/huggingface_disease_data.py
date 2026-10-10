"""
HarvestWindow Phase AI-1: Hugging Face Crop Disease Image Dataset Inspection & Metadata Inventory
Inspects DigiGreen/Crop_Disease_Images features, splits, and labels without heavy image downloading.
"""
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import text

from .normalize import clean_text
from .provenance import (
    get_db_session,
    generate_id,
    get_or_create_data_source,
    create_import_batch,
    update_import_batch,
)

DATASET_REPO = "DigiGreen/Crop_Disease_Images"
SOURCE_NAME = f"HuggingFace/{DATASET_REPO}"

def inspect_and_catalog_disease_dataset(
    dry_run: bool = False,
    limit: Optional[int] = 200,
) -> Dict[str, Any]:
    """
    Inspect DigiGreen/Crop_Disease_Images metadata and catalog image disease entries into MySQL.
    Uses selective metadata loading to avoid downloading heavy image archives.
    """
    from datasets import load_dataset_builder, load_dataset

    # 1. Builder inspection without downloading files
    builder = load_dataset_builder(DATASET_REPO)
    features_desc = {k: str(v) for k, v in builder.info.features.items()} if builder.info.features else {}

    session = None if dry_run else get_db_session()
    batch_id = None

    if not dry_run:
        source_id = get_or_create_data_source(
            session=session,
            source_name=SOURCE_NAME,
            source_url=f"https://huggingface.co/datasets/{DATASET_REPO}",
            dataset_title="Crop Disease Images Dataset",
            publisher="DigiGreen",
            license_str="Creative Commons / Research",
            geographic_coverage="India & International",
            data_origin="observed",
            verification_status="reference_only",
            notes="Catalog of crop disease field image references and diagnostic symptoms",
        )
        batch_id = create_import_batch(
            session=session,
            dataset_name=DATASET_REPO,
            source_id=source_id,
            status="in_progress",
        )

    rows_read = 0
    rows_accepted = 0
    rows_inserted = 0
    crop_labels = set()
    disease_labels = set()
    insert_buffer = []

    try:
        # Load streaming or slice to inspect labels
        ds = load_dataset(DATASET_REPO, split="train", streaming=True)
        now = datetime.utcnow()

        for item in ds:
            rows_read += 1
            if limit and rows_read > limit:
                break

            crop_name = clean_text(item.get("crop")) or "Unknown"
            diagnosis = clean_text(item.get("diagnosis")) or "Unspecified"
            details = clean_text(item.get("details"))
            country = clean_text(item.get("country"))
            state = clean_text(item.get("state"))
            image_ref = str(item.get("image_file") or f"img_ref_{rows_read}")

            crop_labels.add(crop_name)
            disease_labels.add(diagnosis)
            rows_accepted += 1

            if not dry_run:
                insert_buffer.append({
                    "id": generate_id("dis"),
                    "crop": crop_name,
                    "diagnosis": diagnosis,
                    "details": details,
                    "country": country,
                    "state": state,
                    "imageFileRef": image_ref,
                    "sourceDataset": DATASET_REPO,
                    "now": now,
                })

                if len(insert_buffer) >= 100:
                    session.execute(
                        text("""
                            INSERT INTO crop_disease_metadata
                            (id, crop, diagnosis, details, country, state, imageFileRef, sourceDataset, createdAt)
                            VALUES
                            (:id, :crop, :diagnosis, :details, :country, :state, :imageFileRef, :sourceDataset, :now)
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
                    INSERT INTO crop_disease_metadata
                    (id, crop, diagnosis, details, country, state, imageFileRef, sourceDataset, createdAt)
                    VALUES
                    (:id, :crop, :diagnosis, :details, :country, :state, :imageFileRef, :sourceDataset, :now)
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
                rows_rejected=0,
                rows_inserted=rows_inserted,
                rows_updated=0,
                rows_skipped=0,
                status="completed",
                rejected_details=[],
            )

    except Exception as e:
        if not dry_run and session and batch_id:
            session.rollback()
            update_import_batch(
                session=session,
                batch_id=batch_id,
                rows_read=rows_read,
                rows_accepted=rows_accepted,
                rows_rejected=0,
                rows_inserted=rows_inserted,
                rows_updated=0,
                rows_skipped=0,
                status="failed",
                error_summary=str(e),
                rejected_details=[],
            )
        raise e
    finally:
        if session:
            session.close()

    return {
        "dataset": DATASET_REPO,
        "dry_run": dry_run,
        "features": features_desc,
        "rows_inspected": rows_read,
        "rows_cataloged": rows_inserted if not dry_run else rows_accepted,
        "unique_crops_found": len(crop_labels),
        "crops": sorted(list(crop_labels)),
        "unique_diseases_found": len(disease_labels),
        "sample_diseases": sorted(list(disease_labels))[:15],
    }
