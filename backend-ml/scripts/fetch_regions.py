"""Fetch pinned MIT reference data. Never execute upstream SQL."""

import concurrent.futures
import hashlib
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "dataset/regions"


def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    pinned = (
        json.loads((ROOT / "sources.json").read_text()) if (ROOT / "sources.json").exists() else {}
    )
    manifest = {}
    for repo in ("wilayah", "wilayah_boundaries"):
        commit = pinned.get(repo, {}).get("commit")
        if not commit:
            info = json.loads(
                fetch(f"https://api.github.com/repos/cahyadsn/{repo}/commits?per_page=1")
            )
            commit = info[0]["sha"]
        base = f"https://raw.githubusercontent.com/cahyadsn/{repo}/{commit}"
        license_data = fetch(base + "/LICENSE")
        (ROOT / f"{repo}-LICENSE").write_bytes(license_data)
        manifest[repo] = {
            "commit": commit,
            "source": f"https://github.com/cahyadsn/{repo}",
            "files": {},
        }
        if repo == "wilayah":
            data = fetch(base + "/db/wilayah.sql")
            # Some revisions keep the dump in the root directory.
            (ROOT / "wilayah.sql").write_bytes(data)
            manifest[repo]["files"]["wilayah.sql"] = hashlib.sha256(data).hexdigest()
        else:
            codes = re.findall(r"\('([0-9]{2}\.[0-9]{2})','", (ROOT / "wilayah.sql").read_text())
            target = ROOT / "boundaries"
            target.mkdir(exist_ok=True)

            def one(code, base=base, target=target):
                relative = f"db/kel/{code[:2]}/wilayah_boundaries_kel_{code}.sql"
                data = fetch(base + "/" + relative)
                (target / f"{code}.sql").write_bytes(data)
                return relative, hashlib.sha256(data).hexdigest()

            with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
                for path, digest in pool.map(one, codes):
                    manifest[repo]["files"][path] = digest
    (ROOT / "sources.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print("Pinned reference files:", sum(len(v["files"]) for v in manifest.values()))


if __name__ == "__main__":
    main()
