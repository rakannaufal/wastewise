from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select

from app import reconcile
from app.cleanup import run_once
from app.db import SessionLocal
from app.inference import predictor
from app.models import CleanupJob, Report
from app.storage import storage
from tests.test_api import create


def test_reconcile_grace_idempotency_and_referenced_image_protection(client, accounts, monkeypatch):
    monkeypatch.setattr(predictor, "predict", lambda _: None)
    response = create(client, accounts["owner"])
    assert response.status_code == 201
    with SessionLocal() as db:
        referenced = db.get(Report, UUID(response.json()["data"]["id"])).image_path
    aged = storage.put(accounts["owner"]["id"], b"orphan fixture")
    recent = storage.put(accounts["owner"]["id"], b"recent fixture")
    old_time = datetime.now(UTC) - timedelta(hours=48)
    monkeypatch.setattr(
        reconcile,
        "inventory",
        lambda: iter(
            [
                (referenced, old_time),
                (aged, old_time),
                (recent, datetime.now(UTC)),
                ("unrelated.txt", old_time),
            ]
        ),
    )
    try:
        audit = reconcile.reconcile()
        assert audit["aged_orphans"] == 1 and audit["scheduled"] == 0
        assert storage.path(aged).is_file()
        assert reconcile.reconcile(enqueue=True)["scheduled"] == 1
        assert reconcile.reconcile(enqueue=True)["scheduled"] == 0
        with pytest.raises(ValueError):
            reconcile.reconcile(enqueue=True, grace_hours=1)
        with SessionLocal.begin() as db:
            db.add(CleanupJob(object_path=referenced))
        while run_once():
            pass
        assert not storage.path(aged).exists()
        assert storage.path(recent).exists() and storage.path(referenced).exists()
        with SessionLocal() as db:
            job = db.scalar(select(CleanupJob).where(CleanupJob.object_path == referenced))
            assert job.status == "completed" and job.last_error_code == "ReferencedObjectPreserved"
    finally:
        storage.delete(aged)
        storage.delete(recent)


def test_interrupted_inventory_enqueues_nothing(monkeypatch):
    with SessionLocal() as db:
        before = db.scalar(select(func.count()).select_from(CleanupJob))

    def broken():
        yield f"{uuid4()}/{uuid4()}.jpg", datetime.now(UTC) - timedelta(hours=48)
        raise RuntimeError("provider unavailable")

    monkeypatch.setattr(reconcile, "inventory", broken)
    with pytest.raises(RuntimeError, match="provider unavailable"):
        reconcile.reconcile(enqueue=True)
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(CleanupJob)) == before
