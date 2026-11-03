"""Dry-run or explicitly publish selected legacy reports. No blanket backfill."""

import argparse
import io
import json
import math
from uuid import UUID

from PIL import Image
from sqlalchemy import select

from app.community import PUBLIC_POLICY, PUBLIC_STATUSES
from app.db import SessionLocal
from app.models import CommunityAudit, CommunityPost, Report
from app.storage import storage
from app.workflow import lock_request


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report_ids", nargs="+", type=UUID)
    parser.add_argument("--apply", action="store_true", help="Publish only the listed IDs")
    parser.add_argument("--policy", choices=[PUBLIC_POLICY], required=True)
    args = parser.parse_args()
    with SessionLocal.begin() as db:
        rows = list(
            db.scalars(
                select(Report)
                .where(Report.id.in_(set(args.report_ids)))
                .order_by(Report.id)
                .with_for_update(of=Report)
            )
        )
        if len(rows) != len(set(args.report_ids)):
            raise SystemExit("A selected report is missing; no changes applied")
        output = []
        for report in rows:
            if report.status not in PUBLIC_STATUSES:
                raise SystemExit("A selected report is rejected; no changes applied")
            lat, lng = float(report.latitude), float(report.longitude)
            if not (
                math.isfinite(lat)
                and math.isfinite(lng)
                and -90 <= lat <= 90
                and -180 <= lng <= 180
            ):
                raise SystemExit("Invalid coordinates; no changes applied")
            with Image.open(io.BytesIO(storage.get(report.image_path))) as image:
                image.verify()
            lock_request(db, f"share:{report.id}")
            post = db.scalar(
                select(CommunityPost).where(CommunityPost.report_id == report.id).with_for_update()
            )
            if post and (
                post.privacy_version != PUBLIC_POLICY or post.state in {"hidden", "withdrawn"}
            ):
                raise SystemExit(
                    "Existing publication requires separate review; no changes applied"
                )
            output.append(
                {
                    "report_prefix": str(report.id)[:8],
                    "status": report.status,
                    "location_source": report.location_source,
                    "publication": post.state if post else "will_queue",
                }
            )
            if args.apply and post is None:
                post = CommunityPost(
                    report_id=report.id,
                    user_id=report.user_id,
                    caption=report.description.strip(),
                    source_image_path=report.image_path,
                    privacy_version=PUBLIC_POLICY,
                )
                db.add(post)
                db.flush()
                db.add(
                    CommunityAudit(
                        post_id=post.id,
                        actor_id=None,
                        action="legacy_public_backfill",
                        reason="Operator selected report under explicit user authorization; "
                        + PUBLIC_POLICY,
                    )
                )
        if not args.apply:
            db.rollback()
        print(json.dumps({"applied": args.apply, "policy": PUBLIC_POLICY, "reports": output}))


if __name__ == "__main__":
    main()
