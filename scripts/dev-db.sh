#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"
mkdir -p .local/socket
if [ ! -f .local/postgres/PG_VERSION ]; then
  initdb -D "$PROJECT_ROOT/.local/postgres" --auth-local=trust --auth-host=scram-sha-256
fi
if ! pg_ctl -D "$PROJECT_ROOT/.local/postgres" status >/dev/null 2>&1; then
  pg_ctl -D "$PROJECT_ROOT/.local/postgres" -l "$PROJECT_ROOT/.local/postgres.log" -o "-p 54339 -k $PROJECT_ROOT/.local/socket -h 127.0.0.1" start
fi
cd backend-ml
if [ ! -f .env ]; then .venv/bin/python scripts/bootstrap_local.py; fi
DATABASE_URL="postgresql+psycopg:///wastewise?host=$PROJECT_ROOT/.local/socket&port=54339" .venv/bin/alembic upgrade head
.venv/bin/python scripts/grant_runtime.py
