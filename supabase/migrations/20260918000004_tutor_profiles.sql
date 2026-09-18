-- Tutr Migration: 004_tutor_profiles
-- Description: Approved tutor profiles table, self-verification guard, and sanitized public tutor view.

CREATE TABLE IF NOT EXISTS public.tutor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    application_id UUID UNIQUE REFERENCES public.tutor_applications(id) ON DELETE SET NULL,

    display_name TEXT NOT NULL,
    photo_url TEXT,
    bio TEXT,

    qualification TEXT,
    experience TEXT,

    locality TEXT,
    teaching_areas TEXT,

    fee TEXT,
    availability TEXT,

    is_verified BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_tutor_profiles_user_id ON public.tutor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_application_id ON public.tutor_profiles(application_id);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_is_verified ON public.tutor_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_locality ON public.tutor_profiles(locality);

-- Automated updated_at trigger
DROP TRIGGER IF EXISTS trg_tutor_profiles_updated_at ON public.tutor_profiles;
CREATE TRIGGER trg_tutor_profiles_updated_at
    BEFORE UPDATE ON public.tutor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Security Trigger: Prevent Self-Verification
-- Tutors can update their profile information (bio, photo, fee, availability),
-- but can NEVER modify 'is_verified' unless they are an authorized ADMIN.
CREATE OR REPLACE FUNCTION public.prevent_tutor_self_verification()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.is_verified = true) OR
       (TG_OP = 'UPDATE' AND NEW.is_verified IS DISTINCT FROM OLD.is_verified) THEN
        IF NOT public.is_current_user_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators can modify tutor verification status.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_tutor_self_verification ON public.tutor_profiles;
CREATE TRIGGER trg_prevent_tutor_self_verification
    BEFORE INSERT OR UPDATE ON public.tutor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_tutor_self_verification();

-- Public Tutor Marketplace View
-- STRICT PRIVACY ISOLATION:
-- Exposes ONLY non-sensitive, public-facing marketplace fields.
-- Completely excludes: phone, email, documents, rejection_reason, reviewed_by,
-- google_response_id, internal notes, or raw user_id.
-- Only verified tutors are included.
CREATE OR REPLACE VIEW public.public_tutor_profiles
WITH (security_invoker = true)
AS
SELECT
    tp.id,
    tp.display_name,
    tp.photo_url,
    tp.bio,
    tp.qualification,
    tp.experience,
    tp.locality,
    tp.teaching_areas,
    tp.fee,
    tp.availability,
    tp.is_verified,
    tp.created_at
FROM public.tutor_profiles tp
WHERE tp.is_verified = true;
