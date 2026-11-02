"""Audit originals and split perceptual duplicate groups without copying images."""

import argparse
import hashlib
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

import imagehash
from PIL import Image, ImageOps

from ml.common import CLASSES, ROOT


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=ROOT / "garbage_classification")
    parser.add_argument("--out", type=Path, default=ROOT / "backend-ml/dataset")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    records, invalid = [], []
    for category in CLASSES:
        for path in sorted((args.source / category).glob("*")):
            if not path.is_file() or path.name.startswith("."):
                continue
            try:
                raw = path.read_bytes()
                with Image.open(path) as image:
                    image.load()
                    image = ImageOps.exif_transpose(image).convert("RGB")
                    records.append(
                        {
                            "path": str(path.relative_to(args.source)),
                            "category": category,
                            "sha256": hashlib.sha256(raw).hexdigest(),
                            "phash": str(imagehash.phash(image)),
                            "width": image.width,
                            "height": image.height,
                        }
                    )
            except Exception as exc:
                invalid.append(
                    {"path": str(path.relative_to(args.source)), "error": type(exc).__name__}
                )
        print(category, sum(r["category"] == category for r in records), flush=True)
    # BK-tree limits comparisons while retaining transitive perceptual duplicate groups.
    parent = list(range(len(records)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(a, b):
        parent[find(a)] = find(b)

    tree = None
    for index, record in enumerate(records):
        value = int(record["phash"], 16)
        if tree is None:
            tree = [value, index, {}]
            continue
        stack = [tree]
        while stack:
            node = stack.pop()
            distance = (value ^ node[0]).bit_count()
            if distance <= 4:
                union(index, node[1])
            stack.extend(
                child for edge, child in node[2].items() if distance - 4 <= edge <= distance + 4
            )
        node = tree
        while True:
            distance = (value ^ node[0]).bit_count()
            if distance == 0:
                break
            if distance not in node[2]:
                node[2][distance] = [value, index, {}]
                break
            node = node[2][distance]
    groups = defaultdict(list)
    for i, record in enumerate(records):
        groups[find(i)].append(record)
    splits = {key: [] for key in ("train", "val", "test")}
    conflicts, duplicates = [], []
    grouped = defaultdict(list)
    for group in groups.values():
        group_id = min(r["sha256"] for r in group)
        if len({r["category"] for r in group}) > 1:
            conflicts.extend({**r, "group": group_id} for r in group)
            continue
        unique = {}
        for record in group:
            record["group"] = group_id
            if record["sha256"] in unique:
                duplicates.append(record)
            else:
                unique[record["sha256"]] = record
        grouped[group[0]["category"]].append(list(unique.values()))
    rng = random.Random(42)
    for category in CLASSES:
        batches = grouped[category]
        rng.shuffle(batches)
        batches.sort(key=len, reverse=True)
        total = sum(map(len, batches))
        targets = dict(zip(splits, (0.7 * total, 0.15 * total, 0.15 * total), strict=True))
        counts = Counter()
        for batch in batches:
            split = max(splits, key=lambda key: (targets[key] - counts[key]) / max(targets[key], 1))
            splits[split].extend(batch)
            counts[split] += len(batch)
    manifest = {
        "seed": 42,
        "source": "https://www.kaggle.com/datasets/mostafaabla/garbage-classification",
        "source_root": "garbage_classification",
        "grouping": "pHash Hamming <= 4, transitive components; conflicting-label groups excluded; exact SHA duplicates removed",
        "original_count": len(records),
        "invalid": invalid,
        "excluded_conflicts": conflicts,
        "excluded_exact_duplicates": duplicates,
        "counts": {k: dict(Counter(r["category"] for r in rows)) for k, rows in splits.items()},
    }
    for split, rows in splits.items():
        rows.sort(key=lambda row: row["path"])
        payload = "".join(json.dumps(row, sort_keys=True) + "\n" for row in rows)
        (args.out / f"{split}.jsonl").write_text(payload)
        manifest[f"{split}_sha256"] = hashlib.sha256(payload.encode()).hexdigest()
    manifest["dataset_sha256"] = hashlib.sha256(
        "".join(r["sha256"] for r in records).encode()
    ).hexdigest()
    (args.out / "audit.json").write_text(json.dumps(manifest, indent=2))
    print(
        json.dumps(
            {
                "counts": manifest["counts"],
                "conflicts": len(conflicts),
                "duplicates": len(duplicates),
                "invalid": len(invalid),
            },
            indent=2,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
