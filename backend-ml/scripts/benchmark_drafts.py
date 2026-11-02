"""Measure real development draft latency with one disposable confirmed QA identity."""

import argparse
import json
import secrets
import time
import uuid
from datetime import UTC, datetime

import httpx
from sqlalchemy import delete, select

from app.config import ROOT, settings
from app.db import SessionLocal
from app.models import BlockedIdentity, CleanupJob, ReportDraft, User
from app.storage import storage


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", action="store_true")
    parser.add_argument("--label", required=True, choices=["before", "after"])
    args = parser.parse_args()
    if not args.run or settings.environment == "production" or settings.auth_provider != "supabase":
        raise SystemExit("Requires --run with development/staging Supabase")
    subject = None
    secret = settings.supabase_service_key.get_secret_value()
    headers = {"apikey": secret, "Authorization": "Bearer " + secret}
    image = (ROOT / "web/public/materials/plastic.jpg").read_bytes()
    rows = []
    with (
        httpx.Client(timeout=60) as cloud,
        httpx.Client(base_url="http://127.0.0.1:8000", timeout=60) as api,
    ):
        try:
            account = {
                "email": f"wastewise-qa-{uuid.uuid4().hex}@example.com",
                "password": "WasteWise1!" + secrets.token_urlsafe(24),
            }
            response = cloud.post(
                settings.supabase_url + "/auth/v1/admin/users",
                headers=headers,
                json={
                    **account,
                    "email_confirm": True,
                    "user_metadata": {"full_name": "Draft latency QA"},
                },
            )
            response.raise_for_status()
            subject = uuid.UUID(response.json()["id"])
            response = cloud.post(
                settings.supabase_url + "/auth/v1/token?grant_type=password",
                headers={"apikey": settings.supabase_publishable_key},
                json=account,
            )
            response.raise_for_status()
            bearer = {"Authorization": "Bearer " + response.json()["access_token"]}
            api.get("/api/v1/auth/me", headers=bearer).raise_for_status()
            for _ in range(3):
                started = time.perf_counter()
                response = api.post(
                    "/api/v1/report-drafts",
                    headers=bearer,
                    data={"request_id": str(uuid.uuid4()), "photo_source": "gallery"},
                    files={"image": ("photo.jpg", image, "image/jpeg")},
                )
                response.raise_for_status()
                created_ms = (time.perf_counter() - started) * 1000
                draft = response.json()["data"]
                assert draft["prediction"] is not None
                started = time.perf_counter()
                response = api.delete("/api/v1/report-drafts/" + draft["id"], headers=bearer)
                response.raise_for_status()
                rows.append(
                    {
                        "create_and_category_ms": round(created_ms, 1),
                        "delete_ack_ms": round((time.perf_counter() - started) * 1000, 1),
                    }
                )
        finally:
            if subject:
                paths = set()
                with SessionLocal.begin() as db:
                    for image_path, thumb in db.execute(
                        select(ReportDraft.image_path, ReportDraft.thumbnail_path).where(
                            ReportDraft.user_id == subject
                        )
                    ):
                        paths.update([image_path, thumb])
                    jobs = [
                        j
                        for j in db.scalars(select(CleanupJob))
                        if j.object_path.startswith(str(subject) + "/")
                    ]
                    paths.update(j.object_path for j in jobs)
                    db.execute(delete(User).where(User.id == subject))
                    db.execute(delete(BlockedIdentity).where(BlockedIdentity.id == subject))
                    for job in jobs:
                        db.delete(job)
                for path in paths:
                    storage.delete(path)
                response = cloud.delete(
                    settings.supabase_url + "/auth/v1/admin/users/" + str(subject), headers=headers
                )
                assert response.status_code in {200, 204, 404}, "QA provider cleanup requires retry"
    result = {
        "checked_at": datetime.now(UTC).isoformat(),
        "label": args.label,
        "samples": rows,
        "image_bytes": len(image),
        "scope": "local HTTP client/backend, real Supabase Auth/Postgres/Storage, sequential 3 samples; not phone latency or p95",
        "qa_cleanup": "completed",
    }
    path = ROOT / "docs/evidence" / f"draft-latency-{args.label}.json"
    path.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
