-- ==============================================================================
-- Tutr — Migration 011: Tutor Relationships & Discovery View Fix
-- 1. Update approve_tutor_application to atomically populate tutor_subjects,
--    tutor_classes, and tutor_boards from the approved application.
-- 2. Backfill existing approved tutor profiles to restore missing relationships.
-- 3. Update public_tutor_profiles view to include tutor-constrained aggregated
--    subjects, classes, and boards JSONB arrays.
-- ==============================================================================

-- 1. Update approve_tutor_application
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

    -- 7. Atomically populate tutor_subjects from application selections
    IF v_app.subjects IS NOT NULL AND jsonb_typeof(to_jsonb(v_app.subjects)) = 'array' THEN
        INSERT INTO public.tutor_subjects (tutor_id, subject_id)
        SELECT DISTINCT v_profile_id, s.id
        FROM jsonb_array_elements_text(to_jsonb(v_app.subjects)) AS raw_sub
        JOIN public.subjects s ON (
            LOWER(TRIM(s.name)) = LOWER(TRIM(raw_sub))
            OR s.slug = LOWER(REGEXP_REPLACE(TRIM(raw_sub), '\s+', '-', 'g'))
        )
        ON CONFLICT (tutor_id, subject_id) DO NOTHING;
    END IF;

    -- 8. Atomically populate tutor_classes from application selections
    IF v_app.classes IS NOT NULL AND jsonb_typeof(to_jsonb(v_app.classes)) = 'array' THEN
        INSERT INTO public.tutor_classes (tutor_id, class_id)
        SELECT DISTINCT v_profile_id, c.id
        FROM jsonb_array_elements_text(to_jsonb(v_app.classes)) AS raw_cls
        JOIN public.classes c ON (
            LOWER(TRIM(c.name)) = LOWER(TRIM(raw_cls))
            OR c.slug = LOWER(REGEXP_REPLACE(TRIM(raw_cls), '\s+', '-', 'g'))
            OR c.sort_order = NULLIF(REGEXP_REPLACE(raw_cls, '[^\d]', '', 'g'), '')::INT
            OR c.name ILIKE '%' || TRIM(raw_cls)
        )
        ON CONFLICT (tutor_id, class_id) DO NOTHING;
    END IF;

    -- 9. Atomically populate tutor_boards from application selections
    IF v_app.boards IS NOT NULL AND jsonb_typeof(to_jsonb(v_app.boards)) = 'array' THEN
        INSERT INTO public.tutor_boards (tutor_id, board_id)
        SELECT DISTINCT v_profile_id, b.id
        FROM jsonb_array_elements_text(to_jsonb(v_app.boards)) AS raw_brd
        JOIN public.boards b ON (
            LOWER(TRIM(b.name)) = LOWER(TRIM(raw_brd))
            OR b.slug = LOWER(REGEXP_REPLACE(TRIM(raw_brd), '\s+', '-', 'g'))
            OR b.name ILIKE TRIM(raw_brd) || '%'
        )
        ON CONFLICT (tutor_id, board_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'application_id', p_application_id,
        'profile_id', v_profile_id,
        'status', 'APPROVED',
        'is_verified', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 2. Backfill existing approved tutor profiles
INSERT INTO public.tutor_subjects (tutor_id, subject_id)
SELECT DISTINCT tp.id, s.id
FROM public.tutor_profiles tp
JOIN public.tutor_applications app ON app.id = tp.application_id
CROSS JOIN LATERAL jsonb_array_elements_text(to_jsonb(app.subjects)) AS raw_sub
JOIN public.subjects s ON (
    LOWER(TRIM(s.name)) = LOWER(TRIM(raw_sub))
    OR s.slug = LOWER(REGEXP_REPLACE(TRIM(raw_sub), '\s+', '-', 'g'))
)
ON CONFLICT (tutor_id, subject_id) DO NOTHING;

INSERT INTO public.tutor_classes (tutor_id, class_id)
SELECT DISTINCT tp.id, c.id
FROM public.tutor_profiles tp
JOIN public.tutor_applications app ON app.id = tp.application_id
CROSS JOIN LATERAL jsonb_array_elements_text(to_jsonb(app.classes)) AS raw_cls
JOIN public.classes c ON (
    LOWER(TRIM(c.name)) = LOWER(TRIM(raw_cls))
    OR c.slug = LOWER(REGEXP_REPLACE(TRIM(raw_cls), '\s+', '-', 'g'))
    OR c.sort_order = NULLIF(REGEXP_REPLACE(raw_cls, '[^\d]', '', 'g'), '')::INT
    OR c.name ILIKE '%' || TRIM(raw_cls)
)
ON CONFLICT (tutor_id, class_id) DO NOTHING;

INSERT INTO public.tutor_boards (tutor_id, board_id)
SELECT DISTINCT tp.id, b.id
FROM public.tutor_profiles tp
JOIN public.tutor_applications app ON app.id = tp.application_id
CROSS JOIN LATERAL jsonb_array_elements_text(to_jsonb(app.boards)) AS raw_brd
JOIN public.boards b ON (
    LOWER(TRIM(b.name)) = LOWER(TRIM(raw_brd))
    OR b.slug = LOWER(REGEXP_REPLACE(TRIM(raw_brd), '\s+', '-', 'g'))
    OR b.name ILIKE TRIM(raw_brd) || '%'
)
ON CONFLICT (tutor_id, board_id) DO NOTHING;

-- 3. Update public.public_tutor_profiles view to include tutor-specific aggregated subjects, classes, boards
CREATE OR REPLACE VIEW public.public_tutor_profiles
WITH (security_invoker = true)
AS
SELECT
    tp.id,
    tp.display_name,
    tp.photo_url,
    tp.bio,
    tp.qualification,
    tp.experience,
    tp.locality,
    tp.teaching_areas,
    tp.fee,
    tp.availability,
    tp.is_verified,
    tp.created_at,
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'slug', s.slug) ORDER BY s.name)
            FROM public.tutor_subjects ts
            JOIN public.subjects s ON s.id = ts.subject_id
            WHERE ts.tutor_id = tp.id
        ),
        '[]'::jsonb
    ) AS subjects,
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'sort_order', c.sort_order) ORDER BY c.sort_order)
            FROM public.tutor_classes tc
            JOIN public.classes c ON c.id = tc.class_id
            WHERE tc.tutor_id = tp.id
        ),
        '[]'::jsonb
    ) AS classes,
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'slug', b.slug) ORDER BY b.name)
            FROM public.tutor_boards tb
            JOIN public.boards b ON b.id = tb.board_id
            WHERE tb.tutor_id = tp.id
        ),
        '[]'::jsonb
    ) AS boards
FROM public.tutor_profiles tp
WHERE tp.is_verified = true;
