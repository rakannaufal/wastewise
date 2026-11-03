from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError

from app.cleanup import run_once
from app.db import SessionLocal
from app.inference import predictor
from app.models import Report, ReportDraft
from app.storage import storage
from tests.test_api import create, photo


def draft(client, account, **fields):
    return client.post(
        "/api/v1/report-drafts",
        headers=account["headers"],
        data={"request_id": str(uuid4()), "photo_source": "gallery", **fields},
        files={"image": ("test.png", photo(), "image/png")},
    )


def evidence(**changes):
    return {
        "latitude": -6.2,
        "longitude": 106.8,
        "location_source": "device_upload_confirmed",
        "location_recorded_at": datetime.now(UTC).isoformat(),
        "location_accuracy_m": 10,
        "confirmed": True,
        **changes,
    }


def test_draft_provenance_ownership_and_idempotency(client, accounts, monkeypatch):
    calls = []

    def predict(_):
        calls.append(True)
        return {"category": "paper", "confidence": 93, "model_version": "test-only"}

    monkeypatch.setattr(predictor, "predict", predict)
    owner = accounts["owner"]["headers"]
    other = accounts["other"]["headers"]
    request_id = str(uuid4())
    first = draft(client, accounts["owner"], request_id=request_id)
    assert first.status_code == 201, first.text
    row = first.json()["data"]
    assert draft(client, accounts["owner"], request_id=request_id).json()["data"]["id"] == row["id"]
    assert len(calls) == 1
    url = f"/api/v1/report-drafts/{row['id']}"
    for invalid in ({"latitude": -6.2, "longitude": None}, {"photo_source": None}):
        with pytest.raises(IntegrityError), SessionLocal.begin() as db:
            db.execute(
                update(ReportDraft).where(ReportDraft.id == UUID(row["id"])).values(**invalid)
            )
    assert client.get(url, headers=other).status_code == 404
    assert client.patch(url, headers=owner, json=evidence(confirmed=False)).status_code == 422
    assert (
        client.patch(url, headers=owner, json=evidence(location_accuracy_m=100)).status_code == 422
    )
    assert (
        client.patch(
            url,
            headers=owner,
            json=evidence(
                location_recorded_at=(datetime.now(UTC) - timedelta(minutes=2)).isoformat()
            ),
        ).status_code
        == 422
    )
    assert (
        client.patch(
            url, headers=owner, json=evidence(location_source="device_capture")
        ).status_code
        == 422
    )
    assert client.patch(url, headers=owner, json=evidence()).status_code == 200
    payload = {
        "publication_policy": "public-gps-v2",
        "draft_id": row["id"],
        "description": "Sampah kertas dekat taman",
    }
    headers = {**owner, "Idempotency-Key": str(uuid4())}
    assert (
        client.post(
            "/api/v1/reports", headers=headers, json={**payload, "category": "plastic"}
        ).status_code
        == 422
    )
    with ThreadPoolExecutor(2) as pool:
        results = list(
            pool.map(
                lambda _: client.post("/api/v1/reports", headers=headers, json=payload), range(2)
            )
        )
    assert [r.status_code for r in results] == [201, 201]
    saved = results[0].json()["data"]
    assert saved["id"] == results[1].json()["data"]["id"] and saved["category"] == "paper"
    assert len(calls) == 1
    assert (
        client.post(
            "/api/v1/reports",
            headers=headers,
            json={**payload, "description": "Deskripsi berbeda cukup panjang"},
        ).status_code
        == 409
    )
    assert client.delete(url, headers=owner).status_code == 409
    assert client.get(saved["thumbnail_url"]).status_code == 200


def test_camera_requires_nearby_gps_and_expired_drafts(client, accounts):
    owner = accounts["owner"]["headers"]
    stamp = datetime.now(UTC)
    row = draft(
        client, accounts["owner"], photo_source="camera", captured_at=stamp.isoformat()
    ).json()["data"]
    url = f"/api/v1/report-drafts/{row['id']}"
    assert client.patch(url, headers=owner, json=evidence()).status_code == 422
    assert (
        client.patch(
            url,
            headers=owner,
            json=evidence(
                location_source="device_capture",
                location_recorded_at=(stamp - timedelta(seconds=31)).isoformat(),
            ),
        ).status_code
        == 422
    )
    assert (
        client.patch(
            url,
            headers=owner,
            json=evidence(location_source="device_capture", location_recorded_at=stamp.isoformat()),
        ).status_code
        == 200
    )
    with SessionLocal.begin() as db:
        value = db.get(ReportDraft, UUID(row["id"]))
        value.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        image_path = value.image_path
    assert client.get(url, headers=owner).status_code == 409
    while run_once():
        pass
    assert not storage.path(image_path).exists()


def test_failed_analysis_retries_existing_image(client, accounts, monkeypatch):
    owner = accounts["owner"]["headers"]
    monkeypatch.setattr(predictor, "predict", lambda _: None)
    row = draft(client, accounts["owner"]).json()["data"]
    assert row["classification_state"] == "analysis_failed"
    assert (
        client.patch(
            f"/api/v1/report-drafts/{row['id']}", headers=owner, json=evidence()
        ).status_code
        == 200
    )
    headers = {**owner, "Idempotency-Key": str(uuid4())}
    assert (
        client.post(
            "/api/v1/reports",
            headers=headers,
            json={
                "publication_policy": "public-gps-v2",
                "draft_id": row["id"],
                "description": "Foto untuk mencoba kembali",
            },
        ).status_code
        == 503
    )
    monkeypatch.setattr(
        predictor,
        "predict",
        lambda _: {"category": "paper", "confidence": 96, "model_version": "test-only"},
    )
    assert (
        client.post(f"/api/v1/report-drafts/{row['id']}/retry", headers=owner).json()["data"][
            "prediction"
        ]["category"]
        == "paper"
    )


def test_edit_review_workflow_and_dashboard(client, accounts):
    owner, admin = accounts["owner"]["headers"], accounts["admin"]["headers"]
    response = create(client, accounts["owner"])
    assert response.status_code == 201, response.text
    row = response.json()["data"]
    url = f"/api/v1/reports/{row['id']}"
    assert (
        client.patch(
            url, headers=owner, json={"revision": 1, "description": "Deskripsi laporan diperbaiki"}
        ).status_code
        == 200
    )
    assert (
        client.patch(
            url, headers=owner, json={"revision": 1, "description": "Deskripsi lama menimpa baru"}
        ).status_code
        == 409
    )
    assert (
        client.patch(
            url + "/review",
            headers=owner,
            json={"revision": 2, "category": "paper", "reason": "Diperiksa ulang"},
        ).status_code
        == 403
    )
    reviewed = client.patch(
        url + "/review",
        headers=admin,
        json={"revision": 2, "category": "paper", "reason": "Foto menunjukkan kertas"},
    ).json()["data"]
    assert (
        reviewed["ai_predicted_category"] == row["ai_predicted_category"]
        and reviewed["category"] == "paper"
    )
    assert (
        client.patch(
            url + "/status", headers=admin, json={"revision": 3, "status": "Completed"}
        ).status_code
        == 409
    )
    assert (
        client.patch(
            url + "/status", headers=admin, json={"revision": 3, "status": "In Progress"}
        ).status_code
        == 200
    )
    assert (
        client.patch(
            url, headers=owner, json={"revision": 4, "description": "Tidak boleh diedit sekarang"}
        ).status_code
        == 409
    )
    assert (
        client.patch(
            url + "/status", headers=admin, json={"revision": 4, "status": "Rejected"}
        ).status_code
        == 422
    )
    assert (
        client.patch(
            url + "/status", headers=admin, json={"revision": 4, "status": "Completed"}
        ).status_code
        == 200
    )
    events = client.get(url + "/events", headers=owner).json()["data"]
    assert len(events) == 5
    assert client.get("/api/v1/admin/dashboard", headers=owner).status_code == 403
    dashboard = client.get("/api/v1/admin/dashboard", headers=admin)
    assert dashboard.status_code == 200, dashboard.text
    data = dashboard.json()["data"]
    assert data["cohort"]["total"] == 1 and data["cohort"]["by_status"]["Completed"] == 1
    assert data["median_completion_hours"] is not None and len(data["trend"]) == 30
    assert (
        client.get("/api/v1/admin/dashboard?timezone=Invalid/Zone", headers=admin).status_code
        == 422
    )


def test_replacement_cleanup_and_time_boundary(client, accounts):
    owner, admin = accounts["owner"]["headers"], accounts["admin"]["headers"]
    row = create(client, accounts["owner"]).json()["data"]
    with SessionLocal() as db:
        original = db.get(Report, UUID(row["id"]))
        old_paths = [original.image_path, original.thumbnail_path]
    new = draft(client, accounts["owner"]).json()["data"]
    assert (
        client.patch(
            f"/api/v1/report-drafts/{new['id']}", headers=owner, json=evidence()
        ).status_code
        == 200
    )
    response = client.patch(
        f"/api/v1/reports/{row['id']}",
        headers=owner,
        json={
            "revision": 1,
            "description": "Foto pengganti laporan yang sama",
            "draft_id": new["id"],
        },
    )
    assert response.status_code == 200, response.text
    while run_once():
        pass
    assert all(not storage.path(path).exists() for path in old_paths)
    assert client.get(response.json()["data"]["thumbnail_url"]).status_code == 200
    with SessionLocal.begin() as db:
        value = db.get(Report, UUID(row["id"]))
        value.created_at = datetime(2026, 1, 1, 17, 0, tzinfo=UTC)
    params = {"date_from": "2026-01-02T00:00:00+07:00", "date_to": "2026-01-03T00:00:00+07:00"}
    dashboard = client.get("/api/v1/admin/dashboard", headers=admin, params=params).json()["data"]
    assert dashboard["cohort"]["total"] == 1 and dashboard["trend"] == [
        {"date": "2026-01-02", "count": 1}
    ]
    params["date_to"] = params["date_from"]
    params["date_from"] = "2026-01-01T00:00:00+07:00"
    assert (
        client.get("/api/v1/reports", headers=admin, params=params).json()["data"]["pagination"][
            "total_items"
        ]
        == 0
    )


def test_draft_uploads_and_inference_overlap(client, accounts, monkeypatch):
    from threading import Barrier

    barrier = Barrier(3, timeout=5)
    original_put = storage.put

    def put(*args):
        barrier.wait()
        return original_put(*args)

    def predict(_):
        barrier.wait()
        return {"category": "paper", "confidence": 93, "model_version": "test-only"}

    monkeypatch.setattr(storage, "put", put)
    monkeypatch.setattr(predictor, "predict", predict)
    response = draft(client, accounts["owner"])
    assert response.status_code == 201, response.text
    assert response.json()["data"]["prediction"]["category"] == "paper"


def test_thumbnail_failure_starts_no_remote_upload(client, accounts, monkeypatch):
    from app import drafts

    def fail_thumbnail(_):
        raise RuntimeError("Injected thumbnail failure")

    calls = []
    monkeypatch.setattr(drafts, "thumbnail", fail_thumbnail)
    monkeypatch.setattr(storage, "put", lambda *args: calls.append(args))
    response = draft(client, accounts["owner"])
    assert response.status_code == 503
    assert calls == []


def test_partial_upload_failure_queues_successful_sibling(client, accounts, monkeypatch):
    from threading import Lock

    from sqlalchemy import select

    from app.models import CleanupJob

    original_put = storage.put
    lock = Lock()
    calls = []
    paths = []

    def put(*args):
        with lock:
            calls.append(True)
            first = len(calls) == 1
        if first:
            raise RuntimeError("Injected upload failure")
        path = original_put(*args)
        paths.append(path)
        return path

    monkeypatch.setattr(storage, "put", put)
    response = draft(client, accounts["owner"])
    assert response.status_code == 503
    assert len(paths) == 1
    with SessionLocal() as db:
        job = db.scalar(select(CleanupJob).where(CleanupJob.object_path == paths[0]))
        assert job is not None and job.status == "pending"
        assert db.scalar(select(ReportDraft).where(ReportDraft.image_path == paths[0])) is None
    while run_once():
        pass
    assert not storage.path(paths[0]).exists()


def test_discard_is_idempotent_expired_and_owner_scoped(client, accounts):
    from sqlalchemy import select

    from app.models import CleanupJob

    row = draft(client, accounts["owner"]).json()["data"]
    url = f"/api/v1/report-drafts/{row['id']}"
    assert client.delete(url, headers=accounts["other"]["headers"]).status_code == 200
    with SessionLocal.begin() as db:
        value = db.get(ReportDraft, UUID(row["id"]))
        assert value is not None
        paths = [value.image_path, value.thumbnail_path]
        value.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    for _ in range(2):
        assert client.delete(url, headers=accounts["owner"]["headers"]).status_code == 200
    with SessionLocal() as db:
        assert db.get(ReportDraft, UUID(row["id"])) is None
        assert (
            len(list(db.scalars(select(CleanupJob).where(CleanupJob.object_path.in_(paths))))) == 2
        )
    while run_once():
        pass
    assert all(not storage.path(path).exists() for path in paths)
