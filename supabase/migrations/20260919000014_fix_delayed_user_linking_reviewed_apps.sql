-- ==============================================================================
-- Tutr — Migration 014: Fix Delayed Identity Linking for Reviewed Applications
-- ==============================================================================
-- When a tutor submitted an application that was reviewed/approved before their
-- Google OAuth signup, handle_new_auth_user() links user_id on tutor_applications.
-- The validation trigger trg_validate_tutor_application_transition must permit
-- populating user_id from NULL on reviewed applications while strictly preventing
-- any status or content tampering by non-admins.

CREATE OR REPLACE FUNCTION public.validate_tutor_application_transition()
RETURNS TRIGGER AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    is_admin := public.is_current_user_admin();

    -- Non-admin integrity checks
    IF NOT is_admin THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators can update application status.';
        END IF;

        IF NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators can modify reviewed_at.';
        END IF;

        IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators can modify reviewed_by.';
        END IF;

        IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators can modify rejection_reason.';
        END IF;

        IF OLD.status <> 'PENDING'::public.application_status THEN
            -- Allow system identity linking when an unassigned application (user_id IS NULL)
            -- is being linked to a new user upon Google OAuth signup, provided no review
            -- or applicant content fields are being modified.
            IF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL
               AND NEW.status = OLD.status
               AND NEW.full_name = OLD.full_name
               AND NEW.email = OLD.email THEN
                -- Identity linking permitted
                NULL;
            ELSE
                RAISE EXCEPTION 'Application cannot be modified once review has commenced.';
            END IF;
        END IF;
    ELSE
        -- Admin status transition validation
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            IF OLD.status = 'PENDING' AND NEW.status NOT IN ('UNDER_REVIEW', 'APPROVED', 'REJECTED') THEN
                RAISE EXCEPTION 'Invalid status transition from PENDING to %', NEW.status;
            ELSIF OLD.status = 'UNDER_REVIEW' AND NEW.status NOT IN ('APPROVED', 'REJECTED', 'PENDING') THEN
                RAISE EXCEPTION 'Invalid status transition from UNDER_REVIEW to %', NEW.status;
            ELSIF OLD.status = 'APPROVED' AND NEW.status NOT IN ('UNDER_REVIEW', 'REJECTED') THEN
                RAISE EXCEPTION 'Approved applications can only be transitioned back to UNDER_REVIEW or REJECTED';
            ELSIF OLD.status = 'REJECTED' AND NEW.status NOT IN ('UNDER_REVIEW', 'PENDING') THEN
                RAISE EXCEPTION 'Rejected applications can only be reopened to UNDER_REVIEW or PENDING';
            END IF;

            -- Populate review audit metadata if approving or rejecting
            IF NEW.status IN ('APPROVED', 'REJECTED') THEN
                NEW.reviewed_at := COALESCE(NEW.reviewed_at, clock_timestamp());
                NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;
