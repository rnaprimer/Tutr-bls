-- Tutr Migration: 007_google_forms_ingestion
-- Description: Robust ingestion procedure for Google Forms intake, duplicate handling, and delayed user identity linking.

-- 1. Update handle_new_auth_user() trigger to automatically link delayed tutor applications
-- When a tutor submitted a Google Form before signing up with Google OAuth,
-- their application has user_id = NULL. Upon signup, link only applications matching their
-- normalized email where user_id IS NULL. Never reassign an application already linked to another user.
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
    -- Strict guard: never reassign an application already linked to another user.
    UPDATE public.tutor_applications
    SET user_id = NEW.id
    WHERE LOWER(TRIM(email)) = v_norm_email
      AND user_id IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 2. Stored Ingestion Function: public.ingest_google_form_application
-- Securely ingests or updates a Google Form application.
-- Enforces:
-- - Hardcoded initial status = 'PENDING'
-- - Never allows caller to set or overwrite status, reviewed_at, reviewed_by, or rejection_reason
-- - Respects partial unique index idx_tutor_applications_google_response_id
-- - Idempotent re-delivery for PENDING applications updates applicant fields
-- - Applications UNDER_REVIEW, APPROVED, or REJECTED are locked against form tampering
-- - Matches and binds user_id if applicant email already exists in public.users
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
    p_documents JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_norm_email TEXT;
    v_clean_resp_id TEXT;
    v_user_id UUID;
    v_existing_id UUID;
    v_existing_status public.application_status;
    v_existing_user_id UUID;
    v_new_id UUID;
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

    -- Check for existing application by google_response_id
    SELECT id, status, user_id
    INTO v_existing_id, v_existing_status, v_existing_user_id
    FROM public.tutor_applications
    WHERE google_response_id = v_clean_resp_id;

    IF v_existing_id IS NOT NULL THEN
        -- Case A: Application already exists and is still PENDING
        IF v_existing_status = 'PENDING'::public.application_status THEN
            -- Link user_id if it was null and user now exists
            IF v_existing_user_id IS NULL THEN
                SELECT id INTO v_user_id
                FROM public.users
                WHERE LOWER(TRIM(email)) = v_norm_email
                LIMIT 1;
            ELSE
                v_user_id := v_existing_user_id;
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
                user_id = v_user_id,
                updated_at = clock_timestamp()
            WHERE id = v_existing_id;

            RETURN jsonb_build_object(
                'id', v_existing_id,
                'action', 'updated',
                'status', v_existing_status,
                'user_id', v_user_id
            );
        ELSE
            -- Case B: Application is UNDER_REVIEW, APPROVED, or REJECTED.
            -- Strictly preserve review state and audit fields from being overwritten by intake.
            RETURN jsonb_build_object(
                'id', v_existing_id,
                'action', 'locked',
                'status', v_existing_status,
                'user_id', v_existing_user_id
            );
        END IF;
    END IF;

    -- Case C: New Application
    -- Resolve user_id if matching user exists in public.users
    SELECT id INTO v_user_id
    FROM public.users
    WHERE LOWER(TRIM(email)) = v_norm_email
    LIMIT 1;

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
        v_user_id,
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
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'id', v_new_id,
        'action', 'created',
        'status', 'PENDING',
        'user_id', v_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke default public execution; allow service_role and authenticated/postgres
REVOKE ALL ON FUNCTION public.ingest_google_form_application FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_google_form_application TO service_role, postgres;
