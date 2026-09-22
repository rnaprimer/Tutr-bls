-- ==============================================================================
-- Tutr — Migration 018: Restore Delayed Application Identity Linking
-- ==============================================================================
-- Links unassigned tutor_applications (user_id IS NULL) to the user when they sign up,
-- without affecting public.users.role (remains USER until explicit role reservation).

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

    -- Delayed Identity Linking:
    -- Link any pre-existing application whose normalized email matches and whose user_id is NULL.
    -- Strict anti-hijacking guard: never reassign an application already linked to another user.
    UPDATE public.tutor_applications
    SET user_id = NEW.id
    WHERE LOWER(TRIM(email)) = v_norm_email
      AND user_id IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;
