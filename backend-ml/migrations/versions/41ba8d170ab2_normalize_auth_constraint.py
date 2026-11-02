"""Normalize the provider constraint name to match SQLAlchemy metadata."""

from alembic import op

revision = "41ba8d170ab2"
down_revision = "7f22a1094b31"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE app_private.users RENAME CONSTRAINT "
        "ck_users_ck_users_provider_credentials TO ck_users_provider_credentials"
    )


def downgrade():
    op.execute(
        "ALTER TABLE app_private.users RENAME CONSTRAINT "
        "ck_users_provider_credentials TO ck_users_ck_users_provider_credentials"
    )
