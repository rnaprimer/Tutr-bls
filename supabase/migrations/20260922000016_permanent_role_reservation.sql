-- ==============================================================================
-- Tutr — Migration 016: Permanent Role Reservation & Role-Locked Architecture
-- ==============================================================================

-- 1. Create and Secure Audit Table for Admin Role Overrides
CREATE TABLE IF NOT EXISTS public.role_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    previous_role public.user_role NOT NULL,
    new_role public.user_role NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_role_audit_logs_target ON public.role_audit_logs(target_user_id);

-- Explicit Hardening: Enable RLS on audit logs
ALTER TABLE public.role_audit_logs ENABLE ROW LEVEL SECURITY;

-- Deny all normal user access; permit SELECT only to verified administrators
DROP POLICY IF EXISTS "Admins can view role audit logs" ON public.role_audit_logs;
CREATE POLICY "Admins can view role audit logs"
    ON public.role_audit_logs
    FOR SELECT
    TO authenticated
    USING (public.is_current_user_admin());

-- No direct client INSERT/UPDATE/DELETE; insertions handled via SECURITY DEFINER RPC
REVOKE ALL ON public.role_audit_logs FROM PUBLIC;
REVOKE ALL ON public.role_audit_logs FROM anon;
GRANT SELECT ON public.role_audit_logs TO authenticated;
GRANT ALL ON public.role_audit_logs TO service_role, postgres;


-- 2. Atomic, Concurrency-Safe Role Reservation Function
CREATE OR REPLACE FUNCTION public.reserve_user_role(
    p_user_id UUID,
    p_requested_role public.user_role
)
RETURNS JSONB AS $$
DECLARE
    v_calling_user UUID;
    v_is_service_role BOOLEAN;
    v_current_role public.user_role;
BEGIN
    v_calling_user := auth.uid();
    v_is_service_role := (COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role')
                         OR (session_user IN ('postgres', 'supabase_admin'));

    IF NOT v_is_service_role AND (v_calling_user IS NULL OR v_calling_user <> p_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Users can only reserve their own account role.';
    END IF;

    IF p_requested_role NOT IN ('STUDENT'::public.user_role, 'TUTOR'::public.user_role) THEN
        RAISE EXCEPTION 'Invalid role request. Only STUDENT or TUTOR can be reserved.';
    END IF;

    -- Row Lock FOR UPDATE guarantees serialization against concurrent attempts
    SELECT role INTO v_current_role
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_role IS NULL THEN
        RAISE EXCEPTION 'User profile with ID % not found in public.users.', p_user_id;
    END IF;

    -- Case 1: ADMIN -> Protected and immutable
    IF v_current_role = 'ADMIN'::public.user_role THEN
        RETURN jsonb_build_object('role', 'ADMIN', 'is_new', false, 'mismatch', (p_requested_role <> 'ADMIN'));
    END IF;

    -- Case 2: STUDENT -> Permanent lock
    IF v_current_role = 'STUDENT'::public.user_role THEN
        RETURN jsonb_build_object('role', 'STUDENT', 'is_new', false, 'mismatch', (p_requested_role <> 'STUDENT'::public.user_role));
    END IF;

    -- Case 3: TUTOR -> Permanent lock
    IF v_current_role = 'TUTOR'::public.user_role THEN
        RETURN jsonb_build_object('role', 'TUTOR', 'is_new', false, 'mismatch', (p_requested_role <> 'TUTOR'::public.user_role));
    END IF;

    -- Case 4: USER tier -> First-time permanent role assignment
    IF v_current_role = 'USER'::public.user_role THEN
        UPDATE public.users
        SET role = p_requested_role,
            updated_at = clock_timestamp()
        WHERE id = p_user_id;

        IF p_requested_role = 'STUDENT'::public.user_role THEN
            INSERT INTO public.students (user_id)
            VALUES (p_user_id)
            ON CONFLICT (user_id) DO NOTHING;
        END IF;

        RETURN jsonb_build_object('role', p_requested_role, 'is_new', true, 'mismatch', false);
    END IF;

    RETURN jsonb_build_object('role', v_current_role, 'is_new', false, 'mismatch', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE ALL ON FUNCTION public.reserve_user_role(UUID, public.user_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_user_role(UUID, public.user_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.reserve_user_role(UUID, public.user_role) TO authenticated, service_role, postgres;


-- 3. Authorized Admin Role Override Function
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

REVOKE ALL ON FUNCTION public.admin_override_user_role(UUID, public.user_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_override_user_role(UUID, public.user_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_override_user_role(UUID, public.user_role) TO authenticated, service_role, postgres;


-- 4. Update Role Escalation Trigger
-- Non-admins cannot modify role UNLESS transitioning from USER -> STUDENT/TUTOR for their own account
CREATE OR REPLACE FUNCTION public.prevent_user_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF public.is_current_user_admin() THEN
            RETURN NEW;
        END IF;

        IF OLD.role = 'USER'::public.user_role
           AND NEW.role IN ('STUDENT'::public.user_role, 'TUTOR'::public.user_role)
           AND auth.uid() = OLD.id THEN
            RETURN NEW;
        END IF;

        RAISE EXCEPTION 'Unauthorized: Account roles are permanently locked and cannot be modified.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;


-- 5. Update handle_new_auth_user() trigger (Remove eager application linking)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    v_norm_email TEXT;
BEGIN
    v_norm_email := LOWER(TRIM(NEW.email));

    INSERT INTO public.users (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        v_norm_email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture',
            NULL
        ),
        'USER'::public.user_role
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;


-- 6. Safe, Non-Destructive Backfill of Existing Accounts
-- A. Accounts with active, verified tutor_profiles -> normalize to TUTOR
UPDATE public.users u
SET role = 'TUTOR'::public.user_role,
    updated_at = clock_timestamp()
WHERE u.role = 'USER'::public.user_role
  AND EXISTS (
      SELECT 1 FROM public.tutor_profiles tp
      WHERE tp.user_id = u.id AND tp.is_verified = true
  );

-- B. Accounts with existing student record (and not a verified tutor) -> normalize to STUDENT
UPDATE public.users u
SET role = 'STUDENT'::public.user_role,
    updated_at = clock_timestamp()
WHERE u.role = 'USER'::public.user_role
  AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = u.id
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.tutor_profiles tp
      WHERE tp.user_id = u.id
  );
