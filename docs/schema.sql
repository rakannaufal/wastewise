--
-- PostgreSQL database dump
--

\restrict lJbv0sdUdCeK0JeWQx4OFk6n3i18gEdPRHv9cNX0GpS2Zq5bh2FpYkSWKGYLkXj

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
    CONSTRAINT ck_storage_cleanup_jobs_valid_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying])::text[])))
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
    CONSTRAINT ck_waste_reports_ai_complete CHECK ((((ai_predicted_category IS NULL) AND (ai_confidence IS NULL) AND (ai_model_version IS NULL)) OR ((ai_predicted_category IS NOT NULL) AND (ai_confidence IS NOT NULL) AND (ai_model_version IS NOT NULL)))),
    CONSTRAINT ck_waste_reports_confidence_range CHECK (((ai_confidence IS NULL) OR ((ai_confidence >= (0)::numeric) AND (ai_confidence <= (100)::numeric)))),
    CONSTRAINT ck_waste_reports_description_length CHECK (((char_length(btrim(description)) >= 10) AND (char_length(btrim(description)) <= 5000))),
    CONSTRAINT ck_waste_reports_latitude_range CHECK (((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric))),
    CONSTRAINT ck_waste_reports_longitude_range CHECK (((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric)))
);


--
-- Name: blocked_identities pk_blocked_identities; Type: CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.blocked_identities
    ADD CONSTRAINT pk_blocked_identities PRIMARY KEY (id);


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
-- Name: waste_reports fk_waste_reports_user_id; Type: FK CONSTRAINT; Schema: app_private; Owner: -
--

ALTER TABLE ONLY app_private.waste_reports
    ADD CONSTRAINT fk_waste_reports_user_id FOREIGN KEY (user_id) REFERENCES app_private.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict lJbv0sdUdCeK0JeWQx4OFk6n3i18gEdPRHv9cNX0GpS2Zq5bh2FpYkSWKGYLkXj

