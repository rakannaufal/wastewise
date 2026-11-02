"""Architecture and preprocessing shared by training and serving."""

import json
from pathlib import Path

import torch
from torch import nn
from torchvision import models, transforms

ROOT = Path(__file__).resolve().parents[2]
CATEGORIES = json.loads((ROOT / "shared/categories.json").read_text())
CLASSES = [c["id"] for c in CATEGORIES]
PREPROCESS = {
    "resize": 256,
    "crop": 224,
    "mean": [0.485, 0.456, 0.406],
    "std": [0.229, 0.224, 0.225],
}


def transform(training=False):
    spatial = (
        [
            transforms.RandomResizedCrop(224, scale=(0.75, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(0.15, 0.15, 0.15, 0.03),
        ]
        if training
        else [transforms.Resize(256), transforms.CenterCrop(224)]
    )
    return transforms.Compose(
        [
            *spatial,
            transforms.ToTensor(),
            transforms.Normalize(PREPROCESS["mean"], PREPROCESS["std"]),
        ]
    )


def make_model(pretrained=False):
    net = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT if pretrained else None)
    net.classifier = nn.Sequential(nn.Dropout(0.25), nn.Linear(1280, len(CLASSES)))
    return net


def load_model(path, device="cpu"):
    checkpoint = torch.load(path, map_location="cpu", weights_only=True)
    if checkpoint["classes"] != CLASSES or checkpoint["preprocess"] != PREPROCESS:
        raise ValueError("Checkpoint class mapping or preprocessing mismatch")
    net = make_model()
    net.load_state_dict(checkpoint["state_dict"])
    return net.to(device).eval(), checkpoint
