"""
Transfer Learning Training Pipeline for Crop Disease Detection Engine
Uses MobileNetV3-Small pre-trained on ImageNet, fine-tuned on plant disease dataset.
"""
import os
import json
import time
from datetime import datetime, timezone
from pathlib import Path
import random
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
import torchvision.models as models
from torchvision.models import MobileNet_V3_Small_Weights
from sklearn.model_selection import train_test_split

from ..config import (
    MODEL_PATH,
    CLASS_MAPPING_PATH,
    METADATA_PATH,
    ARTIFACTS_DIR,
    REPORTS_DIR,
    IMAGE_SIZE,
    SUPPORTED_CROPS
)
from ..preprocessing import get_training_transform, get_inference_transform
from .dataset import PlantDiseaseDataset, load_or_cache_training_data

def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)

def build_model(num_classes: int) -> nn.Module:
    """
    Initializes MobileNetV3-Small with pretrained weights and customized classifier head.
    """
    model = models.mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.DEFAULT)
    # The classifier structure in mobilenet_v3_small is:
    # (0): Linear(in_features=576, out_features=1024, bias=True)
    # (1): Hardswish()
    # (2): Dropout(p=0.2, inplace=True)
    # (3): Linear(in_features=1024, out_features=1000, bias=True)
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, num_classes)
    return model

def train_crop_health_model(
    samples_per_class: int = 12,
    epochs: int = 6,
    batch_size: int = 16,
    learning_rate: float = 0.001
) -> dict:
    set_seed(42)
    device = torch.device("cpu")
    print(f"Starting Crop Health Training on device: {device}...")

    # 1. Load / cache dataset
    all_samples, class_names = load_or_cache_training_data(
        samples_per_class=samples_per_class
    )
    num_classes = len(class_names)
    print(f"Total samples: {len(all_samples)} across {num_classes} classes.")

    # 2. Stratified train/val/test split (80% train, 10% val, 10% test)
    labels = [s[1] for s in all_samples]
    train_samples, rem_samples = train_test_split(
        all_samples, test_size=0.20, stratify=labels, random_state=42
    )
    rem_labels = [s[1] for s in rem_samples]
    val_samples, test_samples = train_test_split(
        rem_samples, test_size=0.50, stratify=rem_labels, random_state=42
    )

    print(f"Data Splits: Train={len(train_samples)}, Val={len(val_samples)}, Test={len(test_samples)}")

    # 3. Create datasets and dataloaders
    train_ds = PlantDiseaseDataset(train_samples, transform=get_training_transform())
    val_ds = PlantDiseaseDataset(val_samples, transform=get_inference_transform())
    test_ds = PlantDiseaseDataset(test_samples, transform=get_inference_transform())

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)

    # 4. Model and optimizer setup
    model = build_model(num_classes).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_val_acc = 0.0
    best_state_dict = None
    start_time = time.time()

    # 5. Training loop
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        train_correct = 0
        total_train = 0

        for images, targets in train_loader:
            images = images.to(device)
            targets = targets.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            preds = outputs.argmax(dim=1)
            train_correct += (preds == targets).sum().item()
            total_train += images.size(0)

        scheduler.step()
        epoch_train_loss = train_loss / total_train
        epoch_train_acc = train_correct / total_train

        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        total_val = 0

        with torch.no_grad():
            for images, targets in val_loader:
                images = images.to(device)
                targets = targets.to(device)
                outputs = model(images)
                loss = criterion(outputs, targets)

                val_loss += loss.item() * images.size(0)
                preds = outputs.argmax(dim=1)
                val_correct += (preds == targets).sum().item()
                total_val += images.size(0)

        epoch_val_loss = val_loss / total_val
        epoch_val_acc = val_correct / total_val

        print(
            f"Epoch {epoch}/{epochs} - "
            f"Train Loss: {epoch_train_loss:.4f}, Train Acc: {epoch_train_acc:.4f} | "
            f"Val Loss: {epoch_val_loss:.4f}, Val Acc: {epoch_val_acc:.4f}"
        )

        if epoch_val_acc >= best_val_acc:
            best_val_acc = epoch_val_acc
            best_state_dict = {k: v.cpu() for k, v in model.state_dict().items()}

    train_duration_sec = time.time() - start_time
    print(f"Training completed in {train_duration_sec:.1f}s. Best Val Acc: {best_val_acc:.4f}")

    # 6. Save model artifact and class mapping
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    torch.save(best_state_dict, MODEL_PATH)
    print(f"Saved model weights to {MODEL_PATH}")

    class_mapping = {
        "index_to_class": {str(i): name for i, name in enumerate(class_names)},
        "class_to_index": {name: i for i, name in enumerate(class_names)},
        "total_classes": num_classes
    }
    with open(CLASS_MAPPING_PATH, "w") as f:
        json.dump(class_mapping, f, indent=2)
    print(f"Saved class mapping to {CLASS_MAPPING_PATH}")

    # 7. Evaluate on held-out test set
    model.load_state_dict(best_state_dict)
    model.eval()
    test_correct = 0
    total_test = 0
    y_true = []
    y_pred = []
    latency_records = []

    with torch.no_grad():
        for images, targets in test_loader:
            t0 = time.time()
            outputs = model(images)
            latency_records.append((time.time() - t0) * 1000.0 / images.size(0))

            preds = outputs.argmax(dim=1)
            test_correct += (preds == targets).sum().item()
            total_test += images.size(0)
            y_true.extend(targets.tolist())
            y_pred.extend(preds.tolist())

    test_accuracy = test_correct / total_test
    avg_latency_ms = float(np.mean(latency_records))

    from sklearn.metrics import precision_score, recall_score, f1_score
    macro_precision = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
    macro_recall = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
    macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))

    metrics = {
        "test_samples_count": total_test,
        "test_accuracy": round(test_accuracy, 4),
        "macro_precision": round(macro_precision, 4),
        "macro_recall": round(macro_recall, 4),
        "macro_f1": round(macro_f1, 4),
        "mean_inference_latency_ms": round(avg_latency_ms, 2),
        "model_artifact_size_mb": round(os.path.getsize(MODEL_PATH) / (1024 * 1024), 2)
    }

    print("Held-out Test Evaluation:")
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    # 8. Save model metadata
    metadata = {
        "model_name": "HarvestWindow Crop Disease & Health Detection Engine",
        "model_version": "1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "architecture": "MobileNetV3-Small (Transfer Learning)",
        "framework": "PyTorch 2.14 / Torchvision 0.29",
        "num_classes": num_classes,
        "input_dimensions": f"{IMAGE_SIZE}x{IMAGE_SIZE}x3",
        "training_samples": len(train_samples),
        "validation_samples": len(val_samples),
        "test_samples": len(test_samples),
        "training_duration_seconds": round(train_duration_sec, 1),
        "supported_crops": SUPPORTED_CROPS,
        "evaluation_metrics": metrics,
        "readiness_status": "READY" if test_accuracy >= 0.70 else "LIMITED"
    }

    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved model metadata to {METADATA_PATH}")

    # Save to reports as well
    metrics_report_path = REPORTS_DIR / "crop_health_model_metrics.json"
    with open(metrics_report_path, "w") as f:
        json.dump({
            "model_metadata": metadata,
            "metrics": metrics
        }, f, indent=2)
    print(f"Saved evaluation metrics to {metrics_report_path}")

    return metadata

if __name__ == "__main__":
    train_crop_health_model()

