--
-- PostgreSQL database dump
--

\restrict 4q8KFbDB4Y6r200MuBlcUH7TEkPvUjtzuYQW1qLKYWiIg41nqTggFbF4krBnTDX

-- Dumped from database version 17.11 (Homebrew)
-- Dumped by pg_dump version 17.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: app_private; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA app_private;


--
-- Name: report_status; Type: TYPE; Schema: app_private; Owner: -
--

CREATE TYPE app_private.report_status AS ENUM (
    'Pending',
    'In Progress',
    'Completed',
    'Rejected'
);


--
-- Name: user_role; Type: TYPE; Schema: app_private; Owner: -
--

CREATE TYPE app_private.user_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: waste_category; Type: TYPE; Schema: app_private; Owner: -
--

CREATE TYPE app_private.waste_category AS ENUM (
    'battery',
    'biological',
    'brown-glass',
    'cardboard',
    'clothes',
    'green-glass',
    'metal',
    'paper',
    'plastic',
    'shoes',
    'trash',
    'white-glass'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: blocked_identities; Type: TABLE; Schema: app_private; Owner: -
--

CREATE TABLE app_private.blocked_identities (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: report_drafts; Type: TABLE; Schema: app_private; Owner: -
--

CREATE TABLE app_private.report_drafts (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    request_id uuid NOT NULL,
    image_path text NOT NULL,
    thumbnail_path text NOT NULL,
    image_hash character varying(64) NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    prediction jsonb,
    classification_state character varying(24) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    result_report_id uuid,
    finalization_key uuid,
    finalization_hash character varying(64),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    photo_source character varying(16),
    captured_at timestamp with time zone,
    location_source character varying(32) DEFAULT 'legacy_unknown'::character varying NOT NULL,
    location_recorded_at timestamp with time zone,
    location_accuracy_m numeric(10,2),
    CONSTRAINT ck_report_drafts_draft_coordinates CHECK ((((latitude IS NULL) AND (longitude IS NULL)) OR ((latitude IS NOT NULL) AND (longitude IS NOT NULL) AND ((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric)) AND ((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric))))),
    CONSTRAINT ck_report_drafts_draft_photo_source CHECK (((photo_source IS NOT NULL) AND ((photo_source)::text = ANY ((ARRAY['camera'::character varying, 'gallery'::character varying])::text[])) AND (((photo_source)::text <> 'camera'::text) OR (captured_at IS NOT NULL)))),
    CONSTRAINT ck_report_drafts_draft_prediction CHECK (((((classification_state)::text = 'analysis_failed'::text) AND (prediction IS NULL)) OR (((classification_state)::text = ANY ((ARRAY['classified'::character varying, 'needs_review'::character varying])::text[])) AND (prediction IS NOT NULL))))
);


--
-- Name: report_events; Type: TABLE; Schema: app_private; Owner: -
--

CREATE TABLE app_private.report_events (
    id uuid NOT NULL,
    report_id uuid NOT NULL,
    actor_id uuid,
    kind character varying(32) NOT NULL,
    details jsonb NOT NULL,
    reason text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: storage_cleanup_jobs; Type: TABLE; Schema: app_private; Owner: -
--

CREATE TABLE app_private.storage_cleanup_jobs (
    id uuid NOT NULL,
    bucket text NOT NULL,
    object_path text NOT NULL,
    status character varying(20) NOT NULL,
    attempts integer NOT NULL,
    next_attempt_at timestamp with time zone NOT NULL,
    locked_until timestamp with time zone,
    last_error_code character varying(100),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT ck_storage_cleanup_jobs_attempts_nonnegative CHECK ((attempts >= 0)),
    CONSTRAINT ck_storage_cleanup_jobs_valid_status CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('processing'::character varying)::text, ('completed'::character varying)::text])))
);


--
-- Name: users; Type: TABLE; Schema: app_private; Owner: -
--

CREATE TABLE app_private.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    full_name character varying(255) NOT NULL,
    role app_private.user_role DEFAULT 'user'::app_private.user_role NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    auth_provider character varying(16) DEFAULT 'local'::character varying NOT NULL,
    CONSTRAINT ck_users_email_normalized CHECK (((email)::text = lower(btrim((email)::text)))),
    CONSTRAINT ck_users_name_length CHECK (((char_length(btrim((full_name)::text)) >= 3) AND (char_length(btrim((full_name)::text)) <= 255))),
    CONSTRAINT ck_users_provider_credentials CHECK (((((auth_provider)::text = 'local'::text) AND (password_hash IS NOT NULL)) OR (((auth_provider)::text = 'supabase'::text) AND (password_hash IS NULL))))
);


--
-- Name: waste_reports; Type: TABLE; Schema: app_private; Owner: -
--

CREATE TABLE app_private.waste_reports (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    category app_private.waste_category NOT NULL,
    description text NOT NULL,
    image_path text NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    status app_private.report_status DEFAULT 'Pending'::app_private.report_status NOT NULL,
    ai_predicted_category app_private.waste_category,
    ai_confidence numeric(5,2),
    ai_model_version text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    photo_source character varying(16),
    captured_at timestamp with time zone,
    location_source character varying(32) DEFAULT 'legacy_unknown'::character varying NOT NULL,
    location_recorded_at timestamp with time zone,
    location_accuracy_m numeric(10,2),
    source_draft_id uuid,
    thumbnail_path text,
    classification_state character varying(24) DEFAULT 'legacy'::character varying NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    CONSTRAINT ck_waste_reports_ai_complete CHECK ((((ai_predicted_category IS NULL) AND (ai_confidence IS NULL) AND (ai_model_version IS NULL)) OR ((ai_predicted_category IS NOT NULL) AND (ai_confidence IS NOT NULL) AND (ai_model_version IS NOT NULL)))),
    CONSTRAINT ck_waste_reports_confidence_range CHECK (((ai_confidence IS NULL) OR ((ai_confidence >= (0)::numeric) AND (ai_confidence <= (100)::numeric)))),
    CONSTRAINT ck_waste_reports_description_length CHECK (((char_length(btrim(description)) >= 10) AND (char_length(btrim(description)) <= 5000))),
    CONSTRAINT ck_waste_reports_latitude_range CHECK (((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric))),
    CONSTRAINT ck_waste_reports_longitude_range CHECK (((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric))),
    CONSTRAINT ck_waste_reports_report_automatic CHECK ((((classification_state)::text = 'legacy'::text) OR (((classification_state)::text = ANY ((ARRAY['classified'::character varying, 'needs_review'::character varying, 'reviewed'::character varying])::text[])) AND (ai_predicted_category IS NOT NULL) AND (source_draft_id IS NOT NULL) AND (photo_source IS NOT NULL) AND ((photo_source)::text = ANY ((ARRAY['camera'::character varying, 'gallery'::character varying])::text[])) AND ((location_source)::text = ANY ((ARRAY['device_capture'::character varying, 'photo_exif'::character varying, 'device_upload_confirmed'::character varying])::text[]))))),
    CONSTRAINT ck_waste_reports_report_revision CHECK ((revision >= 1))
);


--
-- Name: blocked_identities pk_blocked_identities; Type: CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.blocked_identities
    ADD CONSTRAINT pk_blocked_identities PRIMARY KEY (id);


--
-- Name: report_drafts pk_report_drafts; Type: CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.report_drafts
    ADD CONSTRAINT pk_report_drafts PRIMARY KEY (id);


--
-- Name: report_events pk_report_events; Type: CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.report_events
    ADD CONSTRAINT pk_report_events PRIMARY KEY (id);


--
-- Name: storage_cleanup_jobs pk_storage_cleanup_jobs; Type: CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.storage_cleanup_jobs
    ADD CONSTRAINT pk_storage_cleanup_jobs PRIMARY KEY (id);


--
-- Name: users pk_users; Type: CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.users
    ADD CONSTRAINT pk_users PRIMARY KEY (id);


--
-- Name: waste_reports pk_waste_reports; Type: CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.waste_reports
    ADD CONSTRAINT pk_waste_reports PRIMARY KEY (id);


--
-- Name: report_drafts uq_drafts_owner_finalize; Type: CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.report_drafts
    ADD CONSTRAINT uq_drafts_owner_finalize UNIQUE (user_id, finalization_key);


--
-- Name: report_drafts uq_drafts_owner_request; Type: CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.report_drafts
    ADD CONSTRAINT uq_drafts_owner_request UNIQUE (user_id, request_id);


--
-- Name: report_drafts uq_report_drafts_image_path; Type: CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.report_drafts
    ADD CONSTRAINT uq_report_drafts_image_path UNIQUE (image_path);


--
-- Name: waste_reports uq_reports_source_draft; Type: CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.waste_reports
    ADD CONSTRAINT uq_reports_source_draft UNIQUE (source_draft_id);


--
-- Name: storage_cleanup_jobs uq_storage_cleanup_jobs_bucket; Type: CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.storage_cleanup_jobs
    ADD CONSTRAINT uq_storage_cleanup_jobs_bucket UNIQUE (bucket, object_path);


--
-- Name: users uq_users_email; Type: CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.users
    ADD CONSTRAINT uq_users_email UNIQUE (email);


--
-- Name: waste_reports uq_waste_reports_image_path; Type: CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.waste_reports
    ADD CONSTRAINT uq_waste_reports_image_path UNIQUE (image_path);


--
-- Name: ix_cleanup_due; Type: INDEX; Schema: app_private; Owner: -
--

CREATE INDEX ix_cleanup_due ON app_private.storage_cleanup_jobs USING btree (status, next_attempt_at);


--
-- Name: ix_drafts_expiry; Type: INDEX; Schema: app_private; Owner: -
--

CREATE INDEX ix_drafts_expiry ON app_private.report_drafts USING btree (expires_at);


--
-- Name: ix_events_report_created; Type: INDEX; Schema: app_private; Owner: -
--

CREATE INDEX ix_events_report_created ON app_private.report_events USING btree (report_id, created_at);


--
-- Name: ix_reports_category_created; Type: INDEX; Schema: app_private; Owner: -
--

CREATE INDEX ix_reports_category_created ON app_private.waste_reports USING btree (category, created_at);


--
-- Name: ix_reports_owner_created; Type: INDEX; Schema: app_private; Owner: -
--

CREATE INDEX ix_reports_owner_created ON app_private.waste_reports USING btree (user_id, created_at, id);


--
-- Name: ix_reports_status_created; Type: INDEX; Schema: app_private; Owner: -
--

CREATE INDEX ix_reports_status_created ON app_private.waste_reports USING btree (status, created_at);


--
-- Name: report_drafts fk_report_drafts_user_id; Type: FK CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.report_drafts
    ADD CONSTRAINT fk_report_drafts_user_id FOREIGN KEY (user_id) REFERENCES app_private.users(id) ON DELETE CASCADE;


--
-- Name: report_events fk_report_events_actor_id; Type: FK CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.report_events
    ADD CONSTRAINT fk_report_events_actor_id FOREIGN KEY (actor_id) REFERENCES app_private.users(id) ON DELETE SET NULL;


--
-- Name: report_events fk_report_events_report_id; Type: FK CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.report_events
    ADD CONSTRAINT fk_report_events_report_id FOREIGN KEY (report_id) REFERENCES app_private.waste_reports(id) ON DELETE CASCADE;


--
-- Name: waste_reports fk_reports_source_draft; Type: FK CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.waste_reports
    ADD CONSTRAINT fk_reports_source_draft FOREIGN KEY (source_draft_id) REFERENCES app_private.report_drafts(id) ON DELETE SET NULL;


--
-- Name: waste_reports fk_waste_reports_user_id; Type: FK CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.waste_reports
    ADD CONSTRAINT fk_waste_reports_user_id FOREIGN KEY (user_id) REFERENCES app_private.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 4q8KFbDB4Y6r200MuBlcUH7TEkPvUjtzuYQW1qLKYWiIg41nqTggFbF4krBnTDX

