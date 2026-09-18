-- Tutr Migration: 001_initial_types_and_helpers
-- Description: Core extensions, enums, timestamp automation, and admin authorization functions.

-- 1. Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. PostgreSQL Enums

-- User Role: Defines authorization tier.
-- ARCHITECTURAL NOTE: 'users.role' is used primarily for administrative authorization (ADMIN).
-- It does NOT prevent a user from having both a student profile and a tutor application/profile.
-- Student capability is determined by the existence of a record in 'public.students',
-- and tutor capability is determined by 'public.tutor_applications' and 'public.tutor_profiles'.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM (
            'USER',
            'STUDENT',
            'TUTOR',
            'ADMIN'
        );
    END IF;
END $$;

-- Application Status: Lifecycle for tutor applications submitted to Tutr.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE public.application_status AS ENUM (
            'PENDING',
            'UNDER_REVIEW',
            'APPROVED',
            'REJECTED'
        );
    END IF;
END $$;

-- 3. Utility Trigger Function: Automated updated_at Timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Admin Check Functions (Security Definer)
-- Used in RLS and Triggers without recursive policy execution.
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = user_id
          AND role = 'ADMIN'::public.user_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
    req_role TEXT;
    jwt_sub TEXT;
BEGIN
    req_role := COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), current_setting('role', true));
    jwt_sub := current_setting('request.jwt.claim.sub', true);

    -- Service role always has administrative privileges
    IF req_role = 'service_role' THEN
        RETURN TRUE;
    END IF;

    -- Direct postgres superuser session without a simulated JWT user
    IF (session_user IN ('postgres', 'supabase_admin') OR req_role = 'postgres')
       AND (req_role IN ('none', 'postgres') OR req_role IS NULL)
       AND (jwt_sub IS NULL OR jwt_sub = '') THEN
        RETURN TRUE;
    END IF;

    -- For any authenticated user session, evaluate their role in public.users
    RETURN public.is_admin(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;
