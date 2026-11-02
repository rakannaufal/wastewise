"""Package deliverables without credentials, caches, local accounts or build dependencies."""

import hashlib
import json
import os
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
required = [
    "README.md",
    "docs/API.md",
    "docs/openapi.json",
    "docs/schema.sql",
    "docs/DESIGN_QA.md",
    "backend-ml/ml/models/wastewise-v1.pth",
    "backend-ml/ml/models/metadata.json",
    "backend-ml/outputs/evaluation/metrics.json",
    "backend-ml/dataset/audit.json",
]
for relative in required:
    if not (root / relative).is_file():
        raise FileNotFoundError(f"Missing deliverable: {relative}")
metadata = json.loads((root / "backend-ml/ml/models/metadata.json").read_text())
checkpoint = root / "backend-ml/ml/models/wastewise-v1.pth"
if hashlib.sha256(checkpoint.read_bytes()).hexdigest() != metadata["checkpoint_sha256"]:
    raise ValueError("Checkpoint checksum does not match metadata")
audit = json.loads((root / "backend-ml/dataset/audit.json").read_text())
images = sorted((root / "garbage_classification").rglob("*.jpg"))
if len(images) != audit["original_count"]:
    raise ValueError("Dataset image count does not match audit")
out = root / "release"
out.mkdir(exist_ok=True)
excluded = {
    "node_modules",
    ".git",
    ".venv",
    ".local",
    ".superdesign",
    ".temp",
    "__pycache__",
    ".pytest_cache",
    ".ruff_cache",
    ".mypy_cache",
    "dist",
    "test-results",
    "playwright-report",
    ".expo",
    "release",
    "garbage_classification",
    "features",
}
files = []
for directory, folders, names in os.walk(root):
    folders[:] = [name for name in folders if name not in excluded]
    for name in names:
        path = Path(directory) / name
        if (
            (name.startswith(".env") and name != ".env.example")
            or name == ".DS_Store"
            or path.suffix in {".log", ".pyc", ".tsbuildinfo"}
        ):
            continue
        files.append(path)
with zipfile.ZipFile(
    out / "wastewise-source-model-docs.zip", "w", zipfile.ZIP_DEFLATED
) as archive:
    for path in sorted(files):
        archive.write(path, path.relative_to(root))
with zipfile.ZipFile(
    out / "wastewise-dataset-local.zip", "w", zipfile.ZIP_DEFLATED
) as archive:
    for path in images:
        archive.write(path, path.relative_to(root))
    for path in sorted((root / "backend-ml/dataset").iterdir()):
        if path.is_file():
            archive.write(path, path.relative_to(root))
    archive.write(root / "docs/DATASET.md", "docs/DATASET.md")
    archive.write(root / "THIRD_PARTY_NOTICES.md", "THIRD_PARTY_NOTICES.md")
manifest = {
    p.name: {
        "bytes": p.stat().st_size,
        "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
    }
    for p in out.glob("*.zip")
}
(out / "manifest.json").write_text(json.dumps(manifest, indent=2))
print(json.dumps(manifest, indent=2))
