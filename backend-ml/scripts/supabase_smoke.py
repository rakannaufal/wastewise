"""Exercise configured staging Supabase with disposable admin-created QA identities.

This does not test email delivery. Only generated QA UUIDs are removed in teardown.
"""

import argparse
import json
import secrets
import subprocess
import uuid
from datetime import UTC, datetime

import httpx
from sqlalchemy import delete, select

from app.cleanup import run_once
from app.config import ROOT, settings
from app.db import SessionLocal
from app.models import BlockedIdentity, CleanupJob, Report, ReportDraft, User
from app.storage import storage


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", action="store_true")
    parser.add_argument("--browser", action="store_true")
    args = parser.parse_args()
    if not args.run or settings.environment == "production" or settings.auth_provider != "supabase":
        raise SystemExit("Requires --run, staging/development environment and Supabase Auth")
    secret = settings.supabase_service_key.get_secret_value()
    if not secret or settings.storage_backend != "supabase":
        raise SystemExit("Requires private Supabase storage and server credentials")
    identities = []
    jobs = []
    checks = []
    credentials = []
    provider = settings.supabase_url + "/auth/v1"
    headers = {"apikey": secret, "Authorization": "Bearer " + secret}
    image = (ROOT / "web/public/materials/plastic.jpg").read_bytes()
    with (
        httpx.Client(timeout=45) as cloud,
        httpx.Client(base_url="http://127.0.0.1:8000", timeout=60) as api,
    ):
        try:
            for _ in range(2):
                email = f"wastewise-qa-{uuid.uuid4().hex}@example.com"
                password = "WasteWise1!" + secrets.token_urlsafe(24)
                credentials.append({"email": email, "password": password})
                response = cloud.post(
                    provider + "/admin/users",
                    headers=headers,
                    json={
                        "email": email,
                        "password": password,
                        "email_confirm": True,
                        "user_metadata": {"full_name": "Supabase QA", "role": "admin"},
                    },
                )
                assert response.status_code in {200, 201}, (
                    f"QA identity creation: {response.status_code}"
                )
                subject = uuid.UUID(response.json()["id"])
                identities.append(subject)
                response = cloud.post(
                    provider + "/token?grant_type=password",
                    headers={"apikey": settings.supabase_publishable_key},
                    json={"email": email, "password": password},
                )
                assert response.status_code == 200, f"Provider login: {response.status_code}"
                bearer = {"Authorization": "Bearer " + response.json()["access_token"]}
                response = api.get("/api/v1/auth/me", headers=bearer)
                assert response.status_code == 200 and response.json()["data"]["role"] == "user"
                if len(identities) == 1:
                    owner = bearer
                else:
                    outsider = bearer
            checks.extend(
                [
                    "real provider password login",
                    "verified profile provisioning",
                    "role metadata ignored",
                ]
            )
            response = api.post(
                "/api/v1/predict",
                headers=owner,
                files={"image": ("plastic.jpg", image, "image/jpeg")},
            )
            assert response.status_code == 200
            checks.append("trained checkpoint inference")
            response = api.post(
                "/api/v1/report-drafts",
                headers=owner,
                data={"request_id": str(uuid.uuid4()), "photo_source": "gallery"},
                files={"image": ("plastic.jpg", image, "image/jpeg")},
            )
            assert response.status_code == 201, f"Draft creation: {response.status_code}"
            draft = response.json()["data"]
            assert (
                api.patch(
                    "/api/v1/report-drafts/" + draft["id"],
                    headers=owner,
                    json={
                        "latitude": -6.2,
                        "longitude": 106.8,
                        "location_source": "device_upload_confirmed",
                        "location_recorded_at": datetime.now(UTC).isoformat(),
                        "location_accuracy_m": 10,
                        "confirmed": True,
                    },
                ).status_code
                == 200
            )
            payload = {
                "draft_id": draft["id"],
                "description": "Disposable Supabase smoke test report",
            }
            finalize_headers = {**owner, "Idempotency-Key": str(uuid.uuid4())}
            response = api.post("/api/v1/reports", headers=finalize_headers, json=payload)
            assert response.status_code == 201, f"Report creation: {response.status_code}"
            report = response.json()["data"]
            assert (
                api.post("/api/v1/reports", headers=finalize_headers, json=payload).json()["data"][
                    "id"
                ]
                == report["id"]
            )
            assert cloud.get(report["thumbnail_url"]).status_code == 200
            assert api.get("/api/v1/reports", headers=owner).status_code == 200
            checks.extend(
                [
                    "draft automatic classification and confirmed GPS",
                    "idempotent finalization",
                    "batch private signing and thumbnail",
                ]
            )
            report_id = report["id"]
            assert cloud.get(report["image_url"]).status_code == 200
            assert api.get("/api/v1/reports/" + report_id, headers=outsider).status_code == 404
            with SessionLocal() as db:
                path = db.get(Report, uuid.UUID(report_id)).image_path
            assert (
                cloud.get(
                    settings.supabase_url
                    + "/storage/v1/object/public/"
                    + settings.storage_bucket
                    + "/"
                    + path
                ).status_code
                != 200
            )
            checks.extend(
                [
                    "report persisted remotely",
                    "private signed image readable",
                    "other owner denied",
                    "anonymous public image denied",
                ]
            )
            with SessionLocal.begin() as db:
                db.get(User, identities[1]).role = "admin"
            for revision, status in [(1, "In Progress"), (2, "Completed")]:
                assert (
                    api.patch(
                        "/api/v1/reports/" + report_id + "/status",
                        headers=outsider,
                        json={"status": status, "revision": revision},
                    ).status_code
                    == 200
                )
            assert (
                len(
                    api.get("/api/v1/reports/" + report_id + "/events", headers=owner).json()[
                        "data"
                    ]
                )
                == 3
            )
            assert api.get("/api/v1/admin/dashboard", headers=outsider).status_code == 200
            checks.extend(
                ["versioned status workflow and events", "real admin dashboard aggregates"]
            )
            if args.browser:
                browser = subprocess.run(
                    ["node", "web/scripts/supabase-browser-smoke.mjs"],
                    input=json.dumps({"owner": credentials[0], "admin": credentials[1]}),
                    text=True,
                    capture_output=True,
                    timeout=300,
                    cwd=ROOT,
                )
                if browser.returncode:
                    diagnostics = browser.stderr
                    for account in credentials:
                        diagnostics = diagnostics.replace(account["password"], "[redacted]")
                    (ROOT / ".local/workflow-browser-error.log").write_text(diagnostics)
                    raise RuntimeError("Live browser smoke failed; details retained privately")
                checks.extend(json.loads(browser.stdout)["checks"])
            assert api.delete("/api/v1/reports/" + report_id, headers=owner).status_code == 200
            with SessionLocal() as db:
                job = db.query(CleanupJob).filter(CleanupJob.object_path == path).one()
                jobs.append(job.id)
            # Drain only due jobs in the configured staging queue, as the normal worker does.
            while run_once():
                pass
            with SessionLocal() as db:
                assert db.get(CleanupJob, jobs[0]).status == "completed"
            listed = storage.request(
                "POST",
                "object/list/" + settings.storage_bucket,
                json={
                    "prefix": path.rsplit("/", 1)[0],
                    "limit": 100,
                    "search": path.rsplit("/", 1)[1],
                },
            ).json()
            assert not any(item.get("name") == path.rsplit("/", 1)[1] for item in listed)
            checks.extend(
                [
                    "database role change effective",
                    "admin status change",
                    "delete and durable cleanup",
                    "deleted object absent from storage inventory",
                ]
            )
            response = api.get("/health/ready")
            assert response.status_code == 200 and response.json()["data"]["model"] == "ready"
            checks.append("remote readiness")
            result = {
                "checked_at": datetime.now(UTC).isoformat(),
                "provider": "Supabase",
                "checks": checks,
                "email_delivery_tested": False,
                "test_identities": "admin-created confirmed disposable identities",
                "result": "pass",
            }
        finally:
            # Cleanup is exact by generated UUID; never select or delete a human account.
            with SessionLocal.begin() as db:
                paths = set()
                for model in (Report, ReportDraft):
                    for photo, thumb in db.execute(
                        select(model.image_path, model.thumbnail_path).where(
                            model.user_id.in_(identities)
                        )
                    ):
                        paths.update(path for path in (photo, thumb) if path)
                qa_jobs = [
                    row
                    for row in db.scalars(select(CleanupJob))
                    if row.object_path.split("/")[0] in {str(value) for value in identities}
                ]
                paths.update(row.object_path for row in qa_jobs)
                db.execute(delete(User).where(User.id.in_(identities)))
                db.execute(delete(BlockedIdentity).where(BlockedIdentity.id.in_(identities)))
                db.execute(delete(CleanupJob).where(CleanupJob.id.in_(jobs)))
                for row in qa_jobs:
                    if row.id not in jobs:
                        db.delete(row)
            for path in paths:
                storage.delete(path)
            failures = []
            for subject in identities:
                response = cloud.delete(provider + "/admin/users/" + str(subject), headers=headers)
                if response.status_code not in {200, 204, 404}:
                    failures.append(str(subject))
            if failures:
                raise RuntimeError("QA identity cleanup requires retry: " + ", ".join(failures))
    result["qa_cleanup"] = "completed"
    (ROOT / "docs/evidence/supabase-smoke.json").write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
