-- Tutr Migration: 010_tutor_connections
-- Description: Phase 6 Student–Tutor Connection & Contact Unlock.
-- Includes:
-- 1. Optional student phone column.
-- 2. connection_status and payment_status enums.
-- 3. tutor_connections table with foreign keys, constraints, and indexes.
-- 4. Triggers for validation, forward-only transitions, and updated_at.
-- 5. Strict RLS policies.
-- 6. Atomic RPCs for connection creation, payment unlock, and secure contact reveal.

-- ==============================================================================
-- 1. Student Phone Column
-- ==============================================================================
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone TEXT NULL;

-- ==============================================================================
-- 2. Enums for Connection and Payment State
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connection_status') THEN
        CREATE TYPE public.connection_status AS ENUM (
            'PENDING_PAYMENT',
            'CONTACT_UNLOCKED',
            'CANCELLED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE public.payment_status AS ENUM (
            'PENDING',
            'SUCCESS',
            'FAILED'
        );
    END IF;
END $$;

-- ==============================================================================
-- 3. Table: public.tutor_connections
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tutor_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID UNIQUE NOT NULL REFERENCES public.tutor_requests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    tutor_id UUID NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
    status public.connection_status NOT NULL DEFAULT 'PENDING_PAYMENT'::public.connection_status,
    payment_status public.payment_status NOT NULL DEFAULT 'PENDING'::public.payment_status,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    paid_at TIMESTAMPTZ,
    contact_unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tutor_connections_request_id ON public.tutor_connections(request_id);
CREATE INDEX IF NOT EXISTS idx_tutor_connections_student_id ON public.tutor_connections(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_connections_tutor_id ON public.tutor_connections(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_connections_status ON public.tutor_connections(status);
CREATE INDEX IF NOT EXISTS idx_tutor_connections_payment_status ON public.tutor_connections(payment_status);
CREATE INDEX IF NOT EXISTS idx_tutor_connections_razorpay_order_id ON public.tutor_connections(razorpay_order_id);

-- Automated updated_at trigger
DROP TRIGGER IF EXISTS trg_tutor_connections_updated_at ON public.tutor_connections;
CREATE TRIGGER trg_tutor_connections_updated_at
    BEFORE UPDATE ON public.tutor_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 4. Connection State Machine & Validation Triggers
-- ==============================================================================

-- Validation on Insert
CREATE OR REPLACE FUNCTION public.validate_connection_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_req_status public.tutor_request_status;
    v_req_student_id UUID;
    v_req_tutor_id UUID;
BEGIN
    -- Enforce initial status
    IF NEW.status <> 'PENDING_PAYMENT'::public.connection_status THEN
        RAISE EXCEPTION 'Initial connection status must be PENDING_PAYMENT.';
    END IF;

    IF NEW.payment_status <> 'PENDING'::public.payment_status THEN
        RAISE EXCEPTION 'Initial payment status must be PENDING.';
    END IF;

    -- Verify target request exists and is ACCEPTED
    SELECT status, student_id, tutor_id
    INTO v_req_status, v_req_student_id, v_req_tutor_id
    FROM public.tutor_requests
    WHERE id = NEW.request_id;

    IF v_req_status IS NULL THEN
        RAISE EXCEPTION 'Referenced tutor request does not exist.';
    END IF;

    IF v_req_status <> 'ACCEPTED'::public.tutor_request_status THEN
        RAISE EXCEPTION 'Cannot create connection for request in % status. Request must be ACCEPTED.', v_req_status;
    END IF;

    -- Verify participants match the request
    IF NEW.student_id <> v_req_student_id THEN
        RAISE EXCEPTION 'Connection student_id does not match the tutor request.';
    END IF;

    IF NEW.tutor_id <> v_req_tutor_id THEN
        RAISE EXCEPTION 'Connection tutor_id does not match the tutor request.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_validate_connection_insert ON public.tutor_connections;
CREATE TRIGGER trg_validate_connection_insert
    BEFORE INSERT ON public.tutor_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_connection_insert();

-- Validation on Update (Forward-only state transitions & Terminal protection)
CREATE OR REPLACE FUNCTION public.validate_connection_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := public.is_current_user_admin();

    -- Allow updated_at change if nothing else is modified
    IF NEW.status IS NOT DISTINCT FROM OLD.status
       AND NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status
       AND NEW.amount IS NOT DISTINCT FROM OLD.amount
       AND NEW.razorpay_order_id IS NOT DISTINCT FROM OLD.razorpay_order_id
       AND NEW.razorpay_payment_id IS NOT DISTINCT FROM OLD.razorpay_payment_id THEN
        RETURN NEW;
    END IF;

    -- Non-admins cannot alter the amount once set
    IF NEW.amount IS DISTINCT FROM OLD.amount AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Unauthorized: Connection amount cannot be modified.';
    END IF;

    -- Terminal state protection: Once unlocked, cannot reset to PENDING_PAYMENT
    IF OLD.status = 'CONTACT_UNLOCKED'::public.connection_status AND NEW.status <> 'CONTACT_UNLOCKED'::public.connection_status THEN
        RAISE EXCEPTION 'Terminal state reached: Cannot alter a connection that is already CONTACT_UNLOCKED.';
    END IF;

    -- Terminal state protection: Once SUCCESS, payment_status cannot be altered to PENDING/FAILED
    IF OLD.payment_status = 'SUCCESS'::public.payment_status AND NEW.payment_status <> 'SUCCESS'::public.payment_status THEN
        RAISE EXCEPTION 'Terminal payment state reached: Cannot alter payment status once SUCCESS.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_validate_connection_transition ON public.tutor_connections;
CREATE TRIGGER trg_validate_connection_transition
    BEFORE UPDATE ON public.tutor_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_connection_transition();

-- ==============================================================================
-- 5. Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.tutor_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tutor_connections_select_policy" ON public.tutor_connections;
CREATE POLICY "tutor_connections_select_policy"
    ON public.tutor_connections
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = tutor_connections.student_id AND s.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.tutor_profiles tp
            WHERE tp.id = tutor_connections.tutor_id AND tp.user_id = auth.uid()
        )
        OR public.is_current_user_admin()
    );

-- Direct client modifications are disallowed.
-- All connection creation and status changes run through trusted SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS "tutor_connections_insert_admin_only" ON public.tutor_connections;
CREATE POLICY "tutor_connections_insert_admin_only"
    ON public.tutor_connections FOR INSERT
    WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "tutor_connections_update_admin_only" ON public.tutor_connections;
CREATE POLICY "tutor_connections_update_admin_only"
    ON public.tutor_connections FOR UPDATE
    USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "tutor_connections_delete_admin_only" ON public.tutor_connections;
CREATE POLICY "tutor_connections_delete_admin_only"
    ON public.tutor_connections FOR DELETE
    USING (public.is_current_user_admin());

-- ==============================================================================
-- 6. Atomic RPCs
-- ==============================================================================

-- A. Updated accept_tutor_request: Atomically transitions request AND creates connection
DROP FUNCTION IF EXISTS public.accept_tutor_request(UUID);
CREATE OR REPLACE FUNCTION public.accept_tutor_request(
    p_request_id UUID,
    p_amount NUMERIC DEFAULT 99
)
RETURNS JSONB AS $$
DECLARE
    v_uid UUID;
    v_req RECORD;
    v_conn_id UUID;
    v_is_admin BOOLEAN;
    v_validated_amount NUMERIC;
BEGIN
    v_uid := auth.uid();
    v_is_admin := public.is_current_user_admin();
    v_validated_amount := COALESCE(p_amount, 99);

    IF v_validated_amount < 0 THEN
        RAISE EXCEPTION 'Invalid connection fee: amount must be non-negative.';
    END IF;

    -- Fetch request
    SELECT r.id, r.status, r.student_id, r.tutor_id, tp.user_id AS tutor_user_id
    INTO v_req
    FROM public.tutor_requests r
    JOIN public.tutor_profiles tp ON tp.id = r.tutor_id
    WHERE r.id = p_request_id;

    IF v_req.id IS NULL THEN
        RAISE EXCEPTION 'Tutor request not found.';
    END IF;

    -- Authorization check: Only assigned tutor or admin can accept
    IF NOT (v_is_admin OR (v_uid IS NOT NULL AND v_uid = v_req.tutor_user_id)) THEN
        RAISE EXCEPTION 'Unauthorized: Only the assigned tutor can accept this request.';
    END IF;

    -- State check: Must be PENDING
    IF v_req.status <> 'PENDING'::public.tutor_request_status THEN
        RAISE EXCEPTION 'Cannot accept a request that is already %.', v_req.status;
    END IF;

    -- 1. Atomically update request status
    UPDATE public.tutor_requests
    SET status = 'ACCEPTED'::public.tutor_request_status,
        responded_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = p_request_id;

    -- 2. Atomically provision connection in PENDING_PAYMENT status
    INSERT INTO public.tutor_connections (
        request_id,
        student_id,
        tutor_id,
        status,
        payment_status,
        amount,
        currency
    ) VALUES (
        v_req.id,
        v_req.student_id,
        v_req.tutor_id,
        'PENDING_PAYMENT'::public.connection_status,
        'PENDING'::public.payment_status,
        v_validated_amount,
        'INR'
    )
    ON CONFLICT (request_id) DO UPDATE
    SET amount = EXCLUDED.amount
    RETURNING id INTO v_conn_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'ACCEPTED',
        'request_id', p_request_id,
        'connection_id', v_conn_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- B. unlock_connection_after_payment
CREATE OR REPLACE FUNCTION public.unlock_connection_after_payment(
    p_connection_id UUID,
    p_razorpay_order_id TEXT,
    p_razorpay_payment_id TEXT,
    p_razorpay_signature TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_conn RECORD;
BEGIN
    SELECT * INTO v_conn
    FROM public.tutor_connections
    WHERE id = p_connection_id;

    IF v_conn.id IS NULL THEN
        RAISE EXCEPTION 'Connection record not found.';
    END IF;

    -- Idempotency: If already unlocked, return success cleanly
    IF v_conn.status = 'CONTACT_UNLOCKED'::public.connection_status THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_unlocked', true,
            'connection_id', v_conn.id,
            'status', 'CONTACT_UNLOCKED'
        );
    END IF;

    -- Atomically update to CONTACT_UNLOCKED and SUCCESS
    UPDATE public.tutor_connections
    SET status = 'CONTACT_UNLOCKED'::public.connection_status,
        payment_status = 'SUCCESS'::public.payment_status,
        razorpay_order_id = COALESCE(p_razorpay_order_id, razorpay_order_id),
        razorpay_payment_id = p_razorpay_payment_id,
        razorpay_signature = p_razorpay_signature,
        paid_at = clock_timestamp(),
        contact_unlocked_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = p_connection_id;

    RETURN jsonb_build_object(
        'success', true,
        'unlocked', true,
        'connection_id', p_connection_id,
        'status', 'CONTACT_UNLOCKED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- C. get_unlocked_connection_contacts
CREATE OR REPLACE FUNCTION public.get_unlocked_connection_contacts(p_connection_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_uid UUID;
    v_conn RECORD;
    v_student_uid UUID;
    v_tutor_uid UUID;
    v_is_admin BOOLEAN;

    -- Contact payload records
    v_tutor_name TEXT;
    v_tutor_phone TEXT;
    v_tutor_email TEXT;
    v_tutor_locality TEXT;

    v_student_name TEXT;
    v_student_phone TEXT;
    v_student_email TEXT;
BEGIN
    v_uid := auth.uid();
    v_is_admin := public.is_current_user_admin();

    IF v_uid IS NULL AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Resolve connection and participants
    SELECT c.*,
           s.user_id AS student_user_id,
           tp.user_id AS tutor_user_id,
           tp.display_name AS tutor_display_name,
           tp.locality AS tutor_locality,
           ta.phone AS tutor_app_phone,
           COALESCE(ta.email, tu.email) AS tutor_app_email,
           su.full_name AS student_full_name,
           su.email AS student_user_email,
           s.phone AS student_phone
    INTO v_conn
    FROM public.tutor_connections c
    JOIN public.students s ON s.id = c.student_id
    JOIN public.users su ON su.id = s.user_id
    JOIN public.tutor_profiles tp ON tp.id = c.tutor_id
    JOIN public.users tu ON tu.id = tp.user_id
    LEFT JOIN public.tutor_applications ta ON ta.id = tp.application_id
    WHERE c.id = p_connection_id;

    IF v_conn.id IS NULL THEN
        RAISE EXCEPTION 'Connection record not found.';
    END IF;

    -- Authorization check: Caller must be the student, the tutor, or an admin
    IF NOT (v_is_admin OR v_uid = v_conn.student_user_id OR v_uid = v_conn.tutor_user_id) THEN
        RAISE EXCEPTION 'Unauthorized access to connection contacts.';
    END IF;

    -- State check: If not CONTACT_UNLOCKED, return locked notice
    IF v_conn.status <> 'CONTACT_UNLOCKED'::public.connection_status THEN
        RETURN jsonb_build_object(
            'unlocked', false,
            'message', 'Contact details locked until verified payment.'
        );
    END IF;

    -- When CONTACT_UNLOCKED, disclose the permitted contact fields based on caller role
    IF v_uid = v_conn.student_user_id THEN
        -- Student viewing Tutor Contact
        RETURN jsonb_build_object(
            'unlocked', true,
            'role', 'STUDENT',
            'tutor', jsonb_build_object(
                'name', v_conn.tutor_display_name,
                'phone', v_conn.tutor_app_phone,
                'email', v_conn.tutor_app_email,
                'locality', v_conn.tutor_locality
            ),
            'paid_at', v_conn.paid_at,
            'contact_unlocked_at', v_conn.contact_unlocked_at
        );
    ELSE
        -- Tutor (or Admin) viewing Student Contact
        RETURN jsonb_build_object(
            'unlocked', true,
            'role', 'TUTOR',
            'student', jsonb_build_object(
                'name', v_conn.student_full_name,
                'phone', v_conn.student_phone,
                'email', v_conn.student_user_email
            ),
            'paid_at', v_conn.paid_at,
            'contact_unlocked_at', v_conn.contact_unlocked_at
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;
