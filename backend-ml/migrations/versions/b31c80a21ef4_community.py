"""Add private community projections, interactions and Indonesian regions."""

from alembic import op

revision = "b31c80a21ef4"
down_revision = "8a4d7c209e51"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "\nCREATE TABLE app_private.regions (\n\tcode VARCHAR(16) NOT NULL, \n\tparent_code VARCHAR(16), \n\tlevel INTEGER NOT NULL, \n\tname VARCHAR(180) NOT NULL, \n\tsource TEXT NOT NULL, \n\tgeometry JSONB, \n\tCONSTRAINT pk_regions PRIMARY KEY (code), \n\tCONSTRAINT fk_regions_parent_code FOREIGN KEY(parent_code) REFERENCES app_private.regions (code)\n)\n\n"
    )
    op.execute("CREATE INDEX ix_regions_parent_name ON app_private.regions (parent_code, name)")
    op.execute(
        "\nCREATE TABLE app_private.community_posts (\n\tid UUID NOT NULL, \n\treport_id UUID NOT NULL, \n\tuser_id UUID NOT NULL, \n\tcaption TEXT NOT NULL, \n\tstate VARCHAR(16) NOT NULL, \n\tsource_image_path TEXT NOT NULL, \n\timage_path TEXT, \n\tthumbnail_path TEXT, \n\tregion_code VARCHAR(16), \n\tlocation_label TEXT, \n\tlocation_state VARCHAR(20) NOT NULL, \n\tprivacy_version VARCHAR(24) NOT NULL, \n\trevision INTEGER NOT NULL, \n\tattempts INTEGER NOT NULL, \n\tnext_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tCONSTRAINT pk_community_posts PRIMARY KEY (id), \n\tCONSTRAINT ck_community_posts_post_state CHECK (state IN ('processing','published','hidden','withdrawn')), \n\tCONSTRAINT ck_community_posts_post_caption CHECK (char_length(btrim(caption)) BETWEEN 10 AND 5000), \n\tCONSTRAINT uq_community_posts_report_id UNIQUE (report_id), \n\tCONSTRAINT fk_community_posts_report_id FOREIGN KEY(report_id) REFERENCES app_private.waste_reports (id) ON DELETE CASCADE, \n\tCONSTRAINT fk_community_posts_user_id FOREIGN KEY(user_id) REFERENCES app_private.users (id) ON DELETE CASCADE, \n\tCONSTRAINT fk_community_posts_region_code FOREIGN KEY(region_code) REFERENCES app_private.regions (code)\n)\n\n"
    )
    op.execute(
        "CREATE INDEX ix_posts_state_created ON app_private.community_posts (state, created_at, id)"
    )
    op.execute("CREATE INDEX ix_posts_region ON app_private.community_posts (region_code)")
    op.execute(
        "\nCREATE TABLE app_private.post_likes (\n\tpost_id UUID NOT NULL, \n\tuser_id UUID NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tCONSTRAINT pk_post_likes PRIMARY KEY (post_id, user_id), \n\tCONSTRAINT fk_post_likes_post_id FOREIGN KEY(post_id) REFERENCES app_private.community_posts (id) ON DELETE CASCADE, \n\tCONSTRAINT fk_post_likes_user_id FOREIGN KEY(user_id) REFERENCES app_private.users (id) ON DELETE CASCADE\n)\n\n"
    )
    op.execute(
        "\nCREATE TABLE app_private.post_comments (\n\tid UUID NOT NULL, \n\tpost_id UUID NOT NULL, \n\tuser_id UUID NOT NULL, \n\trequest_id UUID NOT NULL, \n\tbody TEXT NOT NULL, \n\tstate VARCHAR(16) NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tCONSTRAINT pk_post_comments PRIMARY KEY (id), \n\tCONSTRAINT uq_post_comments_user_id UNIQUE (user_id, request_id), \n\tCONSTRAINT ck_post_comments_comment_length CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000), \n\tCONSTRAINT ck_post_comments_comment_state CHECK (state IN ('visible','hidden','deleted')), \n\tCONSTRAINT fk_post_comments_post_id FOREIGN KEY(post_id) REFERENCES app_private.community_posts (id) ON DELETE CASCADE, \n\tCONSTRAINT fk_post_comments_user_id FOREIGN KEY(user_id) REFERENCES app_private.users (id) ON DELETE CASCADE\n)\n\n"
    )
    op.execute(
        "CREATE INDEX ix_comments_post_created ON app_private.post_comments (post_id, created_at, id)"
    )
    op.execute(
        "\nCREATE TABLE app_private.content_flags (\n\tid UUID NOT NULL, \n\tpost_id UUID NOT NULL, \n\tuser_id UUID, \n\treason TEXT NOT NULL, \n\tstate VARCHAR(16) NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tCONSTRAINT pk_content_flags PRIMARY KEY (id), \n\tCONSTRAINT uq_content_flags_post_id UNIQUE (post_id, user_id), \n\tCONSTRAINT fk_content_flags_post_id FOREIGN KEY(post_id) REFERENCES app_private.community_posts (id) ON DELETE CASCADE, \n\tCONSTRAINT fk_content_flags_user_id FOREIGN KEY(user_id) REFERENCES app_private.users (id) ON DELETE SET NULL\n)\n\n"
    )
    op.execute(
        "\nCREATE TABLE app_private.community_audits (\n\tid UUID NOT NULL, \n\tpost_id UUID NOT NULL, \n\tactor_id UUID, \n\taction VARCHAR(32) NOT NULL, \n\treason TEXT NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tCONSTRAINT pk_community_audits PRIMARY KEY (id), \n\tCONSTRAINT fk_community_audits_post_id FOREIGN KEY(post_id) REFERENCES app_private.community_posts (id) ON DELETE CASCADE, \n\tCONSTRAINT fk_community_audits_actor_id FOREIGN KEY(actor_id) REFERENCES app_private.users (id) ON DELETE SET NULL\n)\n\n"
    )


def downgrade():
    op.drop_table("community_audits", schema="app_private")
    op.drop_table("content_flags", schema="app_private")
    op.drop_table("post_comments", schema="app_private")
    op.drop_table("post_likes", schema="app_private")
    op.drop_table("community_posts", schema="app_private")
    op.drop_table("regions", schema="app_private")
