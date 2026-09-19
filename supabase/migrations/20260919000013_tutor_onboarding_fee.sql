-- ==============================================================================
-- Tutr — Migration 013: Tutor Onboarding Fee (₹149 One-Time Payment After Admin Approval)
-- ==============================================================================

-- 1. Alter public.tutor_profiles: Add is_active column
ALTER TABLE public.tutor_profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tutor_profiles_is_active ON public.tutor_profiles(is_active);

-- 2. Security Trigger: Update prevent_tutor_self_verification to guard is_active as well
CREATE OR REPLACE FUNCTION public.prevent_tutor_self_verification()
RETURNS TRIGGER AS $$
BEGIN
    -- Guard is_verified: Only administrators can modify tutor verification status
    IF (TG_OP = 'INSERT' AND NEW.is_verified = true) OR
       (TG_OP = 'UPDATE' AND NEW.is_verified IS DISTINCT FROM OLD.is_verified) THEN
        IF NOT public.is_current_user_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators can modify tutor verification status.';
        END IF;
    END IF;

    -- Guard is_active: Only administrators or trusted server-side payment RPCs can activate tutor profiles
    IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR
       (TG_OP = 'UPDATE' AND NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
        IF NOT public.is_current_user_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators or verified payment operations can modify tutor activation status.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 3. Create public.tutor_onboarding_payments table
CREATE TABLE IF NOT EXISTS public.tutor_onboarding_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.tutor_applications(id) ON DELETE CASCADE,
    tutor_profile_id UUID REFERENCES public.tutor_profiles(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',

    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED')
    ),

    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,

    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Indexes for tutor_onboarding_payments
CREATE INDEX IF NOT EXISTS idx_tutor_onboarding_payments_application_id ON public.tutor_onboarding_payments(application_id);
CREATE INDEX IF NOT EXISTS idx_tutor_onboarding_payments_tutor_profile_id ON public.tutor_onboarding_payments(tutor_profile_id);
CREATE INDEX IF NOT EXISTS idx_tutor_onboarding_payments_user_id ON public.tutor_onboarding_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_onboarding_payments_status ON public.tutor_onboarding_payments(status);
CREATE INDEX IF NOT EXISTS idx_tutor_onboarding_payments_razorpay_order_id ON public.tutor_onboarding_payments(razorpay_order_id);

-- Unique partial index: At most ONE successful onboarding payment per application
CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_onboarding_payments_one_paid
ON public.tutor_onboarding_payments(application_id)
WHERE status = 'PAID';

-- Updated_at trigger for tutor_onboarding_payments
DROP TRIGGER IF EXISTS trg_tutor_onboarding_payments_updated_at ON public.tutor_onboarding_payments;
CREATE TRIGGER trg_tutor_onboarding_payments_updated_at
    BEFORE UPDATE ON public.tutor_onboarding_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 4. Enable Row Level Security on public.tutor_onboarding_payments
ALTER TABLE public.tutor_onboarding_payments ENABLE ROW LEVEL SECURITY;

-- SELECT: Authenticated tutor can view own payment records; Admins can view all
DROP POLICY IF EXISTS "tutor_onboarding_payments_select_own_or_admin" ON public.tutor_onboarding_payments;
CREATE POLICY "tutor_onboarding_payments_select_own_or_admin"
    ON public.tutor_onboarding_payments
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR public.is_current_user_admin()
    );

-- INSERT / UPDATE / DELETE: Restricted strictly to administrators / service-role
DROP POLICY IF EXISTS "tutor_onboarding_payments_insert_admin_only" ON public.tutor_onboarding_payments;
CREATE POLICY "tutor_onboarding_payments_insert_admin_only"
    ON public.tutor_onboarding_payments
    FOR INSERT
    WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "tutor_onboarding_payments_update_admin_only" ON public.tutor_onboarding_payments;
CREATE POLICY "tutor_onboarding_payments_update_admin_only"
    ON public.tutor_onboarding_payments
    FOR UPDATE
    USING (true)
    WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "tutor_onboarding_payments_delete_admin_only" ON public.tutor_onboarding_payments;
CREATE POLICY "tutor_onboarding_payments_delete_admin_only"
    ON public.tutor_onboarding_payments
    FOR DELETE
    USING (public.is_current_user_admin());

-- Trigger: Defensively prevent non-admins from modifying tutor_onboarding_payments directly
CREATE OR REPLACE FUNCTION public.prevent_direct_onboarding_payment_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Onboarding payment records can only be modified by administrators or verified payment operations.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_direct_onboarding_payment_modification ON public.tutor_onboarding_payments;
CREATE TRIGGER trg_prevent_direct_onboarding_payment_modification
    BEFORE INSERT OR UPDATE OR DELETE ON public.tutor_onboarding_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_direct_onboarding_payment_modification();

-- 5. Update public.approve_tutor_application
-- When an admin approves an application:
-- - application.status = APPROVED
-- - tutor_profile.is_verified = true
-- - tutor_profile.is_active = false (Approval does NOT activate the profile; fee is required)
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

    -- 2. Validate application existence and load record
    SELECT * INTO v_app
    FROM public.tutor_applications
    WHERE id = p_application_id
    FOR UPDATE;

    IF v_app.id IS NULL THEN
        RAISE EXCEPTION 'Tutor application with ID % not found.', p_application_id;
    END IF;

    -- 3. Validate Status Transition: Can only approve UNDER_REVIEW applications
    IF v_app.status <> 'UNDER_REVIEW'::public.application_status THEN
        RAISE EXCEPTION 'Invalid status transition: Only applications UNDER_REVIEW can be approved. Current status is %.', v_app.status;
    END IF;

    -- 4. Verify Applicant User Account Linkage
    v_user_id := v_app.user_id;
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id
        FROM public.users
        WHERE email = v_app.email;

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

    -- 6. Atomic Tutor Profile Provisioning
    -- is_verified = true, is_active = false (marketplace activation requires ₹149 fee)
    INSERT INTO public.tutor_profiles (
        user_id,
        application_id,
        display_name,
        qualification,
        experience,
        locality,
        fee,
        availability,
        is_verified,
        is_active
    ) VALUES (
        v_user_id,
        p_application_id,
        v_app.full_name,
        v_app.qualification,
        v_app.experience,
        v_app.location,
        v_app.fee,
        v_app.availability,
        true,
        false
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
        is_active = false,
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
        'is_verified', true,
        'is_active', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 6. RPC Function: complete_tutor_onboarding_payment
-- Atomic, idempotent server-side payment completion function
CREATE OR REPLACE FUNCTION public.complete_tutor_onboarding_payment(
    p_payment_id UUID,
    p_razorpay_order_id TEXT,
    p_razorpay_payment_id TEXT,
    p_razorpay_signature TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_payment RECORD;
    v_profile_id UUID;
BEGIN
    SELECT * INTO v_payment
    FROM public.tutor_onboarding_payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF v_payment.id IS NULL THEN
        RAISE EXCEPTION 'Onboarding payment record with ID % not found.', p_payment_id;
    END IF;

    -- Idempotency: If already PAID, return success cleanly without re-activating
    IF v_payment.status = 'PAID' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_paid', true,
            'payment_id', v_payment.id,
            'status', 'PAID',
            'is_active', true
        );
    END IF;

    -- Update onboarding payment record to PAID
    UPDATE public.tutor_onboarding_payments
    SET status = 'PAID',
        razorpay_order_id = COALESCE(p_razorpay_order_id, razorpay_order_id),
        razorpay_payment_id = p_razorpay_payment_id,
        razorpay_signature = p_razorpay_signature,
        paid_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = p_payment_id;

    -- Locate corresponding tutor profile
    v_profile_id := v_payment.tutor_profile_id;
    IF v_profile_id IS NULL THEN
        SELECT id INTO v_profile_id
        FROM public.tutor_profiles
        WHERE application_id = v_payment.application_id OR user_id = v_payment.user_id;
    END IF;

    -- Activate tutor profile for public discovery
    IF v_profile_id IS NOT NULL THEN
        UPDATE public.tutor_profiles
        SET is_active = true,
            updated_at = clock_timestamp()
        WHERE id = v_profile_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'paid', true,
        'active', true,
        'payment_id', p_payment_id,
        'profile_id', v_profile_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Revoke from public, grant to service_role and postgres
REVOKE ALL ON FUNCTION public.complete_tutor_onboarding_payment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_tutor_onboarding_payment TO service_role, postgres;

-- 7. Update public.public_tutor_profiles view
-- A tutor appears in public discovery ONLY IF:
-- - is_verified = true
-- - is_active = true
-- - application.status = APPROVED
-- - onboarding payment status = PAID
CREATE OR REPLACE VIEW public.public_tutor_profiles
WITH (security_invoker = false)
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
WHERE tp.is_verified = true
  AND tp.is_active = true
  AND (
      tp.application_id IS NULL
      OR (
          EXISTS (
              SELECT 1 FROM public.tutor_applications ta
              WHERE ta.id = tp.application_id
                AND ta.status = 'APPROVED'::public.application_status
          )
          AND EXISTS (
              SELECT 1 FROM public.tutor_onboarding_payments top
              WHERE (top.tutor_profile_id = tp.id OR top.application_id = tp.application_id)
                AND top.status = 'PAID'
          )
      )
  );

-- 8. Explicit Legacy Backfill
-- Scoped strictly to known pre-existing legacy tutors ('debashis' and 'dev')
-- who were onboarded and verified prior to the introduction of the ₹149 onboarding fee.
UPDATE public.tutor_profiles
SET is_active = true,
    updated_at = clock_timestamp()
WHERE id IN (
    '1bb0b7c3-56fd-41e3-bf69-da5556e4844f', -- debashis
    'ece1344d-6974-4f1a-a819-777092e9a5ad'  -- dev
);

INSERT INTO public.tutor_onboarding_payments (
    application_id,
    tutor_profile_id,
    user_id,
    amount,
    currency,
    status,
    razorpay_order_id,
    razorpay_payment_id,
    paid_at
)
SELECT
    tp.application_id,
    tp.id,
    tp.user_id,
    149,
    'INR',
    'PAID',
    'legacy_order_' || REPLACE(tp.id::text, '-', ''),
    'legacy_pay_' || REPLACE(tp.id::text, '-', ''),
    clock_timestamp()
FROM public.tutor_profiles tp
WHERE tp.id IN (
    '1bb0b7c3-56fd-41e3-bf69-da5556e4844f',
    'ece1344d-6974-4f1a-a819-777092e9a5ad'
)
  AND tp.application_id IS NOT NULL
ON CONFLICT (application_id) WHERE status = 'PAID' DO NOTHING;
