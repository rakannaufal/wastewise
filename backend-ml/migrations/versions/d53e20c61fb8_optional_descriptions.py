"""Allow empty descriptions/captions without changing legacy publication consent."""

from alembic import op

revision = "d53e20c61fb8"
down_revision = "c42d19b50ea7"
branch_labels = None
depends_on = None


def constraints(minimum):
    for table, field, name in (
        ("waste_reports", "description", "ck_waste_reports_description_length"),
        ("community_posts", "caption", "ck_community_posts_post_caption"),
    ):
        op.execute(f"ALTER TABLE app_private.{table} DROP CONSTRAINT {name}")
        op.execute(
            f"ALTER TABLE app_private.{table} ADD CONSTRAINT {name} "
            f"CHECK (char_length(btrim({field})) BETWEEN {minimum} AND 5000)"
        )


def upgrade():
    constraints(0)


def downgrade():
    # PostgreSQL refuses rollback if short descriptions exist; never fabricate user text.
    constraints(10)
