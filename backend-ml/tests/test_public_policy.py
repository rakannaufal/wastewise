"""Public-read and optional-text regression tests use an isolated database only."""

from uuid import UUID, uuid4

import pytest
from sqlalchemy import select

from app.community_worker import run_once
from app.db import SessionLocal
from app.models import CommunityPost, Report
from app.schemas import ReportCreate, ReportUpdate
from tests.test_api import create
from tests.test_community import prediction


@pytest.mark.parametrize("value", [None, "", "  ", "x", " short "])
def test_optional_description_normalization(value):
    body = ReportCreate(draft_id=uuid4(), publication_policy="public-gps-v2", description=value)
    assert body.description == (value or "").strip()
    assert ReportUpdate(revision=1, description=value).description == body.description


def test_description_omitted_and_explicit_empty_have_same_create_digest():
    identity = uuid4()
    assert (
        ReportCreate(draft_id=identity, publication_policy="public-gps-v2").model_dump_json()
        == ReportCreate(
            draft_id=identity, publication_policy="public-gps-v2", description=None
        ).model_dump_json()
    )
    assert "description" not in ReportUpdate(revision=1).model_fields_set
    assert "description" in ReportUpdate(revision=1, description=None).model_fields_set


def test_new_policy_required():
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        ReportCreate(draft_id=uuid4(), description="legacy client")
    with pytest.raises(ValidationError):
        ReportCreate(draft_id=uuid4(), publication_policy="public-gps-v2", description="a" * 5001)


def test_public_reads_optional_text_and_rejected_guards(client, accounts, monkeypatch):
    prediction(monkeypatch)
    report = create(client, accounts["owner"], description=None).json()["data"]
    assert report["description"] == ""
    owner, peer = accounts["owner"]["headers"], accounts["other"]["headers"]
    with SessionLocal() as db:
        post = db.scalar(select(CommunityPost).where(CommunityPost.report_id == UUID(report["id"])))
        identity = str(post.id)
        assert post.privacy_version == "public-gps-v2"
    path = "/api/v1/community/posts/" + identity
    assert client.get(path).status_code == 404  # Processing is owner-only.
    assert run_once()
    public = client.get(path)
    assert public.status_code == 200
    value = public.json()["data"]
    assert value["caption"] == "" and value["image_url"]
    assert value["latitude"] == report["latitude"] and value["longitude"] == report["longitude"]
    assert not value["is_owner"] and not value["liked_by_me"]
    assert not set(value) & {"email", "user_id", "report_id", "image_path", "source_image_path"}
    assert public.headers["cache-control"] == "no-store"
    assert client.get(path, headers={"Authorization": "Bearer invalid"}).status_code == 401
    assert client.get(path, headers={"Authorization": "Basic invalid"}).status_code == 401
    assert client.get("/api/v1/regions").status_code == 200
    assert client.get(path + "/comments").status_code == 200
    assert client.put(path + "/like").status_code == 401
    assert (
        client.post(
            path + "/comments", json={"body": "hello", "request_id": str(uuid4())}
        ).status_code
        == 401
    )
    assert client.put(path + "/like", headers=peer).status_code == 200
    assert not client.get(path).json()["data"]["liked_by_me"]
    # PATCH omitted preserves; explicit null clears, short strings persist in DB.
    url = "/api/v1/reports/" + report["id"]
    changed = client.patch(
        url, headers=owner, json={"revision": report["revision"], "description": " x "}
    ).json()["data"]
    assert changed["description"] == "x"
    preserved = client.patch(url, headers=owner, json={"revision": changed["revision"]}).json()[
        "data"
    ]
    assert preserved["description"] == "x"
    cleared = client.patch(
        url, headers=owner, json={"revision": changed["revision"], "description": None}
    ).json()["data"]
    assert cleared["description"] == ""
    with SessionLocal.begin() as db:
        db.get(Report, UUID(report["id"])).status = "Rejected"
    for headers in ({}, peer, owner):
        assert client.get(path, headers=headers).status_code == 404
        assert client.get(path + "/comments", headers=headers).status_code == 404
        assert client.get("/api/v1/community/feed", headers=headers).json()["data"]["posts"] == []
        assert (
            client.get("/api/v1/community/map?status=Rejected", headers=headers).json()["data"][
                "features"
            ]
            == []
        )
    assert client.put(path + "/like", headers=peer).status_code == 404
    assert (
        client.post(
            path + "/comments", headers=peer, json={"body": "hello", "request_id": str(uuid4())}
        ).status_code
        == 404
    )
    assert client.get(url, headers=owner).status_code == 200


def test_v1_consent_not_silently_upgraded(client, accounts, monkeypatch):
    prediction(monkeypatch)
    report = create(client, accounts["owner"]).json()["data"]
    assert run_once()
    with SessionLocal.begin() as db:
        post = db.scalar(select(CommunityPost).where(CommunityPost.report_id == UUID(report["id"])))
        post.privacy_version = "gps-community-v1"
        identity = str(post.id)
    assert client.get("/api/v1/community/posts/" + identity).status_code == 404
    assert client.get("/api/v1/community/feed").json()["data"]["posts"] == []
    assert client.get("/api/v1/community/map").json()["data"]["features"] == []
