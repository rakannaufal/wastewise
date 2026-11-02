"""Reject partial nullable workflow evidence; SQL CHECK must not accept UNKNOWN."""
from alembic import op

revision = "8a4d7c209e51"
down_revision = "7f36d20c41ab"
branch_labels = None
depends_on = None


def checks(strict):
    prefix = "latitude IS NOT NULL AND longitude IS NOT NULL AND " if strict else ""
    source = "photo_source IS NOT NULL AND " if strict else ""
    return {
        ("report_drafts", "draft_coordinates"): f"(latitude IS NULL AND longitude IS NULL) OR ({prefix}latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)",
        ("report_drafts", "draft_photo_source"): f"{source}photo_source IN ('camera', 'gallery') AND (photo_source <> 'camera' OR captured_at IS NOT NULL)",
        ("waste_reports", "report_automatic"): f"classification_state = 'legacy' OR (classification_state IN ('classified', 'needs_review', 'reviewed') AND ai_predicted_category IS NOT NULL AND source_draft_id IS NOT NULL AND {source}photo_source IN ('camera', 'gallery') AND location_source IN ('device_capture', 'photo_exif', 'device_upload_confirmed'))",
    }


def replace(strict):
    for (table, name), expression in checks(strict).items():
        op.drop_constraint(op.f(f"ck_{table}_{name}"), table, schema="app_private", type_="check")
        op.create_check_constraint(name, table, expression, schema="app_private")


def upgrade():
    replace(True)


def downgrade():
    replace(False)
