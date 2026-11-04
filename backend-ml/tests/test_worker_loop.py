import pytest
from sqlalchemy.exc import OperationalError

from app.db import SessionLocal
from app.models import WorkerHeartbeat
from app.worker_loop import run_worker


def test_continuous_worker_retries_database_outage_then_recovers():
    calls, pauses = [], []

    def job():
        calls.append(True)
        if len(calls) <= 2:
            raise OperationalError("redacted", {}, Exception("unavailable"))
        if len(calls) == 3:
            return False
        raise KeyboardInterrupt()

    with pytest.raises(KeyboardInterrupt):
        run_worker(job, pause=pauses.append)
    assert pauses == [5, 10, 5]
    assert len(calls) == 4


def test_one_shot_fails_loudly_instead_of_claiming_completion():
    def job():
        raise OperationalError("redacted", {}, Exception("unavailable"))

    with pytest.raises(OperationalError):
        run_worker(job, once=True)


def test_named_worker_writes_a_heartbeat():
    run_worker(lambda: False, once=True, worker_name="test-worker")
    with SessionLocal() as db:
        row = db.get(WorkerHeartbeat, "test-worker")
        assert row is not None
        assert row.heartbeat_at is not None
    with SessionLocal.begin() as db:
        db.delete(db.get(WorkerHeartbeat, "test-worker"))
