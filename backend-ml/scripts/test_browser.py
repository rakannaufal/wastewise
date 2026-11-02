"""Run browser workflows against isolated local services; never use the configured cloud DB."""

import getpass
import os
import secrets
import subprocess
import sys
import time
from pathlib import Path

import httpx
import psycopg
from dotenv import dotenv_values
from psycopg import sql
from sqlalchemy.engine import URL


def main():
    root = Path(__file__).resolve().parents[2]
    socket = str(root / ".local/socket")
    password = secrets.token_urlsafe(32)
    with psycopg.connect(
        host=socket, port=54339, dbname="postgres", user=getpass.getuser(), autocommit=True
    ) as db:
        if not db.execute("SELECT 1 FROM pg_database WHERE datname='wastewise_browser'").fetchone():
            db.execute("CREATE DATABASE wastewise_browser")
        command = (
            "ALTER ROLE"
            if db.execute("SELECT 1 FROM pg_roles WHERE rolname='wastewise_browser'").fetchone()
            else "CREATE ROLE"
        )
        db.execute(
            sql.SQL(command + " wastewise_browser LOGIN PASSWORD {}").format(sql.Literal(password))
        )
    env = {
        **os.environ,
        "AUTH_PROVIDER": "local",
        "STORAGE_BACKEND": "local",
        "ENVIRONMENT": "development",
        "RATE_LIMIT_ENABLED": "false",
        "JWT_SECRET": dotenv_values(root / "backend-ml/.env")["JWT_SECRET"],
        "STORAGE_PATH": str(root / ".local/browser-images"),
        "PUBLIC_API_URL": "http://127.0.0.1:8001",
        "PUBLIC_WEB_URL": "http://127.0.0.1:5180",
        "CORS_ORIGINS": "http://127.0.0.1:5180,http://127.0.0.1:8083",
        "VITE_API_URL": "http://127.0.0.1:8001",
        "EXPO_PUBLIC_API_URL": "http://127.0.0.1:8001",
        "E2E_API_URL": "http://127.0.0.1:8001",
        "E2E_WEB_URL": "http://127.0.0.1:5180",
        "E2E_MOBILE_URL": "http://127.0.0.1:8083",
    }
    env["DATABASE_URL"] = f"postgresql+psycopg:///wastewise_browser?host={socket}&port=54339"
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=root / "backend-ml",
        env=env,
        check=True,
    )
    with psycopg.connect(
        host=socket, port=54339, dbname="wastewise_browser", user=getpass.getuser(), autocommit=True
    ) as db:
        db.execute("GRANT USAGE ON SCHEMA app_private TO wastewise_browser")
        db.execute(
            "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app_private TO wastewise_browser"
        )
    env["DATABASE_URL"] = URL.create(
        "postgresql+psycopg",
        username="wastewise_browser",
        password=password,
        host="127.0.0.1",
        port=54339,
        database="wastewise_browser",
    ).render_as_string(hide_password=False)
    subprocess.run(
        [
            "npm",
            "--prefix",
            "mobile",
            "run",
            "export",
            "--",
            "--output-dir",
            "../.local/mobile-browser",
        ],
        cwd=root,
        env=env,
        check=True,
    )
    commands = [
        (
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8001",
                "--no-access-log",
            ],
            root / "backend-ml",
        ),
        (["npm", "--prefix", "web", "run", "dev", "--", "--port", "5180", "--strictPort"], root),
        (
            [
                sys.executable,
                "-m",
                "http.server",
                "8083",
                "--bind",
                "127.0.0.1",
                "--directory",
                str(root / ".local/mobile-browser"),
            ],
            root,
        ),
    ]
    processes = []
    logs = []
    try:
        for i, (command, cwd) in enumerate(commands):
            log = (root / f".local/browser-service-{i}.log").open("w")
            logs.append(log)
            processes.append(subprocess.Popen(command, cwd=cwd, env=env, stdout=log, stderr=log))
        for url in ["http://127.0.0.1:8001/health/live", env["E2E_WEB_URL"], env["E2E_MOBILE_URL"]]:
            for _ in range(90):
                if any(p.poll() is not None for p in processes):
                    raise RuntimeError(
                        "Browser service exited; inspect .local/browser-service-*.log"
                    )
                try:
                    if httpx.get(url, timeout=2).status_code == 200:
                        break
                except httpx.HTTPError:
                    pass
                time.sleep(1)
            else:
                raise RuntimeError("Browser service startup timed out")
        result = subprocess.run(["npm", "--prefix", "web", "run", "e2e"], cwd=root, env=env)
        return result.returncode
    finally:
        for process in processes:
            process.terminate()
        for process in processes:
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        for log in logs:
            log.close()


if __name__ == "__main__":
    raise SystemExit(main())
