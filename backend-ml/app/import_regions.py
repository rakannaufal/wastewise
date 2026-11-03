"""Import pinned reference names and boundary JSON using parameterized upserts."""

import hashlib
import json
from collections import Counter
from pathlib import Path

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert

from app.db import SessionLocal
from app.models import Region
from app.region_reference import geometries, names

ROOT = Path(__file__).resolve().parents[1] / "dataset/regions"


def main():
    manifest = json.loads((ROOT / "sources.json").read_text())
    for repo, entry in manifest.items():
        for relative, digest in entry["files"].items():
            file = ROOT / (
                "wilayah.sql" if repo == "wilayah" else "boundaries/" + relative.split("_kel_")[-1]
            )
            if hashlib.sha256(file.read_bytes()).hexdigest() != digest:
                raise ValueError(f"Reference checksum mismatch: {relative}")
    entries = names((ROOT / "wilayah.sql").read_text())
    codes = {code for code, _ in entries}
    if len(codes) != len(entries) or any(
        code.rsplit(".", 1)[0] not in codes for code in codes if "." in code
    ):
        raise ValueError("Invalid hierarchy")
    counts = Counter(code.count(".") + 1 for code in codes)
    with SessionLocal.begin() as db:
        for level in range(1, 5):
            rows = [
                dict(
                    code=c,
                    name=n,
                    parent_code=c.rsplit(".", 1)[0] if "." in c else None,
                    level=level,
                    source=manifest["wilayah"]["source"] + "/tree/" + manifest["wilayah"]["commit"],
                )
                for c, n in entries
                if c.count(".") + 1 == level
            ]
            for offset in range(0, len(rows), 500):
                statement = insert(Region).values(rows[offset : offset + 500])
                db.execute(
                    statement.on_conflict_do_update(
                        index_elements=["code"],
                        set_={"name": statement.excluded.name, "source": statement.excluded.source},
                    )
                )
    matched, unknown = 0, 0
    for file in sorted((ROOT / "boundaries").glob("*.sql")):
        rows = []
        for code, geometry in geometries(file.read_text()):
            if code not in codes:
                unknown += 1
                continue
            rows.append({"code": code, "geometry": geometry})
            matched += 1
        with SessionLocal.begin() as db:
            db.execute(update(Region), rows)
    result = {
        "levels": dict(counts),
        "boundary_rows": matched,
        "unknown_boundary_codes": unknown,
        "method": "polygon-even-odd; ambiguous matches unresolved",
    }
    (ROOT / "coverage.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
