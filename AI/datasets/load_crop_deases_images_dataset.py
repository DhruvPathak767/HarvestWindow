"""
HarvestWindow Phase AI-1: Crop Disease Image Dataset Inspector & Loader
Repository ID: DigiGreen/Crop_Disease_Images
"""
import sys
import argparse
from datasets import load_dataset_builder, load_dataset

DATASET_REPO = "DigiGreen/Crop_Disease_Images"

def inspect_dataset(split: str = "train", limit: int = 5, streaming: bool = True):
    print(f"Inspecting Hugging Face dataset: '{DATASET_REPO}'...")
    builder = load_dataset_builder(DATASET_REPO)
    print(f"Dataset Description: {builder.info.description or 'Crop Disease Image Collection'}")
    print(f"Features: {list(builder.info.features.keys()) if builder.info.features else 'N/A'}")

    print(f"\nLoading metadata slice from '{DATASET_REPO}' (split: {split}, streaming: {streaming})...")
    ds = load_dataset(DATASET_REPO, split=split, streaming=streaming)

    print(f"Sample records:")
    crops = set()
    diagnoses = set()
    for i, item in enumerate(ds):
        if i >= limit:
            break
        c = item.get("crop")
        d = item.get("diagnosis")
        if c: crops.add(c)
        if d: diagnoses.add(d)
        print(f"  [{i+1}] Crop={c}, Diagnosis={d}, State={item.get('state')}, Country={item.get('country')}")

    return ds

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inspect DigiGreen/Crop_Disease_Images dataset without full download")
    parser.add_argument("--split", default="train", help="Dataset split to inspect")
    parser.add_argument("--limit", type=int, default=5, help="Number of records to preview")
    parser.add_argument("--catalog", action="store_true", help="Catalog disease metadata inventory into HarvestWindow MySQL")
    args = parser.parse_args()

    ds = inspect_dataset(split=args.split, limit=args.limit)

    if args.catalog:
        import os
        sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
        from ingestion.huggingface_disease_data import inspect_and_catalog_disease_dataset
        print("\nCataloging disease image metadata into database...")
        res = inspect_and_catalog_disease_dataset(dry_run=False, limit=500)
        print(f"Cataloging complete: {res}")