import io
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from PIL import Image
from sqlalchemy import delete, select

from app import main as app_main
from app.config import settings
from app.db import SessionLocal
from app.inference import predictor
from app.models import CleanupJob, RateLimitWindow, Report, User
from app.storage import storage


def photo():
    output = io.BytesIO()
    Image.new("RGB", (80, 60), "green").save(output, "PNG")
    return output.getvalue()


def create(client, account, **fields):
    share_to_community = fields.pop("share_to_community", False)
    legacy_private = fields.pop("legacy_private", False)
    publication_policy = fields.pop(
        "publication_policy",
        "public-gps-v2" if share_to_community or legacy_private else None,
    )
    draft = client.post(
        "/api/v1/report-drafts",
        headers=account["headers"],
        data={"request_id": str(__import__("uuid").uuid4()), "photo_source": "gallery"},
        files={"image": ("test.png", photo(), "image/png")},
    )
    if draft.status_code != 201:
        return draft
    identity = draft.json()["data"]["id"]
    location = client.patch(
        f"/api/v1/report-drafts/{identity}",
        headers=account["headers"],
        json={
            "latitude": -6.2,
            "longitude": 106.8,
            "location_source": "device_upload_confirmed",
            "location_recorded_at": datetime.now(UTC).isoformat(),
            "location_accuracy_m": 10,
            "confirmed": True,
        },
    )
    assert location.status_code == 200, location.text
    response = client.post(
        "/api/v1/reports",
        headers={**account["headers"], "Idempotency-Key": str(__import__("uuid").uuid4())},
        json={
            "draft_id": identity,
            "description": "Botol plastik di dekat taman",
            **({"publication_policy": publication_policy} if publication_policy else {}),
            **fields,
        },
    )

    if legacy_private and response.status_code == 201:
        from sqlalchemy import delete

        from app.models import CommunityPost

        # Reproduce an archive created under the former private-by-default policy.
        with SessionLocal.begin() as db:
            db.execute(
                delete(CommunityPost).where(
                    CommunityPost.report_id == UUID(response.json()["data"]["id"])
                )
            )
    return response


def test_auth_and_extra_fields(client, accounts):
    owner = accounts["owner"]
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/auth/me", headers=owner["headers"]).json()["data"]["role"] == "user"
    assert (
        client.post(
            "/api/v1/auth/register",
            json={
                "email": owner["email"],
                "password": owner["password"],
                "full_name": "Tester",
                "role": "admin",
            },
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/auth/register",
            json={"email": owner["email"], "password": "weak", "full_name": "Tester"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/auth/register",
            json={"email": owner["email"], "password": owner["password"], "full_name": "Tester"},
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/v1/auth/login", json={"email": owner["email"], "password": "wrong"}
        ).status_code
        == 401
    )
    payload = client.get("/api/v1/auth/me", headers=owner["headers"]).json()["data"]
    assert "password_hash" not in payload


def test_scoping_filters_and_metadata(client, accounts, monkeypatch):
    monkeypatch.setattr(
        predictor,
        "predict",
        lambda _: {"category": "paper", "confidence": 82.3, "model_version": "test-only"},
    )
    response = create(client, accounts["owner"])
    assert response.status_code == 201, response.text
    row = response.json()["data"]
    assert row["category"] == "paper" and row["ai_predicted_category"] == "paper"
    assert row["ai_confidence"] == 82.3
    assert "image_path" not in row
    assert client.get(row["image_url"]).status_code == 200
    assert (
        client.get(f"/api/v1/reports/{row['id']}", headers=accounts["other"]["headers"]).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/v1/reports/{row['id']}", headers=accounts["other"]["headers"]
        ).status_code
        == 404
    )
    assert (
        client.get(
            "/api/v1/reports?user_id=" + accounts["owner"]["id"],
            headers=accounts["other"]["headers"],
        ).status_code
        == 403
    )
    other = client.get("/api/v1/reports", headers=accounts["other"]["headers"]).json()["data"]
    assert other["pagination"]["total_items"] == 0
    assert (
        client.get("/api/v1/reports?category=paper", headers=accounts["owner"]["headers"]).json()[
            "data"
        ]["pagination"]["total_items"]
        == 1
    )
    assert (
        client.get("/api/v1/reports?search=taman", headers=accounts["owner"]["headers"]).json()[
            "data"
        ]["pagination"]["total_items"]
        == 1
    )
    assert (
        client.get("/api/v1/reports?page=2", headers=accounts["owner"]["headers"]).json()["data"][
            "reports"
        ]
        == []
    )
    stats = client.get("/api/v1/stats/summary", headers=accounts["owner"]["headers"]).json()["data"]
    assert len(stats["by_category"]) == 12 and stats["total_reports"] == 1
    assert (
        client.patch(
            f"/api/v1/reports/{row['id']}/status",
            headers=accounts["owner"]["headers"],
            json={"status": "In Progress", "revision": 1},
        ).status_code
        == 403
    )
    assert (
        client.patch(
            f"/api/v1/reports/{row['id']}/status",
            headers=accounts["admin"]["headers"],
            json={"status": "In Progress", "revision": 1},
        ).status_code
        == 200
    )


def test_upload_validation_and_no_ai_spoof(client, accounts):
    assert create(client, accounts["owner"], ai_confidence="100").status_code == 422
    assert create(client, accounts["owner"], latitude="NaN").status_code == 422
    assert create(client, accounts["owner"], latitude="91").status_code == 422
    assert create(client, accounts["owner"], category="organic").status_code == 422
    assert create(client, accounts["owner"], description="          ").status_code == 201
    response = client.post(
        "/api/v1/predict",
        headers=accounts["owner"]["headers"],
        files={"image": ("fake.jpg", b"not an image", "image/jpeg")},
    )
    assert response.status_code == 422
    response = client.post(
        "/api/v1/predict",
        headers=accounts["owner"]["headers"],
        files={"image": ("big.jpg", b"x" * (5 * 1024 * 1024 + 1), "image/jpeg")},
    )
    assert response.status_code == 413


def test_model_unavailable_fails_readiness_and_blocks_report(client, accounts, monkeypatch):
    monkeypatch.setattr(predictor, "net", None)
    response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["data"]["status"] == "unavailable"
    assert (
        client.post(
            "/api/v1/predict",
            headers=accounts["owner"]["headers"],
            files={"image": ("p.png", photo(), "image/png")},
        ).status_code
        == 503
    )
    result = create(client, accounts["owner"])
    assert result.status_code == 503


def test_missing_profile_migration_fails_readiness(client, monkeypatch):
    class MissingProfileColumn:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, statement, *_args, **_kwargs):
            if "public_name_visible" in str(statement):
                raise RuntimeError("required profile column is missing")

    monkeypatch.setattr(app_main.engine, "connect", lambda: MissingProfileColumn())
    response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json()["data"]["database"] == "unavailable"


def test_cleanup_outbox(client, accounts, monkeypatch):
    from app.cleanup import run_once

    monkeypatch.setattr(
        predictor,
        "predict",
        lambda _: {"category": "plastic", "confidence": 90, "model_version": "test-only"},
    )
    row = create(client, accounts["owner"]).json()["data"]
    with SessionLocal() as db:
        path = db.get(Report, UUID(row["id"])).image_path
    assert storage.path(path).exists()
    assert (
        client.delete(
            "/api/v1/reports/" + row["id"], headers=accounts["owner"]["headers"]
        ).status_code
        == 200
    )
    with SessionLocal() as db:
        job = db.scalar(select(CleanupJob).where(CleanupJob.object_path == path))
        assert job.status == "pending"
    assert run_once()
    assert not storage.path(path).exists()
    while run_once():
        pass


def test_expired_media_and_session(client, accounts):
    token = jwt.encode(
        {
            "key": "missing.jpg",
            "exp": datetime.now(UTC) - timedelta(seconds=1),
            "aud": "wastewise-media",
        },
        settings.jwt_secret.get_secret_value(),
        algorithm="HS256",
    )
    assert client.get("/api/v1/media/" + token).status_code == 403
    token = jwt.encode(
        {
            "sub": accounts["owner"]["id"],
            "iat": datetime.now(UTC),
            "exp": datetime.now(UTC) - timedelta(seconds=1),
            "iss": "wastewise",
            "aud": "wastewise-api",
        },
        settings.jwt_secret.get_secret_value(),
        algorithm="HS256",
    )
    assert (
        client.get("/api/v1/auth/me", headers={"Authorization": "Bearer " + token}).status_code
        == 401
    )
    assert client.get("/health/live").headers.get("X-Request-ID")


def test_role_checked_against_database(client, accounts):
    headers = accounts["admin"]["headers"]
    assert client.get("/api/v1/users", headers=headers).status_code == 200
    with SessionLocal.begin() as db:
        db.get(User, UUID(accounts["admin"]["id"])).role = "user"
    assert client.get("/api/v1/users", headers=headers).status_code == 403


def test_last_admin_concurrent_demotions(client, accounts):
    owner_id, admin_id = accounts["owner"]["id"], accounts["admin"]["id"]
    with SessionLocal.begin() as db:
        db.get(User, UUID(owner_id)).role = "admin"

    def demote(identity):
        headers = accounts["owner" if identity == owner_id else "admin"]["headers"]
        return client.patch(
            "/api/v1/users/" + identity, headers=headers, json={"role": "user"}
        ).status_code

    with ThreadPoolExecutor(2) as pool:
        results = list(pool.map(demote, [owner_id, admin_id]))
    assert sorted(results) == [200, 409]
    with SessionLocal() as db:
        admins = db.scalars(select(User).where(User.role == "admin")).all()
        assert len(admins) == 1


def test_rate_limits(client, accounts):
    with SessionLocal.begin() as db:
        db.execute(delete(RateLimitWindow))
    settings.rate_limit_enabled = True
    for _ in range(10):
        assert (
            client.post(
                "/api/v1/auth/login", json={"email": "missing@example.com", "password": "wrong"}
            ).status_code
            == 401
        )
    response = client.post(
        "/api/v1/auth/login", json={"email": "missing@example.com", "password": "wrong"}
    )
    assert response.status_code == 429
    assert 1 <= int(response.headers["Retry-After"]) <= 60
    settings.rate_limit_enabled = False
