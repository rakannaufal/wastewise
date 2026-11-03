"""Add bounded comment threads; existing comments remain roots."""

import sqlalchemy as sa
from alembic import op

revision = "e64f31d72ac9"
down_revision = "d53e20c61fb8"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "post_comments", sa.Column("parent_id", sa.UUID(), nullable=True), schema="app_private"
    )
    op.create_foreign_key(
        "fk_post_comments_parent_id",
        "post_comments",
        "post_comments",
        ["parent_id"],
        ["id"],
        source_schema="app_private",
        referent_schema="app_private",
        ondelete="CASCADE",
    )
    op.create_check_constraint(
        "comment_parent_not_self",
        "post_comments",
        "parent_id IS NULL OR parent_id <> id",
        schema="app_private",
    )
    op.create_index(
        "ix_comments_thread_created",
        "post_comments",
        ["post_id", "parent_id", "created_at", "id"],
        schema="app_private",
    )


def downgrade():
    op.execute(
        "DO $$ BEGIN IF EXISTS (SELECT 1 FROM app_private.post_comments WHERE parent_id IS NOT NULL) THEN RAISE EXCEPTION 'Cannot remove replies schema while replies exist'; END IF; END $$"
    )
    op.drop_index("ix_comments_thread_created", table_name="post_comments", schema="app_private")
    op.drop_constraint(
        "ck_post_comments_comment_parent_not_self",
        "post_comments",
        schema="app_private",
        type_="check",
    )
    op.drop_constraint(
        "fk_post_comments_parent_id", "post_comments", schema="app_private", type_="foreignkey"
    )
    op.drop_column("post_comments", "parent_id", schema="app_private")
