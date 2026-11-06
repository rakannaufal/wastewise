"""Allow account owners to opt in to public names on community posts."""

import sqlalchemy as sa
from alembic import op

revision = "c3f1a8e74d20"
down_revision = "9fd2a7c4b1e8"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column(
            "public_name_visible",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        schema="app_private",
    )


def downgrade():
    op.drop_column("users", "public_name_visible", schema="app_private")
