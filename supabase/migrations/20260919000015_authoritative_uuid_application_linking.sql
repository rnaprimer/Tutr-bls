-- ==============================================================================
-- Tutr — Migration 015: Authoritative UUID Application Identity & Admin Account Linking
-- ==============================================================================

-- 1. DROP the legacy 13-parameter overload cleanly to prevent multiple callable overloads
DROP FUNCTION IF EXISTS public.ingest_google_form_application(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB
);

-- 2. Create the unified 14-parameter function with authoritative p_user_id
-- SECURITY ENFORCEMENT:
-- - p_user_id is only accepted if it exists in auth.users / public.users
-- - If tutor_applications already has a non-null user_id, it is NEVER overwritten by ingestion
-- - An application linked to User A will NEVER be automatically changed to User B
-- - If application is UNDER_REVIEW, APPROVED, or REJECTED, it is locked against ingestion updates
-- - Email is preserved purely as applicant/contact data and not as the primary identity key
-- - If p_user_id is NULL (legacy form submission), falls back to matching by email only if unambiguous
CREATE OR REPLACE FUNCTION public.ingest_google_form_application(
    p_google_response_id TEXT,
    p_full_name TEXT,
    p_email TEXT,
    p_phone TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_qualification TEXT DEFAULT NULL,
    p_experience TEXT DEFAULT NULL,
    p_fee TEXT DEFAULT NULL,
    p_availability TEXT DEFAULT NULL,
    p_subjects JSONB DEFAULT '[]'::jsonb,
    p_classes JSONB DEFAULT '[]'::jsonb,
    p_boards JSONB DEFAULT '[]'::jsonb,
    p_documents JSONB DEFAULT '[]'::jsonb,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_norm_email TEXT;
    v_clean_resp_id TEXT;
    v_resolved_user_id UUID := NULL;
    v_existing_id UUID;
    v_existing_status public.application_status;
    v_existing_user_id UUID;
BEGIN
    -- Input sanitization
    v_clean_resp_id := TRIM(p_google_response_id);
    v_norm_email := LOWER(TRIM(p_email));

    IF v_clean_resp_id IS NULL OR length(v_clean_resp_id) = 0 THEN
        RAISE EXCEPTION 'google_response_id is required and cannot be empty.';
    END IF;

    IF p_full_name IS NULL OR length(TRIM(p_full_name)) = 0 THEN
        RAISE EXCEPTION 'full_name is required and cannot be empty.';
    END IF;

    IF v_norm_email IS NULL OR v_norm_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'A valid email address is required.';
    END IF;

    -- Step 1: Validate explicit p_user_id if provided
    IF p_user_id IS NOT NULL THEN
        SELECT id INTO v_resolved_user_id
        FROM public.users
        WHERE id = p_user_id;

        IF v_resolved_user_id IS NULL THEN
            -- p_user_id is not a registered Tutr user account; reject linking
            RAISE EXCEPTION 'Invalid user_id: specified applicant does not exist in Tutr.';
        END IF;
    END IF;

    -- Step 2: Check for existing application by google_response_id
    SELECT id, status, user_id
    INTO v_existing_id, v_existing_status, v_existing_user_id
    FROM public.tutor_applications
    WHERE google_response_id = v_clean_resp_id;

    IF v_existing_id IS NOT NULL THEN
        -- Case A: Application already exists and is PENDING
        IF v_existing_status = 'PENDING'::public.application_status THEN
            -- STRICT IMMUTABILITY: If application already has a non-null user_id, NEVER overwrite it.
            IF v_existing_user_id IS NOT NULL THEN
                v_resolved_user_id := v_existing_user_id;
            ELSIF v_resolved_user_id IS NULL THEN
                -- Backward compatibility fallback: match user by email if pre-registered
                SELECT id INTO v_resolved_user_id
                FROM public.users
                WHERE LOWER(TRIM(email)) = v_norm_email
                LIMIT 1;
            END IF;

            UPDATE public.tutor_applications
            SET
                full_name = TRIM(p_full_name),
                email = v_norm_email,
                phone = TRIM(p_phone),
                location = TRIM(p_location),
                qualification = TRIM(p_qualification),
                experience = TRIM(p_experience),
                fee = TRIM(p_fee),
                availability = TRIM(p_availability),
                subjects = COALESCE(p_subjects, '[]'::jsonb),
                classes = COALESCE(p_classes, '[]'::jsonb),
                boards = COALESCE(p_boards, '[]'::jsonb),
                documents = COALESCE(p_documents, '[]'::jsonb),
                user_id = v_resolved_user_id,
                updated_at = clock_timestamp()
            WHERE id = v_existing_id;

            RETURN jsonb_build_object(
                'id', v_existing_id,
                'action', 'updated',
                'status', v_existing_status,
                'user_id', v_resolved_user_id
            );
        ELSE
            -- Case B: Application is UNDER_REVIEW, APPROVED, or REJECTED
            -- Strictly locked against ingestion modification
            RETURN jsonb_build_object(
                'id', v_existing_id,
                'action', 'locked',
                'status', v_existing_status,
                'user_id', v_existing_user_id
            );
        END IF;
    END IF;

    -- Step 3: New Application Ingestion
    IF v_resolved_user_id IS NULL THEN
        -- Backward compatibility fallback: match user by email if pre-registered
        SELECT id INTO v_resolved_user_id
        FROM public.users
        WHERE LOWER(TRIM(email)) = v_norm_email
        LIMIT 1;
    END IF;

    INSERT INTO public.tutor_applications (
        google_response_id,
        user_id,
        full_name,
        email,
        phone,
        location,
        qualification,
        experience,
        fee,
        availability,
        subjects,
        classes,
        boards,
        documents,
        status,
        submitted_at
    ) VALUES (
        v_clean_resp_id,
        v_resolved_user_id,
        TRIM(p_full_name),
        v_norm_email,
        TRIM(p_phone),
        TRIM(p_location),
        TRIM(p_qualification),
        TRIM(p_experience),
        TRIM(p_fee),
        TRIM(p_availability),
        COALESCE(p_subjects, '[]'::jsonb),
        COALESCE(p_classes, '[]'::jsonb),
        COALESCE(p_boards, '[]'::jsonb),
        COALESCE(p_documents, '[]'::jsonb),
        'PENDING'::public.application_status,
        clock_timestamp()
    )
    RETURNING id INTO v_existing_id;

    RETURN jsonb_build_object(
        'id', v_existing_id,
        'action', 'created',
        'status', 'PENDING',
        'user_id', v_resolved_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke default public execution; allow service_role and postgres only
REVOKE ALL ON FUNCTION public.ingest_google_form_application(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, UUID
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ingest_google_form_application(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, UUID
) FROM anon;
REVOKE ALL ON FUNCTION public.ingest_google_form_application(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, UUID
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_google_form_application(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, UUID
) TO service_role, postgres;

-- 3. Stored Procedure for Admin Manual Account Linking
-- Allows verified administrators to manually bind an unlinked application to a registered Tutr account.
-- Enforces:
-- - Admin authorization check (public.is_current_user_admin())
-- - Row-level lock FOR UPDATE on tutor_applications
-- - Target user must exist in public.users
-- - Anti-hijacking: if application already has a non-null user_id different from target, ABORTS
CREATE OR REPLACE FUNCTION public.admin_link_tutor_application_user(
    p_application_id UUID,
    p_target_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_app RECORD;
    v_target_user RECORD;
BEGIN
    -- Security Check: Only administrators can link applicant accounts
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can link applicant accounts.';
    END IF;

    -- Verify target user exists
    SELECT id, email, full_name INTO v_target_user
    FROM public.users
    WHERE id = p_target_user_id;

    IF v_target_user.id IS NULL THEN
        RAISE EXCEPTION 'Target user does not exist in Tutr.';
    END IF;

    -- Lock application row FOR UPDATE
    SELECT id, user_id, status, email, full_name INTO v_app
    FROM public.tutor_applications
    WHERE id = p_application_id
    FOR UPDATE;

    IF v_app.id IS NULL THEN
        RAISE EXCEPTION 'Tutor application with ID % not found.', p_application_id;
    END IF;

    -- Anti-Hijacking Guard: Cannot reassign if already linked to a different user
    IF v_app.user_id IS NOT NULL AND v_app.user_id <> p_target_user_id THEN
        RAISE EXCEPTION 'Application is already linked to another user (%) and cannot be reassigned.', v_app.user_id;
    END IF;

    -- Atomically assign user_id
    UPDATE public.tutor_applications
    SET
        user_id = p_target_user_id,
        updated_at = clock_timestamp()
    WHERE id = p_application_id;

    RETURN jsonb_build_object(
        'success', true,
        'application_id', p_application_id,
        'linked_user_id', p_target_user_id,
        'linked_user_email', v_target_user.email,
        'linked_user_name', v_target_user.full_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke default public execution; allow authenticated admins (guarded by is_current_user_admin) and service_role
REVOKE ALL ON FUNCTION public.admin_link_tutor_application_user(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_link_tutor_application_user(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_link_tutor_application_user(UUID, UUID) TO authenticated, service_role, postgres;
