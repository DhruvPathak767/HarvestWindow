"""
HarvestWindow Phase AI-1: Master Ingestion Orchestrator CLI
Runs data ingestion across verified crop calendars, Kaggle production data, and Hugging Face datasets.
"""
import os
import sys
import json
import argparse
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ingestion.crop_calendar_import import import_crop_calendar_csv
from ingestion.kaggle_crop_data import ingest_kaggle_crop_production
from ingestion.huggingface_yield_data import ingest_huggingface_yield_dataset
from ingestion.huggingface_disease_data import inspect_and_catalog_disease_dataset

def main():
    parser = argparse.ArgumentParser(description="HarvestWindow Agricultural Data Ingestion Pipeline")
    parser.add_argument(
        "--source",
        choices=["calendar", "kaggle", "hf_yield", "hf_disease", "all"],
        default="calendar",
        help="Data source to ingest (default: calendar)",
    )
    parser.add_argument(
        "--input",
        type=str,
        default=None,
        help="Input CSV path (optional override for calendar or kaggle sources)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run validation and normalization without writing to database",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum rows to process",
    )
    parser.add_argument(
        "--report",
        type=str,
        default=None,
        help="File path to save the JSON ingestion report",
    )

    args = parser.parse_args()

    results = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "dry_run": args.dry_run,
        "source": args.source,
        "limit": args.limit,
        "runs": {},
    }

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    # 1. Verified Crop Calendar Ingestion
    if args.source in ("calendar", "all"):
        cal_path = args.input or os.path.join(base_dir, "schemas", "verified_indian_crop_calendar.csv")
        print(f"\n[Ingestion] Running Crop Calendar Ingestion from: {cal_path}")
        print(f"            Dry run: {args.dry_run} | Limit: {args.limit}")
        res = import_crop_calendar_csv(cal_path, dry_run=args.dry_run, limit=args.limit)
        results["runs"]["calendar"] = res
        print(f"            Rows Read: {res['rows_read']} | Accepted: {res['rows_accepted']} | "
              f"Rejected: {res['rows_rejected']} | Inserted: {res['rows_inserted']}")

    # 2. Kaggle Historical Crop Production Ingestion
    if args.source in ("kaggle", "all"):
        kaggle_path = args.input or os.path.join(base_dir, "datasets", "crop_production.csv")
        # Default limit to 5000 rows if 'all' to prevent hour-long CLI runs, unless explicitly specified
        kaggle_limit = args.limit if args.limit is not None else (5000 if args.source == "all" else None)
        print(f"\n[Ingestion] Running Kaggle Crop Production Ingestion from: {kaggle_path}")
        print(f"            Dry run: {args.dry_run} | Limit: {kaggle_limit}")
        res = ingest_kaggle_crop_production(kaggle_path, dry_run=args.dry_run, limit=kaggle_limit)
        results["runs"]["kaggle"] = res
        print(f"            Rows Read: {res['rows_read']} | Accepted: {res['rows_accepted']} | "
              f"Rejected: {res['rows_rejected']} | Inserted: {res['rows_inserted']}")

    # 3. Hugging Face Crop Yield Ingestion
    if args.source in ("hf_yield", "all"):
        hf_limit = args.limit if args.limit is not None else 1000
        print(f"\n[Ingestion] Running Hugging Face Crop Yield Ingestion")
        print(f"            Dry run: {args.dry_run} | Limit: {hf_limit}")
        res = ingest_huggingface_yield_dataset(dry_run=args.dry_run, limit=hf_limit)
        results["runs"]["hf_yield"] = res
        print(f"            Rows Read: {res['rows_read']} | Accepted: {res['rows_accepted']} | "
              f"Rejected: {res['rows_rejected']} | Inserted: {res['rows_inserted']}")

    # 4. Hugging Face Disease Metadata Cataloging
    if args.source in ("hf_disease", "all"):
        dis_limit = args.limit if args.limit is not None else 200
        print(f"\n[Ingestion] Running Hugging Face Crop Disease Metadata Inspection")
        print(f"            Dry run: {args.dry_run} | Limit: {dis_limit}")
        res = inspect_and_catalog_disease_dataset(dry_run=args.dry_run, limit=dis_limit)
        results["runs"]["hf_disease"] = res
        print(f"            Inspected: {res['rows_inspected']} | Cataloged: {res['rows_cataloged']} | "
              f"Unique Crops: {res['unique_crops_found']}")

    # Save summary report if requested
    report_file = args.report or os.path.join(base_dir, "reports", "ingestion_summary.json")
    os.makedirs(os.path.dirname(report_file), exist_ok=True)
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\n[Report] Ingestion summary saved to: {report_file}")

if __name__ == "__main__":
    main()
