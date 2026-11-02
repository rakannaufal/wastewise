"""Train on train/validation only; the test set is opened by evaluate.py."""

import argparse
import copy
import hashlib
import json
import random
import time

import numpy as np
import torch
from PIL import Image
from sklearn.metrics import accuracy_score, f1_score
from torch import nn
from torch.utils.data import DataLoader, Dataset, TensorDataset

from ml.common import CLASSES, PREPROCESS, ROOT, make_model, transform


class Images(Dataset):
    def __init__(self, split, training=False):
        self.rows = [
            json.loads(line)
            for line in (ROOT / f"backend-ml/dataset/{split}.jsonl").read_text().splitlines()
        ]
        self.transform = transform(training)

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, index):
        row = self.rows[index]
        with Image.open(ROOT / "garbage_classification" / row["path"]) as image:
            value = self.transform(image.convert("RGB"))
        return value, CLASSES.index(row["category"])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--finetune", type=int, default=0)
    parser.add_argument("--batch-size", type=int, default=16)
    args = parser.parse_args()
    if args.epochs < 1 or args.finetune < 0 or args.batch_size < 1:
        parser.error("epochs/batch-size must be positive; finetune must be nonnegative")
    torch.manual_seed(42)
    random.seed(42)
    np.random.seed(42)
    torch.set_num_threads(4)
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print("device", device, flush=True)
    out = ROOT / "backend-ml/ml/models"
    out.mkdir(parents=True, exist_ok=True)
    cache = ROOT / "backend-ml/outputs/features"
    cache.mkdir(parents=True, exist_ok=True)
    net = make_model(True).to(device)

    def loader(split, training=False):
        return DataLoader(
            Images(split, training), batch_size=args.batch_size, shuffle=training, num_workers=2
        )

    train_loader, val_loader = loader("train", True), loader("val")

    def extract(data, name):
        path = cache / f"{name}.pt"
        audit = json.loads((ROOT / "backend-ml/dataset/audit.json").read_text())
        signature = hashlib.sha256(
            json.dumps(
                {
                    "dataset": audit["dataset_sha256"],
                    "split": audit["val_sha256" if name == "val" else "train_sha256"],
                    "preprocess": PREPROCESS,
                    "view": name,
                    "seed": 42,
                    "backbone": "MobileNet_V2_Weights.DEFAULT",
                },
                sort_keys=True,
            ).encode()
        ).hexdigest()
        if path.exists():
            stored = torch.load(path, weights_only=True)
            if isinstance(stored, dict) and stored.get("signature") == signature:
                return stored["features"]
        xs, ys = [], []
        net.eval()
        with torch.inference_mode():
            for index, (images, labels) in enumerate(data):
                xs.append(net.features(images.to(device)).mean([2, 3]).cpu())
                ys.append(labels)
                if index % 30 == 0:
                    print("extract", name, index, len(data), flush=True)
        result = (torch.cat(xs), torch.cat(ys))
        torch.save({"signature": signature, "features": result}, path)
        return result

    train_x, train_y = extract(loader("train"), "train")
    aug_x, aug_y = extract(train_loader, "train_aug")
    val_x, val_y = extract(val_loader, "val")
    feature_loader = DataLoader(
        TensorDataset(torch.cat([train_x, aug_x]), torch.cat([train_y, aug_y])),
        batch_size=256,
        shuffle=True,
    )
    counts = torch.bincount(train_y, minlength=len(CLASSES)).float()
    criterion = nn.CrossEntropyLoss(
        weight=(counts.sum() / counts).sqrt().to(device), label_smoothing=0.05
    )
    optimizer = torch.optim.AdamW(net.classifier.parameters(), lr=0.002, weight_decay=0.01)
    history, best_score, best_state = [], -1.0, None
    start = time.time()

    def validate(stage, epoch, loss):
        nonlocal best_score, best_state
        net.eval()
        predictions = []
        with torch.inference_mode():
            if stage == "head":
                predictions = net.classifier(val_x.to(device)).argmax(1).cpu().tolist()
            else:
                for images, _ in val_loader:
                    predictions.extend(net(images.to(device)).argmax(1).cpu().tolist())
        accuracy = accuracy_score(val_y, predictions)
        macro = f1_score(val_y, predictions, average="macro")
        history.append(
            {
                "stage": stage,
                "epoch": epoch,
                "train_loss": loss,
                "val_accuracy": accuracy,
                "val_macro_f1": macro,
            }
        )
        print(history[-1], flush=True)
        if macro > best_score:
            best_score = macro
            best_state = copy.deepcopy({k: v.cpu() for k, v in net.state_dict().items()})
        (out / "training_history.json").write_text(json.dumps(history, indent=2))

    for epoch in range(args.epochs):
        net.classifier.train()
        running = 0.0
        for features, labels in feature_loader:
            optimizer.zero_grad()
            loss = criterion(net.classifier(features.to(device)), labels.to(device))
            loss.backward()
            optimizer.step()
            running += loss.item()
        validate("head", epoch + 1, running / len(feature_loader))
    net.load_state_dict(best_state)
    for parameter in net.parameters():
        parameter.requires_grad_(True)
    optimizer = torch.optim.AdamW(net.parameters(), lr=0.00003, weight_decay=0.01)
    for epoch in range(args.finetune):
        net.train()
        # Keep ImageNet running statistics stable for small, imbalanced batches.
        for module in net.modules():
            if isinstance(module, nn.BatchNorm2d):
                module.eval()
        running = 0.0
        for index, (images, labels) in enumerate(train_loader):
            optimizer.zero_grad()
            loss = criterion(net(images.to(device)), labels.to(device))
            loss.backward()
            optimizer.step()
            running += loss.item()
            if index % 50 == 0:
                print("finetune", epoch + 1, index, len(train_loader), flush=True)
        validate("finetune", epoch + 1, running / len(train_loader))
    audit = json.loads((ROOT / "backend-ml/dataset/audit.json").read_text())
    checkpoint = {
        "state_dict": best_state,
        "classes": CLASSES,
        "class_to_idx": {c: i for i, c in enumerate(CLASSES)},
        "preprocess": PREPROCESS,
        "architecture": "mobilenet_v2",
        "version": "wastewise-mobilenetv2-v1",
        "seed": 42,
        "dataset_sha256": audit["dataset_sha256"],
        "split_sha256": {s: audit[f"{s}_sha256"] for s in ("train", "val", "test")},
        "torch_version": str(torch.__version__),
        "best_val_macro_f1": best_score,
        "training_seconds": time.time() - start,
    }
    path = out / "wastewise-v1.pth"
    torch.save(checkpoint, path)
    metadata = {k: v for k, v in checkpoint.items() if k != "state_dict"}
    metadata["checkpoint_sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
    (out / "metadata.json").write_text(json.dumps(metadata, indent=2))
    print("saved", metadata, flush=True)


if __name__ == "__main__":
    main()
