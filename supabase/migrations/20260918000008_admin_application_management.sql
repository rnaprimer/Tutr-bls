-- Tutr Migration: 008_admin_application_management
-- Description: Atomic admin review functions: start review, reject with reason, and approve with atomic tutor profile provisioning.

-- 1. Function: public.start_tutor_application_review
-- Transitions PENDING -> UNDER_REVIEW with concurrency locking and admin authorization.
CREATE OR REPLACE FUNCTION public.start_tutor_application_review(p_application_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_app RECORD;
BEGIN
    -- 1. Security Check
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can start reviewing applications.';
    END IF;

    -- 2. Concurrency Lock & State Check
    SELECT * INTO v_app
    FROM public.tutor_applications
    WHERE id = p_application_id
    FOR UPDATE;

    IF v_app.id IS NULL THEN
        RAISE EXCEPTION 'Application not found: %', p_application_id;
    END IF;

    IF v_app.status <> 'PENDING'::public.application_status THEN
        RAISE EXCEPTION 'Invalid status transition: Only applications in PENDING can be moved to UNDER_REVIEW. Current status is %.', v_app.status;
    END IF;

    -- 3. Transition to UNDER_REVIEW
    UPDATE public.tutor_applications
    SET
        status = 'UNDER_REVIEW'::public.application_status,
        updated_at = clock_timestamp()
    WHERE id = p_application_id;

    RETURN jsonb_build_object(
        'success', true,
        'application_id', p_application_id,
        'status', 'UNDER_REVIEW'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 2. Function: public.reject_tutor_application
-- Transitions UNDER_REVIEW -> REJECTED with validated reason, reviewer audit, and unverified profile guard.
CREATE OR REPLACE FUNCTION public.reject_tutor_application(
    p_application_id UUID,
    p_rejection_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID;
    v_app RECORD;
    v_clean_reason TEXT;
BEGIN
    -- 1. Security Check
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can reject tutor applications.';
    END IF;

    v_admin_id := auth.uid();
    v_clean_reason := TRIM(p_rejection_reason);

    -- 2. Validation
    IF v_clean_reason IS NULL OR length(v_clean_reason) < 3 THEN
        RAISE EXCEPTION 'Rejection reason must be at least 3 characters long.';
    END IF;

    IF length(v_clean_reason) > 1000 THEN
        RAISE EXCEPTION 'Rejection reason cannot exceed 1000 characters.';
    END IF;

    -- 3. Concurrency Lock & State Check
    SELECT * INTO v_app
    FROM public.tutor_applications
    WHERE id = p_application_id
    FOR UPDATE;

    IF v_app.id IS NULL THEN
        RAISE EXCEPTION 'Application not found: %', p_application_id;
    END IF;

    IF v_app.status <> 'UNDER_REVIEW'::public.application_status THEN
        RAISE EXCEPTION 'Invalid status transition: Only applications UNDER_REVIEW can be rejected. Current status is %.', v_app.status;
    END IF;

    -- 4. Transition application status to REJECTED
    UPDATE public.tutor_applications
    SET
        status = 'REJECTED'::public.application_status,
        rejection_reason = v_clean_reason,
        reviewed_at = clock_timestamp(),
        reviewed_by = v_admin_id,
        updated_at = clock_timestamp()
    WHERE id = p_application_id;

    -- 5. If profile exists for this application or user, ensure it is not verified
    UPDATE public.tutor_profiles
    SET
        is_verified = false,
        updated_at = clock_timestamp()
    WHERE application_id = p_application_id
       OR (v_app.user_id IS NOT NULL AND user_id = v_app.user_id);

    RETURN jsonb_build_object(
        'success', true,
        'application_id', p_application_id,
        'status', 'REJECTED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 3. Function: public.approve_tutor_application
-- ATOMIC TRANSACTION:
-- UNDER_REVIEW -> APPROVED + atomic tutor profile provisioning with is_verified = true.
-- If tutor profile provisioning fails, entire transaction rolls back; application does NOT remain APPROVED.
CREATE OR REPLACE FUNCTION public.approve_tutor_application(p_application_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID;
    v_app RECORD;
    v_user_id UUID;
    v_profile_id UUID;
BEGIN
    -- 1. Security Check: Only administrators can approve applications
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can approve tutor applications.';
    END IF;

    v_admin_id := auth.uid();

    -- 2. Concurrency Lock: Lock application row
    SELECT * INTO v_app
    FROM public.tutor_applications
    WHERE id = p_application_id
    FOR UPDATE;

    IF v_app.id IS NULL THEN
        RAISE EXCEPTION 'Application not found: %', p_application_id;
    END IF;

    -- 3. State Machine Check: Must be UNDER_REVIEW
    IF v_app.status <> 'UNDER_REVIEW'::public.application_status THEN
        RAISE EXCEPTION 'Invalid status transition: Only applications UNDER_REVIEW can be approved. Current status is %.', v_app.status;
    END IF;

    -- 4. Resolve applicant user_id
    v_user_id := v_app.user_id;
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id
        FROM public.users
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(v_app.email))
        LIMIT 1;

        IF v_user_id IS NOT NULL THEN
            UPDATE public.tutor_applications
            SET user_id = v_user_id
            WHERE id = p_application_id;
        ELSE
            RAISE EXCEPTION 'Cannot approve application: Applicant has not registered a Tutr user account yet.';
        END IF;
    END IF;

    -- 5. Transition application status to APPROVED
    UPDATE public.tutor_applications
    SET
        status = 'APPROVED'::public.application_status,
        reviewed_at = clock_timestamp(),
        reviewed_by = v_admin_id,
        updated_at = clock_timestamp()
    WHERE id = p_application_id;

    -- 6. Atomic Tutor Profile Provisioning (Idempotent upsert)
    INSERT INTO public.tutor_profiles (
        user_id,
        application_id,
        display_name,
        qualification,
        experience,
        locality,
        fee,
        availability,
        is_verified
    ) VALUES (
        v_user_id,
        p_application_id,
        v_app.full_name,
        v_app.qualification,
        v_app.experience,
        v_app.location,
        v_app.fee,
        v_app.availability,
        true
    )
    ON CONFLICT (user_id) DO UPDATE SET
        application_id = EXCLUDED.application_id,
        display_name = EXCLUDED.display_name,
        qualification = COALESCE(EXCLUDED.qualification, public.tutor_profiles.qualification),
        experience = COALESCE(EXCLUDED.experience, public.tutor_profiles.experience),
        locality = COALESCE(EXCLUDED.locality, public.tutor_profiles.locality),
        fee = COALESCE(EXCLUDED.fee, public.tutor_profiles.fee),
        availability = COALESCE(EXCLUDED.availability, public.tutor_profiles.availability),
        is_verified = true,
        updated_at = clock_timestamp()
    RETURNING id INTO v_profile_id;

    RETURN jsonb_build_object(
        'success', true,
        'application_id', p_application_id,
        'profile_id', v_profile_id,
        'status', 'APPROVED',
        'is_verified', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 4. Permissions & Execution Grants
REVOKE ALL ON FUNCTION public.start_tutor_application_review FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_tutor_application FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_tutor_application FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.start_tutor_application_review TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.reject_tutor_application TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.approve_tutor_application TO authenticated, service_role, postgres;
