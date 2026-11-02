"""Provider contract tests use explicit fake Auth responses, never real email delivery."""

import uuid
from concurrent.futures import ThreadPoolExecutor

import httpx
import pytest
from fastapi import HTTPException
from sqlalchemy import delete, select

from app import supabase_auth
from app.config import settings
from app.db import SessionLocal
from app.models import BlockedIdentity, User


def identity(subject=None, email=None):
    subject = subject or uuid.uuid4()
    return {
        "id": str(subject),
        "email": email or f"supa-{subject.hex}@example.com",
        "email_confirmed_at": "2026-11-02T00:00:00Z",
        "is_anonymous": False,
        "user_metadata": {"full_name": "Supabase QA", "role": "admin"},
        "role": "admin",
    }


def configure(monkeypatch):
    monkeypatch.setattr(settings, "auth_provider", "supabase")
    monkeypatch.setattr(settings, "supabase_url", "https://example.supabase.co")
    monkeypatch.setattr(settings, "supabase_publishable_key", "sb_publishable_fixture")


def test_provider_validation_and_fail_closed(monkeypatch, request):
    configure(monkeypatch)
    original = httpx.Client
    data = identity()
    status = 200

    def handler(request):
        assert str(request.url) == "https://example.supabase.co/auth/v1/user"
        assert request.headers["apikey"] == "sb_publishable_fixture"
        assert request.headers["authorization"] == "Bearer provider-token"
        return httpx.Response(status, json=data)

    provider = original(transport=httpx.MockTransport(handler), follow_redirects=False)
    request.addfinalizer(provider.close)
    monkeypatch.setattr(supabase_auth, "supabase_client", lambda: provider)
    assert supabase_auth.verified_identity("provider-token")["id"] == data["id"]
    for code, expected in [(401, 401), (403, 401), (500, 503), (302, 503)]:
        status = code
        with pytest.raises(HTTPException) as error:
            supabase_auth.verified_identity("provider-token")
        assert error.value.status_code == expected
    status = 200
    data["email_confirmed_at"] = None
    with pytest.raises(HTTPException) as error:
        supabase_auth.verified_identity("provider-token")
    assert error.value.status_code == 401
    data["email_confirmed_at"] = "2026-11-02T00:00:00Z"
    data["is_anonymous"] = True
    with pytest.raises(HTTPException) as error:
        supabase_auth.verified_identity("provider-token")
    assert error.value.status_code == 401


def test_supabase_profiles_roles_and_deleted_identity(client, monkeypatch):
    configure(monkeypatch)
    owner, admin = identity(), identity()
    tokens = {"owner": owner, "admin": admin}
    monkeypatch.setattr(supabase_auth, "verified_identity", lambda token: tokens[token])

    def headers(token):
        return {"Authorization": "Bearer " + token}

    ids = [uuid.UUID(x["id"]) for x in (owner, admin)]
    try:
        config = client.get("/api/v1/auth/config").json()["data"]
        assert config["provider"] == "supabase"
        assert "service" not in str(config).lower() and "jwt_secret" not in str(config)
        assert client.get("/api/v1/auth/me").status_code == 401
        assert (
            client.get("/api/v1/auth/me", headers=headers("owner")).json()["data"]["role"] == "user"
        )
        assert client.get("/api/v1/users", headers=headers("owner")).status_code == 403
        assert client.get("/api/v1/auth/me", headers=headers("admin")).status_code == 200
        with SessionLocal.begin() as db:
            row = db.get(User, ids[1])
            assert row.password_hash is None and row.auth_provider == "supabase"
            row.role = "admin"
        assert client.get("/api/v1/users", headers=headers("admin")).status_code == 200
        assert (
            client.delete("/api/v1/users/" + owner["id"], headers=headers("admin")).status_code
            == 200
        )
        assert client.get("/api/v1/auth/me", headers=headers("owner")).status_code == 403
        with SessionLocal() as db:
            assert db.get(User, ids[0]) is None
            assert db.get(BlockedIdentity, ids[0]) is not None
        assert (
            client.post(
                "/api/v1/auth/login", json={"email": admin["email"], "password": "WasteWiseTest1!"}
            ).status_code
            == 409
        )
        assert (
            client.post(
                "/api/v1/auth/register",
                json={
                    "email": admin["email"],
                    "password": "WasteWiseTest1!",
                    "full_name": "Supabase QA",
                },
            ).status_code
            == 409
        )
    finally:
        with SessionLocal.begin() as db:
            db.execute(delete(User).where(User.id.in_(ids)))
            db.execute(delete(BlockedIdentity).where(BlockedIdentity.id.in_(ids)))


def test_existing_email_is_not_automatically_linked(client, accounts, monkeypatch):
    configure(monkeypatch)
    data = identity(email=accounts["owner"]["email"])
    monkeypatch.setattr(supabase_auth, "verified_identity", lambda _: data)
    assert (
        client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer provider-token"}
        ).status_code
        == 409
    )
    with SessionLocal() as db:
        assert db.get(User, uuid.UUID(data["id"])) is None
        assert db.get(User, uuid.UUID(accounts["owner"]["id"])).auth_provider == "local"


def test_concurrent_provision_is_idempotent(client):
    data = identity()
    subject = uuid.UUID(data["id"])

    def provision(_):
        with SessionLocal() as db:
            return supabase_auth.profile_for(data, db).id

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            assert list(pool.map(provision, range(2))) == [subject, subject]
        with SessionLocal() as db:
            assert len(db.scalars(select(User).where(User.id == subject)).all()) == 1
    finally:
        with SessionLocal.begin() as db:
            db.execute(delete(User).where(User.id == subject))
