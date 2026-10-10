"""
HarvestWindow Phase AI-1: Indian Crop Yield Prediction Dataset Loader
Repository ID: dhyann2815/india-crop-yield-prediction
"""
import sys
import argparse
from datasets import load_dataset

DATASET_REPO = "dhyann2815/india-crop-yield-prediction"

def load_and_inspect(split: str = "train", limit: int = 5):
    print(f"Loading Hugging Face dataset: '{DATASET_REPO}' (split: {split})...")
    ds = load_dataset(DATASET_REPO, split=split)
    print(f"Dataset successfully loaded.")
    print(f"Total rows: {len(ds)}")
    print(f"Features: {list(ds.features.keys())}")
    print("\nSample records:")
    for i, row in enumerate(ds):
        if i >= limit:
            break
        print(f"  [{i+1}] Year={row.get('Year')}, State={row.get('State')}, Crop={row.get('Crop')}, "
              f"Season={row.get('Season')}, Area={row.get('Area')}, Production={row.get('Production')}, "
              f"Yield={row.get('Yield')}")
    return ds

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load and inspect Indian Crop Yield Prediction Dataset")
    parser.add_argument("--split", default="train", help="Dataset split to load")
    parser.add_argument("--limit", type=int, default=5, help="Number of sample records to display")
    parser.add_argument("--ingest", action="store_true", help="Ingest into HarvestWindow MySQL database")
    args = parser.parse_args()

    ds = load_and_inspect(split=args.split, limit=args.limit)

    if args.ingest:
        import os
        sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
        from ingestion.huggingface_yield_data import ingest_huggingface_yield_dataset
        print("\nIngesting dataset into MySQL database...")
        res = ingest_huggingface_yield_dataset(dry_run=False, limit=None, split=args.split)
        print(f"Ingestion complete: {res}")