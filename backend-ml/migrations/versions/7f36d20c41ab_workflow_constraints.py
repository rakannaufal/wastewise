"""Enforce draft and automatic-report invariants without rewriting legacy records."""

from alembic import op

revision = "7f36d20c41ab"
down_revision = "620f42d91e30"
branch_labels = None
depends_on = None

constraints = {
    "report_drafts": {
        "draft_coordinates": "(latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)",
        "draft_prediction": "(classification_state = 'analysis_failed' AND prediction IS NULL) OR (classification_state IN ('classified', 'needs_review') AND prediction IS NOT NULL)",
        "draft_photo_source": "photo_source IN ('camera', 'gallery') AND (photo_source <> 'camera' OR captured_at IS NOT NULL)",
    },
    "waste_reports": {
        "report_revision": "revision >= 1",
        "report_automatic": "classification_state = 'legacy' OR (classification_state IN ('classified', 'needs_review', 'reviewed') AND ai_predicted_category IS NOT NULL AND source_draft_id IS NOT NULL AND photo_source IN ('camera', 'gallery') AND location_source IN ('device_capture', 'photo_exif', 'device_upload_confirmed'))",
    },
}


def upgrade():
    for table, checks in constraints.items():
        for name, expression in checks.items():
            op.create_check_constraint(name, table, expression, schema="app_private")


def downgrade():
    for table, checks in constraints.items():
        for name in checks:
            op.drop_constraint(name, table, schema="app_private", type_="check")
