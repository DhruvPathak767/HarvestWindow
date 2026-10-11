"""
PyTorch Dataset and Data Partitioning Module for Crop Health Training
Downloads and caches balanced training, validation, and test image sets from Hugging Face Hub.
"""
import os
import shutil
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from huggingface_hub import HfApi, hf_hub_download

from ..config import DATASETS_DIR
from ..preprocessing import get_training_transform, get_inference_transform
from ..class_registry import get_all_classes

DATASET_CACHE_DIR = DATASETS_DIR / "plant_disease_cache"
REPO_ID = "Dipra444/plant-leaf-disease-jharkhand"

class PlantDiseaseDataset(Dataset):
    """
    In-memory or filesystem-backed dataset for plant disease image classification.
    """
    def __init__(self, samples: List[Tuple[Any, int]], transform=None):
        self.samples = samples
        self.transform = transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        img_item, label = self.samples[idx]

        if isinstance(img_item, (str, Path)):
            image = Image.open(img_item).convert("RGB")
        elif isinstance(img_item, Image.Image):
            image = img_item.convert("RGB")
        else:
            raise ValueError(f"Unsupported sample type: {type(img_item)}")

        if self.transform:
            image = self.transform(image)

        return image, label

def load_or_cache_training_data(
    dataset_name: str = REPO_ID,
    samples_per_class: int = 15
) -> Tuple[List[Tuple[str, int]], List[str]]:
    """
    Downloads and caches a balanced set of images across all 25 classes.
    Uses multi-threaded hf_hub_download for high speed and reliability.
    """
    DATASET_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    class_names = sorted(get_all_classes())
    num_classes = len(class_names)

    # Check existing cache
    cached_samples = []
    classes_cached = 0
    for c_idx, c_name in enumerate(class_names):
        c_dir = DATASET_CACHE_DIR / c_name
        if c_dir.exists():
            imgs = list(c_dir.glob("*.jpg")) + list(c_dir.glob("*.JPG"))
            if len(imgs) >= samples_per_class:
                classes_cached += 1
                for img_path in imgs[:samples_per_class]:
                    cached_samples.append((str(img_path), c_idx))

    if classes_cached == num_classes:
        print(f"Loaded {len(cached_samples)} cached crop disease images across {num_classes} classes.")
        return cached_samples, class_names

    print(f"Fetching repo file listing from '{dataset_name}'...")
    api = HfApi()
    all_repo_files = api.list_repo_files(dataset_name, repo_type="dataset")

    # Map files by class
    class_to_files: Dict[str, List[str]] = {c: [] for c in class_names}
    for file_path in all_repo_files:
        if not (file_path.endswith(".JPG") or file_path.endswith(".jpg")):
            continue
        parts = file_path.split("/")
        if len(parts) >= 2:
            class_folder = parts[-2]
            if class_folder in class_to_files:
                class_to_files[class_folder].append(file_path)

    # Create directories and prepare download tasks
    download_tasks = []
    for c_idx, c_name in enumerate(class_names):
        c_dir = DATASET_CACHE_DIR / c_name
        c_dir.mkdir(parents=True, exist_ok=True)
        available_files = class_to_files.get(c_name, [])
        selected_files = available_files[:samples_per_class]

        for file_path in selected_files:
            filename = Path(file_path).name
            target_file = c_dir / filename
            if not target_file.exists():
                download_tasks.append((file_path, str(target_file), c_idx))

    print(f"Downloading {len(download_tasks)} balanced image files across {num_classes} classes...")

    def download_file(item):
        repo_file, dest_file, c_idx = item
        try:
            downloaded_path = hf_hub_download(
                repo_id=dataset_name,
                filename=repo_file,
                repo_type="dataset",
                local_dir=str(DATASET_CACHE_DIR / "_temp"),
                local_dir_use_symlinks=False
            )
            shutil.copyfile(downloaded_path, dest_file)
            return (dest_file, c_idx)
        except Exception as exc:
            print(f"Warning: Failed downloading {repo_file}: {exc}")
            return None

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(download_file, task) for task in download_tasks]
        for future in as_completed(futures):
            future.result()

    # Clean up temp
    temp_dir = DATASET_CACHE_DIR / "_temp"
    if temp_dir.exists():
        shutil.rmtree(temp_dir, ignore_errors=True)

    # Re-collect all cached files
    cached_samples.clear()
    for c_idx, c_name in enumerate(class_names):
        c_dir = DATASET_CACHE_DIR / c_name
        imgs = list(c_dir.glob("*.jpg")) + list(c_dir.glob("*.JPG"))
        for img_path in imgs[:samples_per_class]:
            cached_samples.append((str(img_path), c_idx))

    print(f"Dataset preparation complete: {len(cached_samples)} images across {num_classes} classes.")
    return cached_samples, class_names
