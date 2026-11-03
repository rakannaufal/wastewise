"""Index region bbox expressions so GPS lookup avoids scanning polygon payloads."""

from alembic import op

revision = "c42d19b50ea7"
down_revision = "b31c80a21ef4"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""CREATE INDEX ix_regions_bounds ON app_private.regions
    ((CAST((geometry['bbox'] ->> 0) AS FLOAT)),
     (CAST((geometry['bbox'] ->> 2) AS FLOAT)),
     (CAST((geometry['bbox'] ->> 1) AS FLOAT)),
     (CAST((geometry['bbox'] ->> 3) AS FLOAT)))""")


def downgrade():
    op.drop_index("ix_regions_bounds", table_name="regions", schema="app_private")
