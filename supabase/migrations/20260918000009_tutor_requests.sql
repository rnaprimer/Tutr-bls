-- Tutr Migration: 009_tutor_requests
-- Description: Phase 5 Student <-> Tutor Discovery and Tutor Request System.
-- Includes: tutor_request_status enum, tutor_requests table, indexes,
-- anti-duplication unique partial index, security triggers, RLS, and atomic RPCs.

-- 1. Enum: tutor_request_status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tutor_request_status') THEN
        CREATE TYPE public.tutor_request_status AS ENUM (
            'PENDING',
            'ACCEPTED',
            'DECLINED',
            'CANCELLED'
        );
    END IF;
END $$;

-- 2. Table: public.tutor_requests
CREATE TABLE IF NOT EXISTS public.tutor_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    tutor_id UUID NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    message TEXT,
    status public.tutor_request_status NOT NULL DEFAULT 'PENDING'::public.tutor_request_status,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    responded_at TIMESTAMPTZ
);

-- 3. Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_tutor_requests_student_id ON public.tutor_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_requests_tutor_id ON public.tutor_requests(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_requests_subject_id ON public.tutor_requests(subject_id);
CREATE INDEX IF NOT EXISTS idx_tutor_requests_class_id ON public.tutor_requests(class_id);
CREATE INDEX IF NOT EXISTS idx_tutor_requests_status ON public.tutor_requests(status);
CREATE INDEX IF NOT EXISTS idx_tutor_requests_created_at ON public.tutor_requests(created_at DESC);

-- 4. Database-Level Duplicate Active Request Protection
-- Prevents a student from having more than one PENDING request with the same tutor.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_requests_active_unique
ON public.tutor_requests(student_id, tutor_id)
WHERE status = 'PENDING';

-- 5. Updated At Trigger
DROP TRIGGER IF EXISTS trg_tutor_requests_updated_at ON public.tutor_requests;
CREATE TRIGGER trg_tutor_requests_updated_at
    BEFORE UPDATE ON public.tutor_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 6. Insert Validation Trigger
CREATE OR REPLACE FUNCTION public.validate_tutor_request_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_tutor_user_id UUID;
    v_student_user_id UUID;
BEGIN
    -- Enforce initial status must be PENDING
    IF NEW.status <> 'PENDING'::public.tutor_request_status THEN
        RAISE EXCEPTION 'Initial tutor request status must be PENDING.';
    END IF;

    -- Enforce target tutor exists and is verified
    SELECT user_id INTO v_tutor_user_id
    FROM public.tutor_profiles
    WHERE id = NEW.tutor_id AND is_verified = true;

    IF v_tutor_user_id IS NULL THEN
        RAISE EXCEPTION 'Cannot request an unverified or non-existent tutor.';
    END IF;

    -- Enforce student profile exists
    SELECT user_id INTO v_student_user_id
    FROM public.students
    WHERE id = NEW.student_id;

    IF v_student_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid student profile.';
    END IF;

    -- Enforce student cannot request themselves
    IF v_tutor_user_id = v_student_user_id THEN
        RAISE EXCEPTION 'You cannot request yourself as a tutor.';
    END IF;

    -- Message length check
    IF NEW.message IS NOT NULL AND length(NEW.message) > 500 THEN
        RAISE EXCEPTION 'Request message cannot exceed 500 characters.';
    END IF;

    -- Check duplicate pending request
    IF EXISTS (
        SELECT 1 FROM public.tutor_requests
        WHERE student_id = NEW.student_id
          AND tutor_id = NEW.tutor_id
          AND status = 'PENDING'::public.tutor_request_status
    ) THEN
        RAISE EXCEPTION 'You already have an active request with this tutor.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_validate_tutor_request_insert ON public.tutor_requests;
CREATE TRIGGER trg_validate_tutor_request_insert
    BEFORE INSERT ON public.tutor_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_tutor_request_insert();

-- 7. Status Transition & State Machine Trigger
CREATE OR REPLACE FUNCTION public.validate_tutor_request_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_current_uid UUID;
    v_tutor_user_id UUID;
    v_student_user_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    v_current_uid := auth.uid();
    v_is_admin := public.is_current_user_admin();

    -- Resolve owner user IDs
    SELECT user_id INTO v_tutor_user_id
    FROM public.tutor_profiles
    WHERE id = OLD.tutor_id;

    SELECT user_id INTO v_student_user_id
    FROM public.students
    WHERE id = OLD.student_id;

    -- If status is not changing, allow update (e.g. updated_at timestamp)
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    -- If request is in a terminal state, disallow modifications
    IF OLD.status IN ('ACCEPTED'::public.tutor_request_status, 'DECLINED'::public.tutor_request_status, 'CANCELLED'::public.tutor_request_status) THEN
        RAISE EXCEPTION 'Cannot modify a request that is already %.', OLD.status;
    END IF;

    -- When transitioning from PENDING:
    IF OLD.status = 'PENDING'::public.tutor_request_status THEN
        -- Accept or Decline: only target tutor or admin
        IF NEW.status IN ('ACCEPTED'::public.tutor_request_status, 'DECLINED'::public.tutor_request_status) THEN
            IF NOT (v_is_admin OR (v_current_uid IS NOT NULL AND v_current_uid = v_tutor_user_id)) THEN
                RAISE EXCEPTION 'Unauthorized: Only the assigned tutor can accept or decline this request.';
            END IF;
            NEW.responded_at := clock_timestamp();
        -- Cancel: only requesting student or admin
        ELSIF NEW.status = 'CANCELLED'::public.tutor_request_status THEN
            IF NOT (v_is_admin OR (v_current_uid IS NOT NULL AND v_current_uid = v_student_user_id)) THEN
                RAISE EXCEPTION 'Unauthorized: Only the requesting student can cancel this request.';
            END IF;
            NEW.responded_at := clock_timestamp();
        ELSE
            RAISE EXCEPTION 'Invalid status transition from PENDING to %.', NEW.status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_validate_tutor_request_transition ON public.tutor_requests;
CREATE TRIGGER trg_validate_tutor_request_transition
    BEFORE UPDATE ON public.tutor_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_tutor_request_transition();

-- 8. Row Level Security (RLS)
ALTER TABLE public.tutor_requests ENABLE ROW LEVEL SECURITY;

-- SELECT Policy:
-- Students can only view their own requests.
-- Tutors can only view requests addressed to them.
-- Admins can view all requests.
DROP POLICY IF EXISTS "tutor_requests_select_policy" ON public.tutor_requests;
CREATE POLICY "tutor_requests_select_policy"
    ON public.tutor_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = tutor_requests.student_id AND s.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.tutor_profiles tp
            WHERE tp.id = tutor_requests.tutor_id AND tp.user_id = auth.uid()
        )
        OR public.is_current_user_admin()
    );

-- INSERT Policy:
-- Only authenticated student can create a request for their own student profile.
-- Status must be PENDING.
-- Target tutor must be verified.
DROP POLICY IF EXISTS "tutor_requests_insert_policy" ON public.tutor_requests;
CREATE POLICY "tutor_requests_insert_policy"
    ON public.tutor_requests
    FOR INSERT
    WITH CHECK (
        (
            EXISTS (
                SELECT 1 FROM public.students s
                WHERE s.id = tutor_requests.student_id
                  AND s.user_id = auth.uid()
            )
            AND status = 'PENDING'::public.tutor_request_status
            AND EXISTS (
                SELECT 1 FROM public.tutor_profiles tp
                WHERE tp.id = tutor_requests.tutor_id AND tp.is_verified = true
            )
        )
        OR public.is_current_user_admin()
    );

-- UPDATE Policy:
-- Tutor can update their incoming requests (accept/decline).
-- Student can update their own pending requests to CANCELLED.
-- Admin has full update capability.
DROP POLICY IF EXISTS "tutor_requests_update_policy" ON public.tutor_requests;
CREATE POLICY "tutor_requests_update_policy"
    ON public.tutor_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tutor_profiles tp
            WHERE tp.id = tutor_requests.tutor_id AND tp.user_id = auth.uid()
        )
        OR (
            EXISTS (
                SELECT 1 FROM public.students s
                WHERE s.id = tutor_requests.student_id AND s.user_id = auth.uid()
            )
            AND status = 'PENDING'::public.tutor_request_status
        )
        OR public.is_current_user_admin()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tutor_profiles tp
            WHERE tp.id = tutor_requests.tutor_id AND tp.user_id = auth.uid()
        )
        OR (
            EXISTS (
                SELECT 1 FROM public.students s
                WHERE s.id = tutor_requests.student_id AND s.user_id = auth.uid()
            )
            AND status = 'CANCELLED'::public.tutor_request_status
        )
        OR public.is_current_user_admin()
    );

-- DELETE Policy:
-- Admin only.
DROP POLICY IF EXISTS "tutor_requests_delete_policy" ON public.tutor_requests;
CREATE POLICY "tutor_requests_delete_policy"
    ON public.tutor_requests
    FOR DELETE
    USING (public.is_current_user_admin());

-- 9. Atomic Stored Procedures (RPCs)

-- Function: create_tutor_request
CREATE OR REPLACE FUNCTION public.create_tutor_request(
    p_tutor_id UUID,
    p_subject_id UUID,
    p_class_id UUID,
    p_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_user_role public.user_role;
    v_student_id UUID;
    v_new_request_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to request a tutor.';
    END IF;

    -- Fetch user profile & role
    SELECT role INTO v_user_role
    FROM public.users
    WHERE id = v_user_id;

    -- If user is an unverified or tutor-only role without student capability, verify they can act as student
    -- We ensure a public.students record exists for this user:
    INSERT INTO public.students (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = v_user_id;

    -- If user role was 'USER', set it to 'STUDENT'
    IF v_user_role = 'USER'::public.user_role THEN
        UPDATE public.users
        SET role = 'STUDENT'::public.user_role, updated_at = clock_timestamp()
        WHERE id = v_user_id;
    END IF;

    -- Validate required parameters
    IF p_tutor_id IS NULL THEN
        RAISE EXCEPTION 'Tutor ID is required.';
    END IF;

    IF p_subject_id IS NULL THEN
        RAISE EXCEPTION 'Subject is required.';
    END IF;

    IF p_class_id IS NULL THEN
        RAISE EXCEPTION 'Class is required.';
    END IF;

    -- Insert request
    INSERT INTO public.tutor_requests (
        student_id,
        tutor_id,
        subject_id,
        class_id,
        message,
        status
    ) VALUES (
        v_student_id,
        p_tutor_id,
        p_subject_id,
        p_class_id,
        TRIM(p_message),
        'PENDING'::public.tutor_request_status
    )
    RETURNING id INTO v_new_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_new_request_id,
        'status', 'PENDING'
    );
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'You already have an active request with this tutor.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Function: accept_tutor_request
CREATE OR REPLACE FUNCTION public.accept_tutor_request(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_req RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT tr.*, tp.user_id AS tutor_owner_user_id
    INTO v_req
    FROM public.tutor_requests tr
    JOIN public.tutor_profiles tp ON tp.id = tr.tutor_id
    WHERE tr.id = p_request_id
    FOR UPDATE;

    IF v_req.id IS NULL THEN
        RAISE EXCEPTION 'Tutor request not found: %', p_request_id;
    END IF;

    IF NOT (public.is_current_user_admin() OR v_req.tutor_owner_user_id = v_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only the assigned tutor can accept this request.';
    END IF;

    IF v_req.status <> 'PENDING'::public.tutor_request_status THEN
        RAISE EXCEPTION 'Cannot accept request. Current status is %.', v_req.status;
    END IF;

    UPDATE public.tutor_requests
    SET
        status = 'ACCEPTED'::public.tutor_request_status,
        responded_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'status', 'ACCEPTED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Function: decline_tutor_request
CREATE OR REPLACE FUNCTION public.decline_tutor_request(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_req RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT tr.*, tp.user_id AS tutor_owner_user_id
    INTO v_req
    FROM public.tutor_requests tr
    JOIN public.tutor_profiles tp ON tp.id = tr.tutor_id
    WHERE tr.id = p_request_id
    FOR UPDATE;

    IF v_req.id IS NULL THEN
        RAISE EXCEPTION 'Tutor request not found: %', p_request_id;
    END IF;

    IF NOT (public.is_current_user_admin() OR v_req.tutor_owner_user_id = v_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only the assigned tutor can decline this request.';
    END IF;

    IF v_req.status <> 'PENDING'::public.tutor_request_status THEN
        RAISE EXCEPTION 'Cannot decline request. Current status is %.', v_req.status;
    END IF;

    UPDATE public.tutor_requests
    SET
        status = 'DECLINED'::public.tutor_request_status,
        responded_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'status', 'DECLINED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Function: cancel_tutor_request
CREATE OR REPLACE FUNCTION public.cancel_tutor_request(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_req RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT tr.*, s.user_id AS student_owner_user_id
    INTO v_req
    FROM public.tutor_requests tr
    JOIN public.students s ON s.id = tr.student_id
    WHERE tr.id = p_request_id
    FOR UPDATE;

    IF v_req.id IS NULL THEN
        RAISE EXCEPTION 'Tutor request not found: %', p_request_id;
    END IF;

    IF NOT (public.is_current_user_admin() OR v_req.student_owner_user_id = v_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only the requesting student can cancel this request.';
    END IF;

    IF v_req.status <> 'PENDING'::public.tutor_request_status THEN
        RAISE EXCEPTION 'Cannot cancel request. Current status is %.', v_req.status;
    END IF;

    UPDATE public.tutor_requests
    SET
        status = 'CANCELLED'::public.tutor_request_status,
        responded_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'status', 'CANCELLED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 10. Execution Grants
REVOKE ALL ON FUNCTION public.create_tutor_request FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_tutor_request FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decline_tutor_request FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_tutor_request FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_tutor_request TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.accept_tutor_request TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.decline_tutor_request TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.cancel_tutor_request TO authenticated, service_role, postgres;
