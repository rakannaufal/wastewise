"""Validation-only smoke for upload compression; no tuning or test-set access."""

import hashlib
import io
import json
import statistics
from datetime import UTC, datetime
from time import perf_counter

from PIL import Image, ImageOps

from app.inference import predictor
from app.storage import thumbnail
from ml.common import CLASSES, ROOT


def encode(content, side, quality):
    with Image.open(io.BytesIO(content)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.thumbnail((side, side))
        out = io.BytesIO()
        image.save(out, "JPEG", quality=quality)
        return out.getvalue()


def main():
    predictor.load()
    rows = [
        json.loads(line)
        for line in (ROOT / "backend-ml/dataset/val.jsonl").read_text().splitlines()
    ]
    selected = [
        row
        for category in CLASSES
        for row in sorted(
            (r for r in rows if r["category"] == category), key=lambda r: r["sha256"]
        )[:10]
    ]
    results, timings, sizes, thumbs = [], [], [], []
    for row in selected:
        original = (ROOT / "garbage_classification" / row["path"]).read_bytes()
        assert hashlib.sha256(original).hexdigest() == row["sha256"]
        base = predictor.predict(encode(original, 2048, 90))
        upload = encode(original, 1600, 82)
        stored = encode(upload, 2048, 90)
        started = perf_counter()
        compressed = predictor.predict(stored)
        timings.append((perf_counter() - started) * 1000)
        assert base and compressed
        sizes.append(len(upload))
        thumbs.append(len(thumbnail(stored)))
        results.append(
            {
                "path": row["path"],
                "truth": row["category"],
                "server_original": base["category"],
                "compressed": compressed["category"],
            }
        )
    out = {
        "checked_at": datetime.now(UTC).isoformat(),
        "split": "validation subset, 10 per class",
        "count": len(results),
        "checkpoint_sha256": predictor.checkpoint_sha256,
        "agreement": sum(r["server_original"] == r["compressed"] for r in results) / len(results),
        "original_accuracy_on_subset": sum(r["truth"] == r["server_original"] for r in results)
        / len(results),
        "compressed_accuracy_on_subset": sum(r["truth"] == r["compressed"] for r in results)
        / len(results),
        "upload_median_bytes": statistics.median(sizes),
        "thumbnail_max_bytes": max(thumbs),
        "warm_prediction_p95_ms": sorted(timings)[int(len(timings) * 0.95) - 1],
        "hardware": "local macOS arm64, CPU, torch threads=2, sequential",
        "limitation": "Pillow approximation of client JPEG82, not native/browser encoder parity or field accuracy; no network/upload/GPS included in timing.",
        "samples": results,
    }
    (ROOT / "backend-ml/outputs/validation_compression.json").write_text(json.dumps(out, indent=2))
    print(json.dumps({k: v for k, v in out.items() if k != "samples"}, indent=2))


if __name__ == "__main__":
    main()
