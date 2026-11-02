"""Create/reuse an isolated local test database; migrate, grant, and execute pytest."""

import getpass
import os
import secrets
import subprocess
import sys
from pathlib import Path

import psycopg
from dotenv import dotenv_values
from psycopg import sql
from sqlalchemy.engine import URL

root = Path(__file__).resolve().parents[2]
socket = str(root / ".local/socket")
password = secrets.token_urlsafe(32)
with psycopg.connect(
    host=socket, port=54339, dbname="postgres", user=getpass.getuser(), autocommit=True
) as connection:
    if not connection.execute(
        "SELECT 1 FROM pg_database WHERE datname = 'wastewise_test'"
    ).fetchone():
        connection.execute("CREATE DATABASE wastewise_test")
    command = (
        "ALTER ROLE"
        if connection.execute("SELECT 1 FROM pg_roles WHERE rolname = 'wastewise_tests'").fetchone()
        else "CREATE ROLE"
    )
    connection.execute(
        sql.SQL(command + " wastewise_tests LOGIN PASSWORD {}").format(sql.Literal(password))
    )
config = dotenv_values(root / "backend-ml/.env")
env = {
    **os.environ,
    "ENVIRONMENT": "test",
    "AUTH_PROVIDER": "local",
    "STORAGE_BACKEND": "local",
    "STORAGE_PATH": str(root / ".local/test-images"),
    "JWT_SECRET": config["JWT_SECRET"],
}
env["DATABASE_URL"] = f"postgresql+psycopg:///wastewise_test?host={socket}&port=54339"
subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], env=env, check=True)
with psycopg.connect(
    host=socket, port=54339, dbname="wastewise_test", user=getpass.getuser(), autocommit=True
) as connection:
    connection.execute("GRANT USAGE ON SCHEMA app_private TO wastewise_tests")
    connection.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app_private TO wastewise_tests"
    )
env["DATABASE_URL"] = URL.create(
    "postgresql+psycopg",
    username="wastewise_tests",
    password=password,
    host="127.0.0.1",
    port=54339,
    database="wastewise_test",
).render_as_string(hide_password=False)
raise SystemExit(
    subprocess.run([sys.executable, "-m", "pytest", *sys.argv[1:]], env=env).returncode
)
