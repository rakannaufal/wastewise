import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.config import settings
from app.db import SessionLocal
from app.main import app
from app.models import CleanupJob, Report, ReportDraft, User
from app.security import hash_password
from app.storage import storage


@pytest.fixture
def client():
    if settings.environment != "test":
        raise RuntimeError("Tests require ENVIRONMENT=test and an isolated test database")
    settings.rate_limit_enabled = False
    with TestClient(app) as value:
        yield value


@pytest.fixture
def accounts(client):
    namespace = uuid.uuid4().hex
    password = "WasteWiseTest1!"
    ids = []
    values = {}
    for name, role in [("owner", "user"), ("other", "user"), ("admin", "admin")]:
        email = f"{name}-{namespace}@example.com"
        with SessionLocal.begin() as db:
            row = User(
                email=email,
                full_name=f"Test {name}",
                password_hash=hash_password(password),
                role=role,
            )
            db.add(row)
            db.flush()
            ids.append(row.id)
            user_id = str(row.id)
        response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert response.status_code == 200
        values[name] = {
            "id": user_id,
            "email": email,
            "password": password,
            "headers": {"Authorization": "Bearer " + response.json()["data"]["access_token"]},
        }
    yield values
    with SessionLocal.begin() as db:
        paths = list(db.scalars(select(Report.image_path).where(Report.user_id.in_(ids))))
        paths += list(
            db.scalars(
                select(Report.thumbnail_path).where(
                    Report.user_id.in_(ids), Report.thumbnail_path.is_not(None)
                )
            )
        )
        for image, thumb in db.execute(
            select(ReportDraft.image_path, ReportDraft.thumbnail_path).where(
                ReportDraft.user_id.in_(ids)
            )
        ):
            paths.extend([image, thumb])
        jobs = db.scalars(select(CleanupJob)).all()
        for job in jobs:
            if job.object_path.split("/")[0] in {str(value) for value in ids}:
                paths.append(job.object_path)
                db.delete(job)
        db.execute(delete(User).where(User.id.in_(ids)))
    for path in paths:
        storage.delete(path)
