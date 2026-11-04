import uuid
from datetime import UTC, datetime, timedelta

import httpx
from pydantic import SecretStr
from sqlalchemy import delete, select

from app import supabase_auth
from app.cleanup import process_auth_deletion
from app.db import SessionLocal
from app.inference import predictor
from app.models import AuthDeletionJob, CleanupJob, Report, User
from app.storage import storage
from tests.test_api import create


def test_local_account_deletion_requires_password_and_removes_owned_data(
    client, accounts, monkeypatch
):
    owner = accounts["owner"]
    monkeypatch.setattr(
        predictor,
        "predict",
        lambda _: {"category": "plastic", "confidence": 88.0, "model_version": "test-only"},
    )
    report = create(client, owner).json()["data"]
    with SessionLocal() as db:
        row = db.get(Report, uuid.UUID(report["id"]))
        paths = {row.image_path, row.thumbnail_path}

    wrong = client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers=owner["headers"],
        json={"confirmation": "HAPUS AKUN", "password": "wrong-password"},
    )
    assert wrong.status_code == 401
    with SessionLocal() as db:
        assert db.get(User, uuid.UUID(owner["id"])) is not None

    result = client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers=owner["headers"],
        json={"confirmation": "HAPUS AKUN", "password": owner["password"]},
    )
    assert result.status_code == 202
    assert client.get("/api/v1/auth/me", headers=owner["headers"]).status_code == 401
    with SessionLocal() as db:
        assert db.get(User, uuid.UUID(owner["id"])) is None
        assert db.get(Report, uuid.UUID(report["id"])) is None
        queued = set(
            db.scalars(
                select(CleanupJob.object_path).where(CleanupJob.object_path.in_(paths))
            )
        )
        assert queued == {path for path in paths if path}

    for path in paths:
        if path:
            storage.delete(path)
    with SessionLocal.begin() as db:
        db.execute(CleanupJob.__table__.delete().where(CleanupJob.object_path.in_(paths)))

def test_last_admin_cannot_delete_own_account(client, accounts):
    owner = accounts["admin"]

    result = client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers=owner["headers"],
        json={"confirmation": "HAPUS AKUN", "password": owner["password"]},
    )
    assert result.status_code == 409
    with SessionLocal() as db:
        assert db.get(User, uuid.UUID(owner["id"])) is not None

def test_auth_deletion_worker_retries_and_removes_completed_jobs(monkeypatch):
    subject = uuid.uuid4()
    requests = []
    status = 503

    def handler(request):
        requests.append(request)
        assert request.method == "DELETE"
        assert str(request.url) == f"https://example.supabase.co/auth/v1/admin/users/{subject}"
        assert request.headers["apikey"] == "sb_secret_fixture"
        assert request.headers["authorization"] == "Bearer sb_secret_fixture"
        return httpx.Response(status)

    provider = httpx.Client(transport=httpx.MockTransport(handler))
    monkeypatch.setattr(supabase_auth, "supabase_client", lambda: provider)
    monkeypatch.setattr(supabase_auth.settings, "supabase_url", "https://example.supabase.co")
    monkeypatch.setattr(
        supabase_auth.settings,
        "supabase_service_key",
        SecretStr("sb_secret_fixture"),
    )
    try:
        with SessionLocal.begin() as db:
            db.add(AuthDeletionJob(user_id=subject))

        assert process_auth_deletion()
        with SessionLocal() as db:
            job = db.get(AuthDeletionJob, subject)
            assert job is not None and job.attempts == 1
            assert job.last_error_code == "HTTPStatusError"
            assert job.next_attempt_at > datetime.now(UTC)

        with SessionLocal.begin() as db:
            job = db.get(AuthDeletionJob, subject)
            job.next_attempt_at = datetime.now(UTC) - timedelta(seconds=1)
        status = 204
        assert process_auth_deletion()
        with SessionLocal() as db:
            assert db.get(AuthDeletionJob, subject) is None
        assert len(requests) == 2
    finally:
        provider.close()
        with SessionLocal.begin() as db:
            db.execute(delete(AuthDeletionJob).where(AuthDeletionJob.user_id == subject))
