-- Tutr Migration: 003_tutor_applications
-- Description: Tutor applications table with raw incoming form data, unique Google response ID handling, and lifecycle transition enforcement.

CREATE TABLE IF NOT EXISTS public.tutor_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    google_response_id TEXT,

    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,

    location TEXT,
    qualification TEXT,
    experience TEXT,

    fee TEXT,
    availability TEXT,

    -- Raw incoming structured submissions from Google Forms or intake forms
    subjects JSONB DEFAULT '[]'::jsonb,
    classes JSONB DEFAULT '[]'::jsonb,
    boards JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,

    status public.application_status NOT NULL DEFAULT 'PENDING'::public.application_status,

    submitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

    rejection_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Partial Unique Index on google_response_id:
-- Allows multiple NULL records (manual or internal applications) while strictly prohibiting duplicate Google Form response imports.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_applications_google_response_id
    ON public.tutor_applications(google_response_id)
    WHERE google_response_id IS NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tutor_applications_user_id ON public.tutor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_applications_status ON public.tutor_applications(status);
CREATE INDEX IF NOT EXISTS idx_tutor_applications_submitted_at ON public.tutor_applications(submitted_at DESC);

-- Automated updated_at trigger
DROP TRIGGER IF EXISTS trg_tutor_applications_updated_at ON public.tutor_applications;
CREATE TRIGGER trg_tutor_applications_updated_at
    BEFORE UPDATE ON public.tutor_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Controlled Application Status Transitions & Audit Guard
-- Enforces:
-- 1. Ordinary users cannot modify status, reviewed_at, reviewed_by, or rejection_reason.
-- 2. Tutors can only update their application if it is still 'PENDING'.
-- 3. Only admins can transition statuses through valid lifecycle paths:
--    PENDING -> UNDER_REVIEW -> APPROVED | REJECTED
--    PENDING -> APPROVED | REJECTED (direct review)
--    REJECTED -> UNDER_REVIEW (reconsideration)
CREATE OR REPLACE FUNCTION public.validate_tutor_application_transition()
RETURNS TRIGGER AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    is_admin := public.is_current_user_admin();

    -- Non-admin integrity checks
    IF NOT is_admin THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators can update application status.';
        END IF;

        IF NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators can modify reviewed_at.';
        END IF;

        IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators can modify reviewed_by.';
        END IF;

        IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators can modify rejection_reason.';
        END IF;

        IF OLD.status <> 'PENDING'::public.application_status THEN
            RAISE EXCEPTION 'Application cannot be modified once review has commenced.';
        END IF;
    ELSE
        -- Admin status transition validation
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            IF OLD.status = 'PENDING' AND NEW.status NOT IN ('UNDER_REVIEW', 'APPROVED', 'REJECTED') THEN
                RAISE EXCEPTION 'Invalid status transition from PENDING to %', NEW.status;
            ELSIF OLD.status = 'UNDER_REVIEW' AND NEW.status NOT IN ('APPROVED', 'REJECTED', 'PENDING') THEN
                RAISE EXCEPTION 'Invalid status transition from UNDER_REVIEW to %', NEW.status;
            ELSIF OLD.status = 'APPROVED' AND NEW.status NOT IN ('UNDER_REVIEW', 'REJECTED') THEN
                RAISE EXCEPTION 'Approved applications can only be transitioned back to UNDER_REVIEW or REJECTED';
            ELSIF OLD.status = 'REJECTED' AND NEW.status NOT IN ('UNDER_REVIEW', 'PENDING') THEN
                RAISE EXCEPTION 'Rejected applications can only be reopened to UNDER_REVIEW or PENDING';
            END IF;

            -- Populate review audit metadata if approving or rejecting
            IF NEW.status IN ('APPROVED', 'REJECTED') THEN
                NEW.reviewed_at := COALESCE(NEW.reviewed_at, clock_timestamp());
                NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_validate_tutor_application_transition ON public.tutor_applications;
CREATE TRIGGER trg_validate_tutor_application_transition
    BEFORE UPDATE ON public.tutor_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_tutor_application_transition();
