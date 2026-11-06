from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import select

from app.community_worker import run_once
from app.db import SessionLocal
from app.inference import predictor
from app.models import CommunityPost, Region
from app.region_reference import contains, geometries, names
from tests.test_api import create


def prediction(monkeypatch):
    monkeypatch.setattr(
        predictor,
        "predict",
        lambda _: {"category": "paper", "confidence": 93, "model_version": "test-only"},
    )


def test_private_then_publish_interact_withdraw(client, accounts, monkeypatch):
    prediction(monkeypatch)
    owner, other = accounts["owner"]["headers"], accounts["other"]["headers"]
    report = create(client, accounts["owner"], legacy_private=True).json()["data"]
    assert client.get("/api/v1/community/feed").status_code == 200
    assert client.get("/api/v1/community/feed", headers=other).json()["data"]["posts"] == []
    body = {
        "report_id": report["id"],
        "caption": "Sampah dekat taman warga",
        "consent": True,
        "publication_policy": "public-gps-v2",
    }
    assert (
        client.post(
            "/api/v1/community/posts", json={**body, "consent": False}, headers=owner
        ).status_code
        == 422
    )
    assert client.post("/api/v1/community/posts", json=body, headers=other).status_code == 404
    response = client.post("/api/v1/community/posts", json=body, headers=owner)
    assert response.status_code == 201, response.text
    post = response.json()["data"]
    path = "/api/v1/community/posts/" + post["id"]
    assert client.get(path, headers=other).status_code == 404
    assert run_once()
    value = client.get(path, headers=other).json()["data"]
    assert value["image_url"] and value["state"] == "published"
    assert not set(value) & {"user_id", "report_id", "email", "image_path", "source_image_path"}
    assert value["latitude"] == report["latitude"]
    for _ in range(2):
        assert client.put(path + "/like", headers=other).status_code == 200
    assert client.get(path, headers=other).json()["data"]["like_count"] == 1
    payload = {"body": "Mari pilah bersama", "request_id": str(uuid4())}
    first = client.post(path + "/comments", headers=other, json=payload)
    second = client.post(path + "/comments", headers=other, json=payload)
    assert first.status_code == second.status_code == 201
    assert first.json()["data"]["id"] == second.json()["data"]["id"]
    assert (
        client.post(
            path + "/comments", headers=other, json={**payload, "body": "Teks berbeda"}
        ).status_code
        == 409
    )
    assert client.get(path, headers=other).json()["data"]["comment_count"] == 1
    feed_post = client.get("/api/v1/community/feed", headers=other).json()["data"]["posts"][0]
    assert feed_post["author_name"] == "Warga"
    assert feed_post["like_count"] == 1
    assert feed_post["comment_count"] == 1
    assert feed_post["liked_by_me"] is True
    assert (
        client.patch(
            path,
            headers=other,
            json={"caption": "Edit tanpa hak akses", "revision": value["revision"]},
        ).status_code
        == 403
    )
    assert (
        client.patch(
            path, headers=owner, json={"caption": "Edit dengan revisi lama", "revision": 1}
        ).status_code
        == 409
    )
    assert client.delete(path, headers=owner).status_code == 200
    assert client.delete(path, headers=owner).status_code == 200
    assert client.get(path, headers=other).status_code == 404
    assert client.get("/api/v1/reports/" + report["id"], headers=owner).status_code == 200
    assert client.put(path + "/like", headers=other).status_code == 404


def test_map_regions_cursor_and_moderation(client, accounts, monkeypatch):
    prediction(monkeypatch)
    owner, other, admin = [accounts[k]["headers"] for k in ("owner", "other", "admin")]
    report = create(client, accounts["owner"], share_to_community=True).json()["data"]
    assert run_once()
    with SessionLocal.begin() as db:
        post = db.scalar(select(CommunityPost).where(CommunityPost.report_id == UUID(report["id"])))
        identity = str(post.id)
        if db.get(Region, "99") is None:
            db.add(Region(code="99", level=1, name="Test region", source="test"))
            db.flush()
        post.region_code = "99"
    p = "/api/v1/community/posts/" + identity
    assert client.get("/api/v1/regions", headers=owner).status_code == 200
    assert client.get("/api/v1/community/feed?cursor=invalid", headers=owner).status_code == 422
    assert client.get("/api/v1/community/map?bbox=nan,0,1,2", headers=owner).status_code == 422
    assert client.get("/api/v1/community/map?region_code=unknown", headers=owner).status_code == 422
    points = client.get("/api/v1/community/map?region_code=99", headers=owner).json()["data"]
    assert points["features"][0]["count"] == 1
    assert points["features"][0]["post_id"] == identity
    assert (
        client.post(
            "/api/v1/community/flags",
            headers=other,
            json={"post_id": identity, "reason": "Konten perlu ditinjau"},
        ).status_code
        == 201
    )
    v = client.get(p, headers=admin).json()["data"]
    assert (
        client.patch(
            "/api/v1/admin/community/posts/" + identity,
            headers=other,
            json={"state": "hidden", "reason": "Tidak boleh", "revision": v["revision"]},
        ).status_code
        == 403
    )
    hidden = client.patch(
        "/api/v1/admin/community/posts/" + identity,
        headers=admin,
        json={
            "state": "hidden",
            "reason": "Privasi foto perlu diperiksa",
            "revision": v["revision"],
        },
    )
    assert hidden.status_code == 200, hidden.text
    assert client.get(p, headers=other).status_code == 404
    assert (
        client.get("/api/v1/community/map?region_code=99", headers=other).json()["data"]["features"]
        == []
    )
    assert (
        client.post(
            "/api/v1/community/posts",
            headers=owner,
            json={
                "report_id": report["id"],
                "caption": "Coba publikasi kembali",
                "consent": True,
                "publication_policy": "public-gps-v2",
            },
        ).status_code
        == 409
    )
    assert client.get("/api/v1/admin/community/flags", headers=admin).json()["data"] == []


def test_worker_partial_upload_retry(client, accounts, monkeypatch):
    from app.storage import storage

    prediction(monkeypatch)
    report = create(client, accounts["owner"], share_to_community=True).json()["data"]
    original = storage.put
    calls = []

    def failing_put(owner, content, **kwargs):
        if calls:
            raise OSError("test-only upload failure")
        path = original(owner, content, **kwargs)
        calls.append(path)
        return path

    monkeypatch.setattr(storage, "put", failing_put)
    assert run_once()
    with SessionLocal.begin() as db:
        p = db.scalar(select(CommunityPost).where(CommunityPost.report_id == UUID(report["id"])))
        assert p.state == "processing" and p.image_path is None
        p.next_attempt_at = datetime.now(UTC)
    monkeypatch.setattr(storage, "put", original)
    assert run_once()
    with SessionLocal() as db:
        p = db.scalar(select(CommunityPost).where(CommunityPost.report_id == UUID(report["id"])))
        assert p.state == "published" and p.attempts == 2


def test_reference_parser_and_polygon_holes():
    assert names("DROP TABLE ignored; ('11','Aceh'),('11.01','Kabupaten')") == [
        ("11", "Aceh"),
        ("11.01", "Kabupaten"),
    ]
    parsed = list(
        geometries(
            "('11.01.01.1001','Test',0,0,'[[[0,0],[0,4],[4,4],[4,0],[0,0]],[[1,1],[1,2],[2,2],[2,1],[1,1]]]')"
        )
    )
    assert len(parsed) == 1
    g = parsed[0][1]
    assert contains(g, 0.5, 0.5)
    assert not contains(g, 1.5, 1.5)
    assert not contains(g, 5, 5)


def test_cleanup_can_rearm_preserved_community_media(client, accounts, monkeypatch):
    from app.cleanup import run_once as cleanup
    from app.models import CleanupJob
    from app.storage import storage
    from app.workflow import enqueue

    prediction(monkeypatch)
    report = create(client, accounts["owner"], share_to_community=True).json()["data"]
    assert run_once()
    with SessionLocal.begin() as db:
        post = db.scalar(select(CommunityPost).where(CommunityPost.report_id == UUID(report["id"])))
        path, identity = post.image_path, str(post.id)
        job = db.scalar(select(CleanupJob).where(CleanupJob.object_path == path))
        job.next_attempt_at = datetime.now(UTC)
    while cleanup():
        pass
    assert storage.path(path).exists()
    assert (
        client.delete(
            "/api/v1/community/posts/" + identity, headers=accounts["owner"]["headers"]
        ).status_code
        == 200
    )
    while cleanup():
        pass
    assert not storage.path(path).exists()
    # Re-enqueuing a completed protected job must allow legitimate later deletion.
    with SessionLocal.begin() as db:
        enqueue(db, path)
    assert cleanup()


def test_like_cors_and_missing_report(client, accounts):
    from app.config import settings

    response = client.options(
        "/api/v1/community/posts/" + str(uuid4()) + "/like",
        headers={
            "Origin": settings.cors_origins.split(",")[0],
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert response.status_code == 200
    assert "PUT" in response.headers["access-control-allow-methods"]
    assert (
        client.post(
            "/api/v1/community/posts",
            headers=accounts["owner"]["headers"],
            json={
                "report_id": str(uuid4()),
                "caption": " " * 20,
                "consent": True,
                "publication_policy": "public-gps-v2",
            },
        ).status_code
        == 404
    )


def test_withdrawal_during_derivative_upload_cannot_republish(client, accounts, monkeypatch):
    from app.cleanup import run_once as cleanup
    from app.storage import storage

    prediction(monkeypatch)
    report = create(client, accounts["owner"], share_to_community=True).json()["data"]
    with SessionLocal() as db:
        identity = str(
            db.scalar(select(CommunityPost.id).where(CommunityPost.report_id == UUID(report["id"])))
        )
    original = storage.put
    paths = []

    def intercept(owner, content, **kwargs):
        path = original(owner, content, **kwargs)
        paths.append(path)
        if len(paths) == 2:
            assert (
                client.delete(
                    "/api/v1/community/posts/" + identity, headers=accounts["owner"]["headers"]
                ).status_code
                == 200
            )
        return path

    monkeypatch.setattr(storage, "put", intercept)
    assert run_once()
    with SessionLocal() as db:
        post = db.get(CommunityPost, UUID(identity))
        assert post.state == "withdrawn" and post.image_path is None
    assert (
        client.get(
            "/api/v1/community/posts/" + identity, headers=accounts["other"]["headers"]
        ).status_code
        == 404
    )
    while cleanup():
        pass
    assert all(not storage.path(path).exists() for path in paths)


def test_feed_includes_eligible_statuses_without_revealing_private_archives(
    client, accounts, monkeypatch
):
    from app.models import Report

    prediction(monkeypatch)
    owner, peer = accounts["owner"]["headers"], accounts["other"]["headers"]
    expected = {}
    for status in ("Pending", "In Progress", "Completed", "Rejected"):
        report = create(client, accounts["owner"], share_to_community=True).json()["data"]
        assert run_once()
        with SessionLocal.begin() as db:
            row = db.get(Report, UUID(report["id"]))
            row.status = status
            post = db.scalar(select(CommunityPost).where(CommunityPost.report_id == row.id))
            if status != "Rejected":
                expected[str(post.id)] = status
    private = create(client, accounts["owner"], legacy_private=True).json()["data"]
    result = client.get("/api/v1/community/feed", headers=peer).json()["data"]
    assert {p["id"]: p["status"] for p in result["posts"]} == expected
    for status in expected.values():
        result = client.get(
            "/api/v1/community/feed", params={"status": status}, headers=peer
        ).json()["data"]
        assert len(result["posts"]) == 1 and result["posts"][0]["status"] == status
        points = client.get(
            "/api/v1/community/map", params={"status": status}, headers=peer
        ).json()["data"]
        assert sum(p["count"] for p in points["features"]) == 1
    seen, cursor = [], None
    for _ in range(2):
        params = {"per_page": 2}
        if cursor:
            params["cursor"] = cursor
        result = client.get("/api/v1/community/feed", params=params, headers=peer).json()["data"]
        seen.extend(p["id"] for p in result["posts"])
        cursor = result["next_cursor"]
    assert len(seen) == len(set(seen)) == 3 and not cursor
    assert client.get("/api/v1/reports/" + private["id"], headers=owner).status_code == 200
    assert client.get("/api/v1/reports/" + private["id"], headers=peer).status_code == 404
