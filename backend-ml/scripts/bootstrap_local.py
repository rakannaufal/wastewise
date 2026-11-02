"""Initialize roles and secrets for an already-running isolated local PostgreSQL."""

import getpass
import secrets
from pathlib import Path

import psycopg
from psycopg import sql

ROOT = Path(__file__).resolve().parents[2]
env_path = ROOT / "backend-ml/.env"
if env_path.exists():
    raise SystemExit(".env already exists; preserving credentials")
password = secrets.token_urlsafe(32)
secret = secrets.token_urlsafe(48)
socket = str(ROOT / ".local/socket")
with psycopg.connect(
    host=socket, port=54339, dbname="postgres", user=getpass.getuser(), autocommit=True
) as connection:
    connection.execute(
        sql.SQL("CREATE ROLE wastewise LOGIN PASSWORD {}").format(sql.Literal(password))
    )
    connection.execute("CREATE DATABASE wastewise")
env_path.write_text(
    f"DATABASE_URL=postgresql+psycopg://wastewise:{password}@127.0.0.1:54339/wastewise\nJWT_SECRET={secret}\nENVIRONMENT=development\n"
)
env_path.chmod(0o600)
print("Local role/database created; credentials written privately to backend-ml/.env")
