"""
Deterministic Preprocessing & Data Augmentation Pipelines
Ensures identical normalization and tensor conversions between training and inference.
"""
from torchvision import transforms
from PIL import Image
import torch

from .config import (
    IMAGE_SIZE,
    IMAGE_RESIZE,
    IMAGENET_MEAN,
    IMAGENET_STD
)

def get_inference_transform() -> transforms.Compose:
    """
    Standard deterministic evaluation transform.
    Resize -> CenterCrop -> ToTensor -> Normalize
    """
    return transforms.Compose([
        transforms.Resize(IMAGE_RESIZE, interpolation=transforms.InterpolationMode.BILINEAR),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])

def get_training_transform() -> transforms.Compose:
    """
    Training transform with mild, biologically sound data augmentations.
    """
    return transforms.Compose([
        transforms.Resize(IMAGE_RESIZE, interpolation=transforms.InterpolationMode.BILINEAR),
        transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.85, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])

def preprocess_pil_image(image: Image.Image) -> torch.Tensor:
    """
    Preprocesses a decoded PIL RGB image into a 4D batch tensor (1, 3, 224, 224) ready for inference.
    """
    if image.mode != "RGB":
        image = image.convert("RGB")
    transform = get_inference_transform()
    tensor = transform(image)
    return tensor.unsqueeze(0)  # Add batch dimension
