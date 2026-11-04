import asyncio
import io
import json
import shutil
import threading
from pathlib import Path
from uuid import UUID

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from starlette.datastructures import UploadFile

from app import storage as storage_module
from app.config import settings
from app.db import SessionLocal
from app.inference import predictor
from app.models import CleanupJob, User
from app.schemas import Category
from ml.common import CLASSES
from tests.test_api import create


def test_image_decode_runs_off_the_asgi_thread(monkeypatch):
    event_loop_thread = threading.get_ident()

    def decode(_):
        assert threading.get_ident() != event_loop_thread
        return b"sanitized"

    monkeypatch.setattr(storage_module, "decode_upload", decode)
    upload = UploadFile(file=io.BytesIO(b"bounded input"), filename="upload.png")
    assert asyncio.run(storage_module.sanitize_upload(upload)) == b"sanitized"


def test_image_decode_sheds_load_when_all_slots_are_busy(monkeypatch):
    class BusySlots:
        def acquire(self, blocking=False):
            return False

    monkeypatch.setattr(storage_module, "image_decode_slots", BusySlots())
    upload = UploadFile(file=io.BytesIO(b"bounded input"), filename="upload.png")
    with pytest.raises(HTTPException) as error:
        asyncio.run(storage_module.sanitize_upload(upload))
    assert error.value.status_code == 503
    assert error.value.headers["Retry-After"] == "2"


def test_enum_mapping():
    assert [item.value for item in Category] == CLASSES


def test_invalid_checkpoint_fails_readiness(client, tmp_path: Path, monkeypatch):
    with monkeypatch.context() as patch:
        path = tmp_path / "bad.pth"
        path.write_bytes(b"invalid checkpoint")
        patch.setattr(settings, "model_path", path)
        predictor.load()
        assert predictor.net is None
        response = client.get("/health/ready")
        assert response.status_code == 503
        assert response.json()["data"]["status"] == "unavailable"
    predictor.load()

def test_checkpoint_checksum_mismatch_fails_readiness(client, tmp_path: Path, monkeypatch):
    checkpoint = tmp_path / "wastewise-v1.pth"
    shutil.copy2(settings.model_path, checkpoint)
    metadata_path = checkpoint.with_name("metadata.json")
    metadata = json.loads(settings.model_path.with_name("metadata.json").read_text())
    metadata["checkpoint_sha256"] = "0" * 64
    metadata_path.write_text(json.dumps(metadata))
    with monkeypatch.context() as patch:
        patch.setattr(settings, "model_path", checkpoint)
        predictor.load()
        assert predictor.net is None
        assert predictor.metadata is None
        assert predictor.checkpoint_sha256 is None
        response = client.get("/health/ready")
        assert response.status_code == 503
    predictor.load()


def test_user_delete_enqueues_images(client, accounts, monkeypatch):
    monkeypatch.setattr(
        predictor,
        "predict",
        lambda _: {"category": "plastic", "confidence": 90, "model_version": "test-only"},
    )
    assert create(client, accounts["owner"]).status_code == 201
    headers = accounts["admin"]["headers"]
    assert (
        client.delete("/api/v1/users/" + accounts["admin"]["id"], headers=headers).status_code
        == 409
    )
    assert (
        client.patch(
            "/api/v1/users/" + accounts["owner"]["id"], headers=headers, json={}
        ).status_code
        == 422
    )
    result = client.get(
        "/api/v1/users?search=" + accounts["owner"]["email"], headers=headers
    ).json()["data"]
    assert len(result["users"]) == 1 and result["users"][0]["report_count"] == 1
    assert (
        client.delete("/api/v1/users/" + accounts["owner"]["id"], headers=headers).status_code
        == 200
    )
    assert client.get("/api/v1/auth/me", headers=accounts["owner"]["headers"]).status_code == 401
    with SessionLocal() as db:
        assert db.get(User, UUID(accounts["owner"]["id"])) is None
        assert (
            db.scalar(
                select(CleanupJob).where(CleanupJob.object_path.startswith(accounts["owner"]["id"]))
            )
            is not None
        )
