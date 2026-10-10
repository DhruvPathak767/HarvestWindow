"""
HarvestWindow Phase AI-1: Dataset Inspector CLI
Audits and displays summary statistics for all 3 dataset assets:
1. Local Kaggle CSV (crop_production.csv)
2. Hugging Face Yield Dataset (dhyann2815/india-crop-yield-prediction)
3. Hugging Face Disease Images Dataset (DigiGreen/Crop_Disease_Images)
"""
import os
import sys
import argparse
import pandas as pd
from datasets import load_dataset_builder, load_dataset

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ingestion.normalize import clean_text

def inspect_kaggle_csv(csv_path: str):
    print("=" * 70)
    print(" 1. KAGGLE CROP PRODUCTION CSV INSPECTION")
    print("=" * 70)
    if not os.path.exists(csv_path):
        print(f"Error: File not found at {csv_path}")
        return

    print(f"File: {csv_path}")
    file_size_mb = round(os.path.getsize(csv_path) / (1024 * 1024), 2)
    print(f"File Size: {file_size_mb} MB")

    # Read a sample chunk to compute shape & types
    df_sample = pd.read_csv(csv_path, nrows=1000)
    print(f"Columns ({len(df_sample.columns)}): {list(df_sample.columns)}")
    print("\nColumn Data Types & Non-Null Ratios (first 1,000 rows):")
    for col in df_sample.columns:
        non_nulls = df_sample[col].notnull().sum()
        dtype = str(df_sample[col].dtype)
        unique_cnt = df_sample[col].nunique()
        print(f"  - {col:<18} | Type: {dtype:<10} | Non-Null: {non_nulls}/1000 | Unique: {unique_cnt}")

    print("\nSample Rows:")
    print(df_sample.head(3).to_string(index=False))

def inspect_hf_yield():
    print("\n" + "=" * 70)
    print(" 2. HUGGING FACE YIELD DATASET INSPECTION")
    print("    Repo: dhyann2815/india-crop-yield-prediction")
    print("=" * 70)
    repo = "dhyann2815/india-crop-yield-prediction"
    builder = load_dataset_builder(repo)
    print(f"Features: {list(builder.info.features.keys()) if builder.info.features else 'N/A'}")

    ds = load_dataset(repo, split="train")
    print(f"Total Rows: {len(ds)}")
    df = ds.to_pandas().head(3)
    print("\nSample Rows:")
    print(df.to_string(index=False))

def inspect_hf_disease():
    print("\n" + "=" * 70)
    print(" 3. HUGGING FACE CROP DISEASE IMAGE DATASET INSPECTION")
    print("    Repo: DigiGreen/Crop_Disease_Images")
    print("=" * 70)
    repo = "DigiGreen/Crop_Disease_Images"
    builder = load_dataset_builder(repo)
    print(f"Features: {list(builder.info.features.keys()) if builder.info.features else 'N/A'}")

    ds = load_dataset(repo, split="train", streaming=True)
    crops = set()
    diagnoses = set()
    samples = []
    for i, item in enumerate(ds):
        if i >= 10:
            break
        c = clean_text(item.get("crop"))
        d = clean_text(item.get("diagnosis"))
        if c: crops.add(c)
        if d: diagnoses.add(d)
        samples.append({
            "crop": c,
            "diagnosis": d,
            "state": clean_text(item.get("state")),
            "country": clean_text(item.get("country")),
        })

    print(f"Sample Records Inspected (streaming mode, no binary downloads):")
    for s in samples[:4]:
        print(f"  Crop: {s['crop']} | Diagnosis: {s['diagnosis']} | State: {s['state']} | Country: {s['country']}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inspect HarvestWindow datasets")
    parser.add_argument("--kaggle-path", default=os.path.join(os.path.dirname(__file__), "..", "datasets", "crop_production.csv"))
    parser.add_argument("--skip-hf", action="store_true", help="Skip Hugging Face remote inspections")
    args = parser.parse_args()

    inspect_kaggle_csv(args.kaggle_path)
    if not args.skip_hf:
        inspect_hf_yield()
        inspect_hf_disease()
