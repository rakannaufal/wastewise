"""Grant the runtime role access to operational tables."""

from alembic import op

revision = "9fd2a7c4b1e8"
down_revision = "8b7c3d5e1a20"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        DO $migration$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'wastewise_runtime'
            ) THEN
                EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE '
                    || 'app_private.rate_limit_windows, '
                    || 'app_private.worker_heartbeats, '
                    || 'app_private.auth_deletion_jobs TO wastewise_runtime';
            END IF;
        END
        $migration$;
        """
    )


def downgrade():
    op.execute(
        """
        DO $migration$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'wastewise_runtime'
            ) THEN
                EXECUTE 'REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE '
                    || 'app_private.rate_limit_windows, '
                    || 'app_private.worker_heartbeats, '
                    || 'app_private.auth_deletion_jobs FROM wastewise_runtime';
            END IF;
        END
        $migration$;
        """
    )
