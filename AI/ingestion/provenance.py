"""
HarvestWindow Phase AI-1: Provenance and Batch Tracking
Maintains audit logs, data origin metadata, and import batch statistics in MySQL.
"""
import os
import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# Load environment from current directory or backend directory
load_dotenv()
backend_env_path = os.path.join(os.path.dirname(__file__), "..", "..", "backend", ".env")
if os.path.exists(backend_env_path):
    load_dotenv(backend_env_path)

def get_db_url() -> str:
    """Retrieve MySQL connection string from environment and format for PyMySQL."""
    url = os.getenv("DATABASE_URL", "mysql://root:root@localhost:3306/harvestwindow")
    # Convert standard prisma mysql:// to sqlalchemy mysql+pymysql://
    if url.startswith("mysql://") and not url.startswith("mysql+pymysql://"):
        url = url.replace("mysql://", "mysql+pymysql://", 1)
    return url

_engine = None
_SessionFactory = None

def get_db_session():
    """Get a SQLAlchemy database session connected to HarvestWindow MySQL."""
    global _engine, _SessionFactory
    if _engine is None:
        db_url = get_db_url()
        _engine = create_engine(db_url, pool_pre_ping=True, pool_size=5, max_overflow=10)
        _SessionFactory = sessionmaker(bind=_engine)
    return _SessionFactory()

def generate_id(prefix: str = "src") -> str:
    """Generate a cuid/uuid string for database keys."""
    return f"{prefix}_{uuid.uuid4().hex[:20]}"

def get_or_create_data_source(
    session,
    source_name: str,
    source_url: Optional[str] = None,
    dataset_title: Optional[str] = None,
    publisher: Optional[str] = None,
    license_str: Optional[str] = None,
    geographic_coverage: Optional[str] = "India",
    data_origin: str = "official_reference",
    verification_status: str = "verified",
    notes: Optional[str] = None,
) -> str:
    """Find existing or insert new AgriculturalDataSource record; returns ID."""
    row = session.execute(
        text("SELECT id FROM agricultural_data_sources WHERE sourceName = :name LIMIT 1"),
        {"name": source_name},
    ).fetchone()

    if row:
        return row[0]

    source_id = generate_id("src")
    now = datetime.utcnow()
    session.execute(
        text("""
            INSERT INTO agricultural_data_sources 
            (id, sourceName, sourceUrl, datasetTitle, publisher, license, geographicCoverage, 
             dataOrigin, verificationStatus, notes, createdAt, updatedAt)
            VALUES 
            (:id, :sourceName, :sourceUrl, :datasetTitle, :publisher, :license, :geographicCoverage,
             :dataOrigin, :verificationStatus, :notes, :now, :now)
        """),
        {
            "id": source_id,
            "sourceName": source_name,
            "sourceUrl": source_url,
            "datasetTitle": dataset_title,
            "publisher": publisher,
            "license": license_str,
            "geographicCoverage": geographic_coverage,
            "dataOrigin": data_origin,
            "verificationStatus": verification_status,
            "notes": notes,
            "now": now,
        },
    )
    session.commit()
    return source_id

def create_import_batch(
    session,
    dataset_name: str,
    source_id: Optional[str] = None,
    status: str = "in_progress",
) -> str:
    """Create a new import batch record to track ingestion progress and rejection counts."""
    batch_id = generate_id("batch")
    now = datetime.utcnow()
    session.execute(
        text("""
            INSERT INTO agricultural_import_batches
            (id, sourceId, datasetName, startedAt, status, rowsRead, rowsAccepted, 
             rowsRejected, rowsInserted, rowsUpdated, rowsSkipped, createdAt)
            VALUES
            (:id, :sourceId, :datasetName, :now, :status, 0, 0, 0, 0, 0, 0, :now)
        """),
        {
            "id": batch_id,
            "sourceId": source_id,
            "datasetName": dataset_name,
            "now": now,
            "status": status,
        },
    )
    session.commit()
    return batch_id

def update_import_batch(
    session,
    batch_id: str,
    rows_read: int,
    rows_accepted: int,
    rows_rejected: int,
    rows_inserted: int,
    rows_updated: int,
    rows_skipped: int,
    status: str = "completed",
    error_summary: Optional[str] = None,
    rejected_details: Optional[list] = None,
):
    """Finalize or update batch metrics and rejected row details."""
    now = datetime.utcnow()
    details_str = json.dumps(rejected_details[:100], indent=2) if rejected_details else None

    session.execute(
        text("""
            UPDATE agricultural_import_batches
            SET completedAt = :now,
                rowsRead = :rowsRead,
                rowsAccepted = :rowsAccepted,
                rowsRejected = :rowsRejected,
                rowsInserted = :rowsInserted,
                rowsUpdated = :rowsUpdated,
                rowsSkipped = :rowsSkipped,
                status = :status,
                errorSummary = :errorSummary,
                rejectedDetails = :rejectedDetails
            WHERE id = :id
        """),
        {
            "id": batch_id,
            "now": now,
            "rowsRead": rows_read,
            "rowsAccepted": rows_accepted,
            "rowsRejected": rows_rejected,
            "rowsInserted": rows_inserted,
            "rowsUpdated": rows_updated,
            "rowsSkipped": rows_skipped,
            "status": status,
            "errorSummary": error_summary,
            "rejectedDetails": details_str,
        },
    )
    session.commit()
