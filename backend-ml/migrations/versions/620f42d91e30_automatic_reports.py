"""Bind automatic reports to private drafts and record operational history."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql as pg

revision = "620f42d91e30"
down_revision = "41ba8d170ab2"
branch_labels = None
depends_on = None


def location_columns():
    return [
        sa.Column("photo_source", sa.String(16)),
        sa.Column("captured_at", sa.DateTime(timezone=True)),
        sa.Column(
            "location_source", sa.String(32), nullable=False, server_default="legacy_unknown"
        ),
        sa.Column("location_recorded_at", sa.DateTime(timezone=True)),
        sa.Column("location_accuracy_m", sa.Numeric(10, 2)),
    ]


def upgrade():
    op.create_table(
        "report_drafts",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("app_private.users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("request_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("image_path", sa.Text(), nullable=False, unique=True),
        sa.Column("thumbnail_path", sa.Text(), nullable=False),
        sa.Column("image_hash", sa.String(64), nullable=False),
        sa.Column("latitude", sa.Numeric(10, 8)),
        sa.Column("longitude", sa.Numeric(11, 8)),
        sa.Column("prediction", pg.JSONB()),
        sa.Column("classification_state", sa.String(24), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
        sa.Column("result_report_id", pg.UUID(as_uuid=True)),
        sa.Column("finalization_key", pg.UUID(as_uuid=True)),
        sa.Column("finalization_hash", sa.String(64)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        *location_columns(),
        sa.UniqueConstraint("user_id", "request_id", name="uq_drafts_owner_request"),
        sa.UniqueConstraint("user_id", "finalization_key", name="uq_drafts_owner_finalize"),
        schema="app_private",
    )
    op.create_index("ix_drafts_expiry", "report_drafts", ["expires_at"], schema="app_private")
    for column in [
        *location_columns(),
        sa.Column("source_draft_id", pg.UUID(as_uuid=True)),
        sa.Column("thumbnail_path", sa.Text()),
        sa.Column("classification_state", sa.String(24), nullable=False, server_default="legacy"),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
    ]:
        op.add_column("waste_reports", column, schema="app_private")
    op.create_foreign_key(
        "fk_reports_source_draft",
        "waste_reports",
        "report_drafts",
        ["source_draft_id"],
        ["id"],
        source_schema="app_private",
        referent_schema="app_private",
        ondelete="SET NULL",
    )
    op.create_unique_constraint(
        "uq_reports_source_draft", "waste_reports", ["source_draft_id"], schema="app_private"
    )
    op.create_table(
        "report_events",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "report_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("app_private.waste_reports.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "actor_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("app_private.users.id", ondelete="SET NULL"),
        ),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("details", pg.JSONB(), nullable=False),
        sa.Column("reason", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        schema="app_private",
    )
    op.create_index(
        "ix_events_report_created",
        "report_events",
        ["report_id", "created_at"],
        schema="app_private",
    )


def downgrade():
    op.drop_table("report_events", schema="app_private")
    op.drop_constraint(
        "fk_reports_source_draft", "waste_reports", schema="app_private", type_="foreignkey"
    )
    op.drop_constraint(
        "uq_reports_source_draft", "waste_reports", schema="app_private", type_="unique"
    )
    for name in [
        "source_draft_id",
        "thumbnail_path",
        "classification_state",
        "revision",
        "photo_source",
        "captured_at",
        "location_source",
        "location_recorded_at",
        "location_accuracy_m",
    ]:
        op.drop_column("waste_reports", name, schema="app_private")
    op.drop_table("report_drafts", schema="app_private")
