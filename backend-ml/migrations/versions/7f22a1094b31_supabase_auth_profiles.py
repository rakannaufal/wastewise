"""Link verified Supabase identities without storing their passwords."""

import sqlalchemy as sa
from alembic import op

revision = "7f22a1094b31"
down_revision = "daee0603a16e"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("auth_provider", sa.String(16), server_default="local", nullable=False),
        schema="app_private",
    )
    op.alter_column("users", "password_hash", nullable=True, schema="app_private")
    op.create_check_constraint(
        "ck_users_provider_credentials",
        "users",
        "(auth_provider = 'local' AND password_hash IS NOT NULL) OR (auth_provider = 'supabase' AND password_hash IS NULL)",
        schema="app_private",
    )
    op.create_table(
        "blocked_identities",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_blocked_identities"),
        schema="app_private",
    )


def downgrade():
    # Never silently erase provider accounts or invent local passwords during rollback.
    op.execute(
        "DO $$ BEGIN IF EXISTS (SELECT 1 FROM app_private.users WHERE auth_provider = 'supabase') THEN RAISE EXCEPTION 'Supabase profiles exist; explicit migration required'; END IF; END $$"
    )
    op.drop_table("blocked_identities", schema="app_private")
    op.drop_constraint(
        "ck_users_provider_credentials", "users", type_="check", schema="app_private"
    )
    op.alter_column("users", "password_hash", nullable=False, schema="app_private")
    op.drop_column("users", "auth_provider", schema="app_private")
