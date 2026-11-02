import hashlib
import json
from pathlib import Path

from ml.common import CLASSES


def test_split_integrity():
    root = Path(__file__).resolve().parents[1] / "dataset"
    audit = json.loads((root / "audit.json").read_text())
    seen_groups, seen_hashes = set(), set()
    count = 0
    for split in ("train", "val", "test"):
        raw = (root / f"{split}.jsonl").read_bytes()
        assert hashlib.sha256(raw).hexdigest() == audit[f"{split}_sha256"]
        rows = [json.loads(line) for line in raw.splitlines()]
        groups, hashes = {r["group"] for r in rows}, {r["sha256"] for r in rows}
        assert not seen_groups & groups
        assert not seen_hashes & hashes
        assert len(hashes) == len(rows)
        assert {r["category"] for r in rows} == set(CLASSES)
        seen_groups |= groups
        seen_hashes |= hashes
        count += len(rows)
    assert (
        count + len(audit["excluded_conflicts"]) + len(audit["excluded_exact_duplicates"])
        == audit["original_count"]
    )
