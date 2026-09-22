-- ==============================================================================
-- Tutr — Migration 016 Rollback: Revert Permanent Role Reservation Changes
-- ==============================================================================

DROP FUNCTION IF EXISTS public.admin_override_user_role(UUID, public.user_role);
DROP FUNCTION IF EXISTS public.reserve_user_role(UUID, public.user_role);
DROP TABLE IF EXISTS public.role_audit_logs CASCADE;

-- Restore previous prevent_user_role_escalation
CREATE OR REPLACE FUNCTION public.prevent_user_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF NOT public.is_current_user_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Restore previous handle_new_auth_user
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
