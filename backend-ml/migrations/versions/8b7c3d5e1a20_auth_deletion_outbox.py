"""Add retryable Supabase identity deletion jobs."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "8b7c3d5e1a20"
down_revision = "f4b6d8a2c931"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "auth_deletion_jobs",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error_code", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "attempts >= 0",
            name="ck_auth_deletion_jobs_auth_deletion_attempts_nonnegative",
        ),
        sa.PrimaryKeyConstraint("user_id", name="pk_auth_deletion_jobs"),
        schema="app_private",
    )
    op.create_index(
        "ix_auth_deletion_due",
        "auth_deletion_jobs",
        ["next_attempt_at"],
        schema="app_private",
    )

def downgrade():
    op.drop_index(
        "ix_auth_deletion_due", table_name="auth_deletion_jobs", schema="app_private"
    )
    op.drop_table("auth_deletion_jobs", schema="app_private")
