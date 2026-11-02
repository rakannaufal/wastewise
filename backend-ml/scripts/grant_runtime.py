"""Grant application DML, never schema ownership, to the local runtime role."""

import getpass
from pathlib import Path

import psycopg

root = Path(__file__).resolve().parents[2]
with psycopg.connect(
    host=str(root / ".local/socket"),
    port=54339,
    dbname="wastewise",
    user=getpass.getuser(),
    autocommit=True,
) as connection:
    connection.execute("REVOKE ALL ON SCHEMA app_private FROM PUBLIC")
    connection.execute("GRANT USAGE ON SCHEMA app_private TO wastewise")
    connection.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app_private TO wastewise"
    )
print("Runtime grants applied")
