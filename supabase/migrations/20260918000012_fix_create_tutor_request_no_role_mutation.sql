-- ==============================================================================
-- Tutr — Migration 012: Fix create_tutor_request (Remove role mutation)
-- A student sending a tutor request must NEVER modify their user role.
-- Removes the incorrect `UPDATE public.users SET role = 'STUDENT'` from create_tutor_request.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_tutor_request(
    p_tutor_id UUID,
    p_subject_id UUID,
    p_class_id UUID,
    p_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_student_id UUID;
    v_new_request_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to request a tutor.';
    END IF;

    -- Ensure public.students record exists for this authenticated user
    INSERT INTO public.students (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = v_user_id;

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

    -- Insert request (student_id is strictly bound to authenticated user)
    -- User role is NEVER modified during tutor request creation
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

REVOKE ALL ON FUNCTION public.create_tutor_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tutor_request TO authenticated, service_role, postgres;
