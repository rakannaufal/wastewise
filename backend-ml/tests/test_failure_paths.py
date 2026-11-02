from pathlib import Path
from uuid import UUID

from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.inference import predictor
from app.models import CleanupJob, User
from app.schemas import Category
from ml.common import CLASSES
from tests.test_api import create


def test_enum_mapping():
    assert [item.value for item in Category] == CLASSES


def test_invalid_checkpoint_is_degraded(client, tmp_path: Path, monkeypatch):
    with monkeypatch.context() as patch:
        path = tmp_path / "bad.pth"
        path.write_bytes(b"invalid checkpoint")
        patch.setattr(settings, "model_path", path)
        predictor.load()
        assert predictor.net is None
        assert client.get("/health/ready").json()["data"]["status"] == "degraded"
    predictor.load()


def test_user_delete_enqueues_images(client, accounts, monkeypatch):
    monkeypatch.setattr(predictor, "predict", lambda _: None)
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
