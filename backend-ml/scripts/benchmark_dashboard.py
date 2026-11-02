"""Synthetic 10k-report local benchmark; never insert fixtures into cloud databases."""

import json
import statistics
from datetime import UTC, datetime, timedelta
from time import perf_counter
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import delete, insert, text

from app.config import ROOT, settings
from app.db import SessionLocal, engine
from app.main import app
from app.models import Report, User
from app.security import token_for
from ml.common import CLASSES


def main():
    if (
        engine.url.database != "wastewise_browser"
        or settings.auth_provider != "local"
        or settings.storage_backend != "local"
    ):
        raise SystemExit(
            "Benchmark requires isolated wastewise_browser database and local adapters"
        )
    subject = uuid4()
    now = datetime.now(UTC)
    rows = [
        {
            "id": uuid4(),
            "user_id": subject,
            "category": CLASSES[i % 12],
            "description": "Synthetic benchmark report, not a real waste observation",
            "image_path": f"{subject}/{uuid4()}.jpg",
            "latitude": -6.2,
            "longitude": 106.8,
            "status": ["Pending", "In Progress", "Completed", "Rejected"][i % 4],
            "created_at": now - timedelta(hours=i % 2000),
            "updated_at": now,
        }
        for i in range(10000)
    ]
    with SessionLocal.begin() as db:
        user = User(
            id=subject,
            email=f"benchmark-{subject}@example.com",
            full_name="Synthetic benchmark",
            password_hash="unused benchmark fixture",
            role="admin",
        )
        db.add(user)
        db.flush()
        token = token_for(user)
        db.execute(insert(Report), rows)
    try:
        with TestClient(app) as client:
            timings = []
            for i in range(31):
                started = perf_counter()
                response = client.get(
                    "/api/v1/admin/dashboard", headers={"Authorization": "Bearer " + token}
                )
                elapsed = (perf_counter() - started) * 1000
                assert response.status_code == 200, response.text
                if i:
                    timings.append(elapsed)
        with SessionLocal() as db:
            plan = db.execute(
                text(
                    "EXPLAIN (ANALYZE, FORMAT JSON) SELECT id FROM app_private.waste_reports WHERE status IN ('Pending', 'In Progress') ORDER BY created_at, id LIMIT 5"
                )
            ).scalar()
        result = {
            "checked_at": datetime.now(UTC).isoformat(),
            "fixture_count": 10000,
            "requests": len(timings),
            "concurrency": 1,
            "median_ms": statistics.median(timings),
            "p95_ms": sorted(timings)[28],
            "environment": "macOS arm64, local PostgreSQL17, ASGI TestClient, local JWT and local signed media",
            "limitation": "Synthetic legacy rows; no Supabase verification/network/Storage or browser included. Does not prove cloud p95<=1s.",
            "queue_query_plan": plan,
        }
        (ROOT / "docs/evidence/workflow-dashboard-benchmark.json").write_text(
            json.dumps(result, indent=2)
        )
        print(
            json.dumps(
                {key: value for key, value in result.items() if key != "queue_query_plan"}, indent=2
            )
        )
    finally:
        with SessionLocal.begin() as db:
            db.execute(delete(User).where(User.id == subject))


if __name__ == "__main__":
    main()
