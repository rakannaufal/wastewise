"""Final frozen test evaluation. Never select checkpoints here."""

import hashlib
import json
import time

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import torch
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from torch.utils.data import DataLoader

from ml.common import CLASSES, ROOT, load_model
from ml.train import Images


def main():
    torch.set_num_threads(4)
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    path = ROOT / "backend-ml/ml/models/wastewise-v1.pth"
    net, checkpoint = load_model(path, device)
    manifest = ROOT / "backend-ml/dataset/test.jsonl"
    if hashlib.sha256(manifest.read_bytes()).hexdigest() != checkpoint["split_sha256"]["test"]:
        raise ValueError("Test manifest fingerprint differs from checkpoint")
    data = Images("test")
    for row in data.rows:
        if (
            hashlib.sha256((ROOT / "garbage_classification" / row["path"]).read_bytes()).hexdigest()
            != row["sha256"]
        ):
            raise ValueError("Test image fingerprint mismatch: " + row["path"])
    truth, predictions, probabilities = [], [], []
    start = time.time()
    with torch.inference_mode():
        for images, labels in DataLoader(data, batch_size=64, num_workers=2):
            probability = net(images.to(device)).softmax(1).cpu()
            truth.extend(labels.tolist())
            predictions.extend(probability.argmax(1).tolist())
            probabilities.extend(probability.tolist())
    report = classification_report(
        truth, predictions, target_names=CLASSES, output_dict=True, zero_division=0
    )
    matrix = confusion_matrix(truth, predictions, labels=list(range(len(CLASSES))))
    result = {
        "checkpoint_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "split_sha256": checkpoint["split_sha256"]["test"],
        "accuracy": accuracy_score(truth, predictions),
        "classification_report": report,
        "confusion_matrix": matrix.tolist(),
        "test_count": len(truth),
        "evaluation_seconds": time.time() - start,
        "device": device,
        "gate": {
            "accuracy_gt_0_85": accuracy_score(truth, predictions) > 0.85,
            "all_class_f1_gte_0_75": all(report[c]["f1-score"] >= 0.75 for c in CLASSES),
        },
    }
    out = ROOT / "backend-ml/outputs/evaluation"
    out.mkdir(parents=True, exist_ok=True)
    (out / "metrics.json").write_text(json.dumps(result, indent=2))
    (out / "predictions.jsonl").write_text(
        "".join(
            json.dumps(
                {
                    "path": row["path"],
                    "actual": CLASSES[t],
                    "predicted": CLASSES[p],
                    "probabilities": dict(zip(CLASSES, probs, strict=True)),
                }
            )
            + "\n"
            for row, t, p, probs in zip(data.rows, truth, predictions, probabilities, strict=True)
        )
    )
    fig, ax = plt.subplots(figsize=(12, 11))
    ConfusionMatrixDisplay(matrix, display_labels=CLASSES).plot(
        ax=ax, cmap="Greens", xticks_rotation=45, colorbar=False
    )
    fig.tight_layout()
    fig.savefig(out / "confusion_matrix.png", dpi=160)
    plt.close(fig)
    history = json.loads((path.parent / "training_history.json").read_text())
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    axes[0].plot([r["train_loss"] for r in history], label="Train loss")
    axes[1].plot([r["val_accuracy"] for r in history], label="Validation accuracy")
    axes[1].plot([r["val_macro_f1"] for r in history], label="Validation macro F1")
    for ax in axes:
        ax.set_xlabel("Epoch (head then fine tuning)")
        ax.legend()
        ax.grid(alpha=0.2)
    fig.tight_layout()
    fig.savefig(out / "training_curves.png", dpi=160)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()


if __name__ == "__main__":
    main()
