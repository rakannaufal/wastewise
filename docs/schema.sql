BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> daee0603a16e

CREATE SCHEMA app_private;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

CREATE TABLE app_private.storage_cleanup_jobs (
    id UUID NOT NULL,
    bucket TEXT NOT NULL,
    object_path TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    attempts INTEGER NOT NULL,
    next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_error_code VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_storage_cleanup_jobs PRIMARY KEY (id),
    CONSTRAINT ck_storage_cleanup_jobs_valid_status CHECK (status IN ('pending','processing','completed')),
    CONSTRAINT ck_storage_cleanup_jobs_attempts_nonnegative CHECK (attempts >= 0),
    CONSTRAINT uq_storage_cleanup_jobs_bucket UNIQUE (bucket, object_path)
);

CREATE INDEX ix_cleanup_due ON app_private.storage_cleanup_jobs (status, next_attempt_at);

CREATE TYPE app_private.user_role AS ENUM ('admin', 'user');

CREATE TABLE app_private.users (
    id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    public_name_visible BOOLEAN DEFAULT false NOT NULL,
    role app_private.user_role DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT ck_users_name_length CHECK (char_length(btrim(full_name)) BETWEEN 3 AND 255),
    CONSTRAINT ck_users_email_normalized CHECK (email = lower(btrim(email))),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TYPE app_private.waste_category AS ENUM ('battery', 'biological', 'brown-glass', 'cardboard', 'clothes', 'green-glass', 'metal', 'paper', 'plastic', 'shoes', 'trash', 'white-glass');

CREATE TYPE app_private.report_status AS ENUM ('Pending', 'In Progress', 'Completed', 'Rejected');

CREATE TABLE app_private.waste_reports (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    category app_private.waste_category NOT NULL,
    description TEXT NOT NULL,
    image_path TEXT NOT NULL,
    latitude NUMERIC(10, 8) NOT NULL,
    longitude NUMERIC(11, 8) NOT NULL,
    status app_private.report_status DEFAULT 'Pending' NOT NULL,
    ai_predicted_category app_private.waste_category,
    ai_confidence NUMERIC(5, 2),
    ai_model_version TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_waste_reports PRIMARY KEY (id),
    CONSTRAINT ck_waste_reports_ai_complete CHECK ((ai_predicted_category IS NULL AND ai_confidence IS NULL AND ai_model_version IS NULL) OR (ai_predicted_category IS NOT NULL AND ai_confidence IS NOT NULL AND ai_model_version IS NOT NULL)),
    CONSTRAINT ck_waste_reports_confidence_range CHECK (ai_confidence IS NULL OR ai_confidence BETWEEN 0 AND 100),
    CONSTRAINT ck_waste_reports_description_length CHECK (char_length(btrim(description)) BETWEEN 10 AND 5000),
    CONSTRAINT ck_waste_reports_latitude_range CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT ck_waste_reports_longitude_range CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT fk_waste_reports_user_id FOREIGN KEY(user_id) REFERENCES app_private.users (id) ON DELETE CASCADE,
    CONSTRAINT uq_waste_reports_image_path UNIQUE (image_path)
);

CREATE INDEX ix_reports_category_created ON app_private.waste_reports (category, created_at);

CREATE INDEX ix_reports_owner_created ON app_private.waste_reports (user_id, created_at, id);

CREATE INDEX ix_reports_status_created ON app_private.waste_reports (status, created_at);

INSERT INTO alembic_version (version_num) VALUES ('daee0603a16e') RETURNING alembic_version.version_num;

-- Running upgrade daee0603a16e -> 7f22a1094b31

ALTER TABLE app_private.users ADD COLUMN auth_provider VARCHAR(16) DEFAULT 'local' NOT NULL;

ALTER TABLE app_private.users ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE app_private.users ADD CONSTRAINT ck_users_ck_users_provider_credentials CHECK ((auth_provider = 'local' AND password_hash IS NOT NULL) OR (auth_provider = 'supabase' AND password_hash IS NULL));

CREATE TABLE app_private.blocked_identities (
    id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_blocked_identities PRIMARY KEY (id)
);

UPDATE alembic_version SET version_num='7f22a1094b31' WHERE alembic_version.version_num = 'daee0603a16e';

-- Running upgrade 7f22a1094b31 -> 41ba8d170ab2

ALTER TABLE app_private.users RENAME CONSTRAINT ck_users_ck_users_provider_credentials TO ck_users_provider_credentials;

UPDATE alembic_version SET version_num='41ba8d170ab2' WHERE alembic_version.version_num = '7f22a1094b31';

-- Running upgrade 41ba8d170ab2 -> 620f42d91e30

CREATE TABLE app_private.report_drafts (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    request_id UUID NOT NULL,
    image_path TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    image_hash VARCHAR(64) NOT NULL,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    prediction JSONB,
    classification_state VARCHAR(24) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    result_report_id UUID,
    finalization_key UUID,
    finalization_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    photo_source VARCHAR(16),
    captured_at TIMESTAMP WITH TIME ZONE,
    location_source VARCHAR(32) DEFAULT 'legacy_unknown' NOT NULL,
    location_recorded_at TIMESTAMP WITH TIME ZONE,
    location_accuracy_m NUMERIC(10, 2),
    CONSTRAINT pk_report_drafts PRIMARY KEY (id),
    CONSTRAINT uq_drafts_owner_request UNIQUE (user_id, request_id),
    CONSTRAINT uq_drafts_owner_finalize UNIQUE (user_id, finalization_key),
    CONSTRAINT fk_report_drafts_user_id FOREIGN KEY(user_id) REFERENCES app_private.users (id) ON DELETE CASCADE,
    CONSTRAINT uq_report_drafts_image_path UNIQUE (image_path)
);

CREATE INDEX ix_drafts_expiry ON app_private.report_drafts (expires_at);

ALTER TABLE app_private.waste_reports ADD COLUMN photo_source VARCHAR(16);

ALTER TABLE app_private.waste_reports ADD COLUMN captured_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE app_private.waste_reports ADD COLUMN location_source VARCHAR(32) DEFAULT 'legacy_unknown' NOT NULL;

ALTER TABLE app_private.waste_reports ADD COLUMN location_recorded_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE app_private.waste_reports ADD COLUMN location_accuracy_m NUMERIC(10, 2);

ALTER TABLE app_private.waste_reports ADD COLUMN source_draft_id UUID;

ALTER TABLE app_private.waste_reports ADD COLUMN thumbnail_path TEXT;

ALTER TABLE app_private.waste_reports ADD COLUMN classification_state VARCHAR(24) DEFAULT 'legacy' NOT NULL;

ALTER TABLE app_private.waste_reports ADD COLUMN revision INTEGER DEFAULT '1' NOT NULL;

ALTER TABLE app_private.waste_reports ADD CONSTRAINT fk_reports_source_draft FOREIGN KEY(source_draft_id) REFERENCES app_private.report_drafts (id) ON DELETE SET NULL;

ALTER TABLE app_private.waste_reports ADD CONSTRAINT uq_reports_source_draft UNIQUE (source_draft_id);

CREATE TABLE app_private.report_events (
    id UUID NOT NULL,
    report_id UUID NOT NULL,
    actor_id UUID,
    kind VARCHAR(32) NOT NULL,
    details JSONB NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_report_events PRIMARY KEY (id),
    CONSTRAINT fk_report_events_report_id FOREIGN KEY(report_id) REFERENCES app_private.waste_reports (id) ON DELETE CASCADE,
    CONSTRAINT fk_report_events_actor_id FOREIGN KEY(actor_id) REFERENCES app_private.users (id) ON DELETE SET NULL
);

CREATE INDEX ix_events_report_created ON app_private.report_events (report_id, created_at);

UPDATE alembic_version SET version_num='620f42d91e30' WHERE alembic_version.version_num = '41ba8d170ab2';

-- Running upgrade 620f42d91e30 -> 7f36d20c41ab

ALTER TABLE app_private.report_drafts ADD CONSTRAINT ck_report_drafts_draft_coordinates CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180));

ALTER TABLE app_private.report_drafts ADD CONSTRAINT ck_report_drafts_draft_prediction CHECK ((classification_state = 'analysis_failed' AND prediction IS NULL) OR (classification_state IN ('classified', 'needs_review') AND prediction IS NOT NULL));

ALTER TABLE app_private.report_drafts ADD CONSTRAINT ck_report_drafts_draft_photo_source CHECK (photo_source IN ('camera', 'gallery') AND (photo_source <> 'camera' OR captured_at IS NOT NULL));

ALTER TABLE app_private.waste_reports ADD CONSTRAINT ck_waste_reports_report_revision CHECK (revision >= 1);

ALTER TABLE app_private.waste_reports ADD CONSTRAINT ck_waste_reports_report_automatic CHECK (classification_state = 'legacy' OR (classification_state IN ('classified', 'needs_review', 'reviewed') AND ai_predicted_category IS NOT NULL AND source_draft_id IS NOT NULL AND photo_source IN ('camera', 'gallery') AND location_source IN ('device_capture', 'photo_exif', 'device_upload_confirmed')));

UPDATE alembic_version SET version_num='7f36d20c41ab' WHERE alembic_version.version_num = '620f42d91e30';

-- Running upgrade 7f36d20c41ab -> 8a4d7c209e51

ALTER TABLE app_private.report_drafts DROP CONSTRAINT ck_report_drafts_draft_coordinates;

ALTER TABLE app_private.report_drafts ADD CONSTRAINT ck_report_drafts_draft_coordinates CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180));

ALTER TABLE app_private.report_drafts DROP CONSTRAINT ck_report_drafts_draft_photo_source;

ALTER TABLE app_private.report_drafts ADD CONSTRAINT ck_report_drafts_draft_photo_source CHECK (photo_source IS NOT NULL AND photo_source IN ('camera', 'gallery') AND (photo_source <> 'camera' OR captured_at IS NOT NULL));

ALTER TABLE app_private.waste_reports DROP CONSTRAINT ck_waste_reports_report_automatic;

ALTER TABLE app_private.waste_reports ADD CONSTRAINT ck_waste_reports_report_automatic CHECK (classification_state = 'legacy' OR (classification_state IN ('classified', 'needs_review', 'reviewed') AND ai_predicted_category IS NOT NULL AND source_draft_id IS NOT NULL AND photo_source IS NOT NULL AND photo_source IN ('camera', 'gallery') AND location_source IN ('device_capture', 'photo_exif', 'device_upload_confirmed')));

UPDATE alembic_version SET version_num='8a4d7c209e51' WHERE alembic_version.version_num = '7f36d20c41ab';

-- Running upgrade 8a4d7c209e51 -> b31c80a21ef4

CREATE TABLE app_private.regions (
    code VARCHAR(16) NOT NULL,
    parent_code VARCHAR(16),
    level INTEGER NOT NULL,
    name VARCHAR(180) NOT NULL,
    source TEXT NOT NULL,
    geometry JSONB,
    CONSTRAINT pk_regions PRIMARY KEY (code),
    CONSTRAINT fk_regions_parent_code FOREIGN KEY(parent_code) REFERENCES app_private.regions (code)
);

CREATE INDEX ix_regions_parent_name ON app_private.regions (parent_code, name);

CREATE TABLE app_private.community_posts (
    id UUID NOT NULL,
    report_id UUID NOT NULL,
    user_id UUID NOT NULL,
    caption TEXT NOT NULL,
    state VARCHAR(16) NOT NULL,
    source_image_path TEXT NOT NULL,
    image_path TEXT,
    thumbnail_path TEXT,
    region_code VARCHAR(16),
    location_label TEXT,
    location_state VARCHAR(20) NOT NULL,
    privacy_version VARCHAR(24) NOT NULL,
    revision INTEGER NOT NULL,
    attempts INTEGER NOT NULL,
    next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_community_posts PRIMARY KEY (id),
    CONSTRAINT ck_community_posts_post_state CHECK (state IN ('processing','published','hidden','withdrawn')),
    CONSTRAINT ck_community_posts_post_caption CHECK (char_length(btrim(caption)) BETWEEN 10 AND 5000),
    CONSTRAINT uq_community_posts_report_id UNIQUE (report_id),
    CONSTRAINT fk_community_posts_report_id FOREIGN KEY(report_id) REFERENCES app_private.waste_reports (id) ON DELETE CASCADE,
    CONSTRAINT fk_community_posts_user_id FOREIGN KEY(user_id) REFERENCES app_private.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_community_posts_region_code FOREIGN KEY(region_code) REFERENCES app_private.regions (code)
);

CREATE INDEX ix_posts_state_created ON app_private.community_posts (state, created_at, id);

CREATE INDEX ix_posts_region ON app_private.community_posts (region_code);

CREATE TABLE app_private.post_likes (
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_post_likes PRIMARY KEY (post_id, user_id),
    CONSTRAINT fk_post_likes_post_id FOREIGN KEY(post_id) REFERENCES app_private.community_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_post_likes_user_id FOREIGN KEY(user_id) REFERENCES app_private.users (id) ON DELETE CASCADE
);

CREATE TABLE app_private.post_comments (
    id UUID NOT NULL,
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    request_id UUID NOT NULL,
    body TEXT NOT NULL,
    state VARCHAR(16) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_post_comments PRIMARY KEY (id),
    CONSTRAINT uq_post_comments_user_id UNIQUE (user_id, request_id),
    CONSTRAINT ck_post_comments_comment_length CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
    CONSTRAINT ck_post_comments_comment_state CHECK (state IN ('visible','hidden','deleted')),
    CONSTRAINT fk_post_comments_post_id FOREIGN KEY(post_id) REFERENCES app_private.community_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_post_comments_user_id FOREIGN KEY(user_id) REFERENCES app_private.users (id) ON DELETE CASCADE
);

CREATE INDEX ix_comments_post_created ON app_private.post_comments (post_id, created_at, id);

CREATE TABLE app_private.content_flags (
    id UUID NOT NULL,
    post_id UUID NOT NULL,
    user_id UUID,
    reason TEXT NOT NULL,
    state VARCHAR(16) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_content_flags PRIMARY KEY (id),
    CONSTRAINT uq_content_flags_post_id UNIQUE (post_id, user_id),
    CONSTRAINT fk_content_flags_post_id FOREIGN KEY(post_id) REFERENCES app_private.community_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_content_flags_user_id FOREIGN KEY(user_id) REFERENCES app_private.users (id) ON DELETE SET NULL
);

CREATE TABLE app_private.community_audits (
    id UUID NOT NULL,
    post_id UUID NOT NULL,
    actor_id UUID,
    action VARCHAR(32) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_community_audits PRIMARY KEY (id),
    CONSTRAINT fk_community_audits_post_id FOREIGN KEY(post_id) REFERENCES app_private.community_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_community_audits_actor_id FOREIGN KEY(actor_id) REFERENCES app_private.users (id) ON DELETE SET NULL
);

UPDATE alembic_version SET version_num='b31c80a21ef4' WHERE alembic_version.version_num = '8a4d7c209e51';

-- Running upgrade b31c80a21ef4 -> c42d19b50ea7

CREATE INDEX ix_regions_bounds ON app_private.regions
    ((CAST((geometry['bbox'] ->> 0) AS FLOAT)),
     (CAST((geometry['bbox'] ->> 2) AS FLOAT)),
     (CAST((geometry['bbox'] ->> 1) AS FLOAT)),
     (CAST((geometry['bbox'] ->> 3) AS FLOAT)));

UPDATE alembic_version SET version_num='c42d19b50ea7' WHERE alembic_version.version_num = 'b31c80a21ef4';

-- Running upgrade c42d19b50ea7 -> d53e20c61fb8

ALTER TABLE app_private.waste_reports DROP CONSTRAINT ck_waste_reports_description_length;

ALTER TABLE app_private.waste_reports ADD CONSTRAINT ck_waste_reports_description_length CHECK (char_length(btrim(description)) BETWEEN 0 AND 5000);

ALTER TABLE app_private.community_posts DROP CONSTRAINT ck_community_posts_post_caption;

ALTER TABLE app_private.community_posts ADD CONSTRAINT ck_community_posts_post_caption CHECK (char_length(btrim(caption)) BETWEEN 0 AND 5000);

UPDATE alembic_version SET version_num='d53e20c61fb8' WHERE alembic_version.version_num = 'c42d19b50ea7';

-- Running upgrade d53e20c61fb8 -> e64f31d72ac9

ALTER TABLE app_private.post_comments ADD COLUMN parent_id UUID;

ALTER TABLE app_private.post_comments ADD CONSTRAINT fk_post_comments_parent_id FOREIGN KEY(parent_id) REFERENCES app_private.post_comments (id) ON DELETE CASCADE;

ALTER TABLE app_private.post_comments ADD CONSTRAINT ck_post_comments_comment_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id);

CREATE INDEX ix_comments_thread_created ON app_private.post_comments (post_id, parent_id, created_at, id);

UPDATE alembic_version SET version_num='e64f31d72ac9' WHERE alembic_version.version_num = 'd53e20c61fb8';

-- Running upgrade e64f31d72ac9 -> f4b6d8a2c931

CREATE TABLE app_private.rate_limit_windows (
    bucket_key VARCHAR(64) NOT NULL,
    window_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    hits INTEGER NOT NULL,
    CONSTRAINT pk_rate_limit_windows PRIMARY KEY (bucket_key, window_started_at),
    CONSTRAINT ck_rate_limit_windows_ck_rate_limit_windows_rate_limit__9671 CHECK (hits >= 1)
);

CREATE INDEX ix_rate_limit_window_expiry ON app_private.rate_limit_windows (window_started_at);

CREATE TABLE app_private.worker_heartbeats (
    worker_name VARCHAR(64) NOT NULL,
    heartbeat_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_worker_heartbeats PRIMARY KEY (worker_name)
);

UPDATE alembic_version SET version_num='f4b6d8a2c931' WHERE alembic_version.version_num = 'e64f31d72ac9';

-- Running upgrade f4b6d8a2c931 -> 8b7c3d5e1a20

CREATE TABLE app_private.auth_deletion_jobs (
    user_id UUID NOT NULL,
    attempts INTEGER NOT NULL,
    next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_error_code VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_auth_deletion_jobs PRIMARY KEY (user_id),
    CONSTRAINT ck_auth_deletion_jobs_ck_auth_deletion_jobs_auth_deleti_093f CHECK (attempts >= 0)
);

CREATE INDEX ix_auth_deletion_due ON app_private.auth_deletion_jobs (next_attempt_at);

UPDATE alembic_version SET version_num='8b7c3d5e1a20' WHERE alembic_version.version_num = 'f4b6d8a2c931';

COMMIT;

