"""Add database-backed rate limits and worker heartbeats."""

import sqlalchemy as sa
from alembic import op

revision = "f4b6d8a2c931"
down_revision = "e64f31d72ac9"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "rate_limit_windows",
        sa.Column("bucket_key", sa.String(length=64), nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("hits", sa.Integer(), nullable=False),
        sa.CheckConstraint("hits >= 1", name="ck_rate_limit_windows_rate_limit_hits_positive"),
        sa.PrimaryKeyConstraint(
            "bucket_key", "window_started_at", name="pk_rate_limit_windows"
        ),
        schema="app_private",
    )
    op.create_index(
        "ix_rate_limit_window_expiry",
        "rate_limit_windows",
        ["window_started_at"],
        schema="app_private",
    )
    op.create_table(
        "worker_heartbeats",
        sa.Column("worker_name", sa.String(length=64), nullable=False),
        sa.Column("heartbeat_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("worker_name", name="pk_worker_heartbeats"),
        schema="app_private",
    )


def downgrade():
    op.drop_table("worker_heartbeats", schema="app_private")
    op.drop_index(
        "ix_rate_limit_window_expiry",
        table_name="rate_limit_windows",
        schema="app_private",
    )
    op.drop_table("rate_limit_windows", schema="app_private")
