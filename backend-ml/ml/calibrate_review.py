"""Choose a review rule using fresh validation inference, never the test split."""

import hashlib
import json
from datetime import UTC, datetime

import torch
from torch.utils.data import DataLoader

from ml.common import ROOT, load_model
from ml.train import Images


def main():
    torch.set_num_threads(2)
    out = ROOT / "backend-ml/ml/models"
    model, metadata = load_model(out / "wastewise-v1.pth")
    audit = json.loads((ROOT / "backend-ml/dataset/audit.json").read_text())
    scores_list, indices_list, labels_list = [], [], []
    with torch.inference_mode():
        for images, target in DataLoader(Images("val"), batch_size=32, num_workers=0):
            values, choices = model(images).softmax(1).topk(2, dim=1)
            scores_list.append(values)
            indices_list.append(choices)
            labels_list.append(target)
    scores, indices, labels = (
        torch.cat(scores_list),
        torch.cat(indices_list),
        torch.cat(labels_list),
    )
    correct = indices[:, 0] == labels
    candidates = []
    for confidence in range(50, 100):
        for margin in range(0, 31, 5):
            accepted = (scores[:, 0] * 100 >= confidence) & (
                (scores[:, 0] - scores[:, 1]) * 100 >= margin
            )
            count = int(accepted.sum())
            precision = float(correct[accepted].float().mean()) if count else 0
            if count >= 100 and precision >= 0.98:
                candidates.append((count, precision, confidence, margin))
    if not candidates:
        raise ValueError(
            "No validation rule meets 98% accepted-label precision; keep all predictions in review"
        )
    count, precision, confidence, margin = max(candidates)
    policy = {
        "model_version": metadata["version"],
        "checkpoint_sha256": hashlib.sha256((out / "wastewise-v1.pth").read_bytes()).hexdigest(),
        "confidence": confidence,
        "margin": margin,
        "source": "fresh validation inference",
        "validation_sha256": audit["val_sha256"],
        "validation_count": len(labels),
        "accepted_count": count,
        "accepted_precision": precision,
        "coverage": count / len(labels),
        "created_at": datetime.now(UTC).isoformat(),
        "limitation": "In-distribution validation only; does not certify camera photos or reject all out-of-distribution images.",
    }
    (out / "review_policy.json").write_text(json.dumps(policy, indent=2) + "\n")
    print(json.dumps(policy, indent=2))


if __name__ == "__main__":
    main()
