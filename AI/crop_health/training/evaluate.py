"""
Standalone Model Evaluation for Crop Health Engine
Computes precision, recall, F1, latency, and confusion matrix on held-out test data.
"""
import os
import json
import time
from pathlib import Path
import numpy as np
import torch
import torchvision.models as models
from torchvision.models import MobileNet_V3_Small_Weights
from torch.utils.data import DataLoader
from sklearn.metrics import classification_report, confusion_matrix, precision_score, recall_score, f1_score

from ..config import MODEL_PATH, CLASS_MAPPING_PATH, METADATA_PATH, REPORTS_DIR
from ..preprocessing import get_inference_transform
from .dataset import PlantDiseaseDataset, load_or_cache_training_data
from .train import build_model

def evaluate_model() -> dict:
    if not MODEL_PATH.exists() or not CLASS_MAPPING_PATH.exists():
        raise FileNotFoundError(f"Model or class mapping not found in artifacts. Train model first.")

    with open(CLASS_MAPPING_PATH, "r") as f:
        class_mapping = json.load(f)

    class_names = [class_mapping["index_to_class"][str(i)] for i in range(class_mapping["total_classes"])]
    num_classes = len(class_names)

    # Load dataset
    all_samples, _ = load_or_cache_training_data()
    from sklearn.model_selection import train_test_split
    labels = [s[1] for s in all_samples]
    _, rem_samples = train_test_split(all_samples, test_size=0.20, stratify=labels, random_state=42)
    rem_labels = [s[1] for s in rem_samples]
    _, test_samples = train_test_split(rem_samples, test_size=0.50, stratify=rem_labels, random_state=42)

    test_ds = PlantDiseaseDataset(test_samples, transform=get_inference_transform())
    test_loader = DataLoader(test_ds, batch_size=32, shuffle=False)

    device = torch.device("cpu")
    model = build_model(num_classes).to(device)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    model.eval()

    y_true = []
    y_pred = []
    latencies = []

    with torch.no_grad():
        for images, targets in test_loader:
            t0 = time.time()
            outputs = model(images)
            latencies.append((time.time() - t0) * 1000.0 / images.size(0))
            preds = outputs.argmax(dim=1)
            y_true.extend(targets.tolist())
            y_pred.extend(preds.tolist())

    acc = float(np.mean(np.array(y_true) == np.array(y_pred)))
    prec = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
    rec = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
    f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    avg_latency = float(np.mean(latencies))

    eval_result = {
        "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "test_samples_count": len(test_samples),
        "test_accuracy": round(acc, 4),
        "macro_precision": round(prec, 4),
        "macro_recall": round(rec, 4),
        "macro_f1": round(f1, 4),
        "mean_latency_ms": round(avg_latency, 2),
        "classes_evaluated": num_classes
    }

    report_path = REPORTS_DIR / "crop_health_model_metrics.json"
    with open(report_path, "w") as f:
        json.dump(eval_result, f, indent=2)

    print(f"Evaluation report written to {report_path}")
    return eval_result

if __name__ == "__main__":
    evaluate_model()
