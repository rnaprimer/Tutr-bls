-- ==============================================================================
-- Tutr — Migration 017: Refine Admin Role Override Fallback for System / Service Role
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.admin_override_user_role(
    p_target_user_id UUID,
    p_new_role public.user_role
)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID;
    v_prev_role public.user_role;
BEGIN
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can execute role overrides.';
    END IF;

    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        SELECT id INTO v_admin_id
        FROM public.users
        WHERE role = 'ADMIN'::public.user_role
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    SELECT role INTO v_prev_role
    FROM public.users
    WHERE id = p_target_user_id
    FOR UPDATE;

    IF v_prev_role IS NULL THEN
        RAISE EXCEPTION 'Target user ID % not found in public.users.', p_target_user_id;
    END IF;

    -- Update authoritative role
    UPDATE public.users
    SET role = p_new_role,
        updated_at = clock_timestamp()
    WHERE id = p_target_user_id;

    -- If changing to STUDENT, idempotently ensure students profile exists
    IF p_new_role = 'STUDENT'::public.user_role THEN
        INSERT INTO public.students (user_id)
        VALUES (p_target_user_id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    -- Note: Changing to TUTOR does NOT automatically create tutor_profiles or applications

    -- Audit log insertion
    INSERT INTO public.role_audit_logs (target_user_id, previous_role, new_role, changed_by)
    VALUES (p_target_user_id, v_prev_role, p_new_role, v_admin_id);

    RETURN jsonb_build_object(
        'success', true,
        'target_user_id', p_target_user_id,
        'previous_role', v_prev_role,
        'new_role', p_new_role,
        'changed_by', v_admin_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;
