-- Tutr Migration: 006_rls_policies
-- Description: Enable Row Level Security (RLS) and establish comprehensive access policies for all tables.

-- ==============================================================================
-- 1. Enable RLS on All Tables
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_boards ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. Policies for public.users
-- ==============================================================================

-- A user can read their own identity record; Admins can read all users
CREATE POLICY "users_select_own_or_admin"
    ON public.users
    FOR SELECT
    USING (
        auth.uid() = id
        OR public.is_current_user_admin()
    );

-- A user can insert their own record during signup or profile initialization; Admins can insert
CREATE POLICY "users_insert_own_or_admin"
    ON public.users
    FOR INSERT
    WITH CHECK (
        auth.uid() = id
        OR public.is_current_user_admin()
    );

-- A user can update their own profile; Admins can update any user.
-- Trigger 'prevent_user_role_escalation' guarantees non-admins cannot change 'role'.
CREATE POLICY "users_update_own_or_admin"
    ON public.users
    FOR UPDATE
    USING (
        auth.uid() = id
        OR public.is_current_user_admin()
    )
    WITH CHECK (
        auth.uid() = id
        OR public.is_current_user_admin()
    );

-- Only Admins can delete users from public.users
CREATE POLICY "users_delete_admin_only"
    ON public.users
    FOR DELETE
    USING (
        public.is_current_user_admin()
    );

-- ==============================================================================
-- 3. Policies for public.students
-- ==============================================================================

CREATE POLICY "students_select_own_or_admin"
    ON public.students
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR public.is_current_user_admin()
    );

CREATE POLICY "students_insert_own_or_admin"
    ON public.students
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR public.is_current_user_admin()
    );

CREATE POLICY "students_update_own_or_admin"
    ON public.students
    FOR UPDATE
    USING (
        auth.uid() = user_id
        OR public.is_current_user_admin()
    )
    WITH CHECK (
        auth.uid() = user_id
        OR public.is_current_user_admin()
    );

CREATE POLICY "students_delete_own_or_admin"
    ON public.students
    FOR DELETE
    USING (
        auth.uid() = user_id
        OR public.is_current_user_admin()
    );

-- ==============================================================================
-- 4. Policies for public.tutor_applications
-- STRICT CONFIDENTIALITY:
-- Anonymous visitors and other ordinary users CANNOT read applications.
-- Only the applicant or an authorized Admin has access.
-- ==============================================================================

CREATE POLICY "tutor_applications_select_own_or_admin"
    ON public.tutor_applications
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR public.is_current_user_admin()
    );

CREATE POLICY "tutor_applications_insert_own_or_admin"
    ON public.tutor_applications
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR public.is_current_user_admin()
    );

-- Applicants can update their own application while still 'PENDING'.
-- Trigger 'validate_tutor_application_transition' blocks non-admins from changing status or review fields.
CREATE POLICY "tutor_applications_update_own_pending_or_admin"
    ON public.tutor_applications
    FOR UPDATE
    USING (
        (auth.uid() = user_id AND status = 'PENDING'::public.application_status)
        OR public.is_current_user_admin()
    )
    WITH CHECK (
        (auth.uid() = user_id AND status = 'PENDING'::public.application_status)
        OR public.is_current_user_admin()
    );

CREATE POLICY "tutor_applications_delete_admin_only"
    ON public.tutor_applications
    FOR DELETE
    USING (
        public.is_current_user_admin()
    );

-- ==============================================================================
-- 5. Policies for public.tutor_profiles
-- ==============================================================================

-- Verified tutors are viewable by public/students.
-- Unverified tutors are viewable ONLY by the owner tutor or admins.
CREATE POLICY "tutor_profiles_select_verified_or_owner_or_admin"
    ON public.tutor_profiles
    FOR SELECT
    USING (
        is_verified = true
        OR auth.uid() = user_id
        OR public.is_current_user_admin()
    );

-- Tutors or Admins can insert their profile. Trigger 'prevent_tutor_self_verification' enforces is_verified = false for non-admins.
CREATE POLICY "tutor_profiles_insert_own_or_admin"
    ON public.tutor_profiles
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR public.is_current_user_admin()
    );

-- Tutors can update their profile information. Trigger 'prevent_tutor_self_verification' blocks non-admins from modifying is_verified.
CREATE POLICY "tutor_profiles_update_own_or_admin"
    ON public.tutor_profiles
    FOR UPDATE
    USING (
        auth.uid() = user_id
        OR public.is_current_user_admin()
    )
    WITH CHECK (
        auth.uid() = user_id
        OR public.is_current_user_admin()
    );

CREATE POLICY "tutor_profiles_delete_own_or_admin"
    ON public.tutor_profiles
    FOR DELETE
    USING (
        auth.uid() = user_id
        OR public.is_current_user_admin()
    );

-- ==============================================================================
-- 6. Policies for Reference Tables (subjects, classes, boards)
-- Publicly readable by all; writable exclusively by Admins.
-- ==============================================================================

CREATE POLICY "subjects_select_public"
    ON public.subjects
    FOR SELECT
    USING (true);

CREATE POLICY "subjects_admin_write"
    ON public.subjects
    FOR ALL
    USING (public.is_current_user_admin())
    WITH CHECK (public.is_current_user_admin());

CREATE POLICY "classes_select_public"
    ON public.classes
    FOR SELECT
    USING (true);

CREATE POLICY "classes_admin_write"
    ON public.classes
    FOR ALL
    USING (public.is_current_user_admin())
    WITH CHECK (public.is_current_user_admin());

CREATE POLICY "boards_select_public"
    ON public.boards
    FOR SELECT
    USING (true);

CREATE POLICY "boards_admin_write"
    ON public.boards
    FOR ALL
    USING (public.is_current_user_admin())
    WITH CHECK (public.is_current_user_admin());

-- ==============================================================================
-- 7. Policies for Junction Tables (tutor_subjects, tutor_classes, tutor_boards)
-- Readable if the associated tutor profile is verified, owned, or viewer is Admin.
-- Manageable by the tutor who owns the profile or an Admin.
-- ==============================================================================

CREATE POLICY "tutor_subjects_select_policy"
    ON public.tutor_subjects
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tutor_profiles tp
            WHERE tp.id = tutor_subjects.tutor_id
              AND (tp.is_verified = true OR tp.user_id = auth.uid() OR public.is_current_user_admin())
        )
    );

CREATE POLICY "tutor_subjects_write_policy"
    ON public.tutor_subjects
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tutor_profiles tp
            WHERE tp.id = tutor_subjects.tutor_id
              AND (tp.user_id = auth.uid() OR public.is_current_user_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tutor_profiles tp
            WHERE tp.id = tutor_subjects.tutor_id
              AND (tp.user_id = auth.uid() OR public.is_current_user_admin())
        )
    );

CREATE POLICY "tutor_classes_select_policy"
    ON public.tutor_classes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tutor_profiles tp
            WHERE tp.id = tutor_classes.tutor_id
              AND (tp.is_verified = true OR tp.user_id = auth.uid() OR public.is_current_user_admin())
        )
    );

CREATE POLICY "tutor_classes_write_policy"
    ON public.tutor_classes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tutor_profiles tp
            WHERE tp.id = tutor_classes.tutor_id
              AND (tp.user_id = auth.uid() OR public.is_current_user_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tutor_profiles tp
            WHERE tp.id = tutor_classes.tutor_id
              AND (tp.user_id = auth.uid() OR public.is_current_user_admin())
        )
    );

CREATE POLICY "tutor_boards_select_policy"
    ON public.tutor_boards
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tutor_profiles tp
            WHERE tp.id = tutor_boards.tutor_id
              AND (tp.is_verified = true OR tp.user_id = auth.uid() OR public.is_current_user_admin())
        )
    );

CREATE POLICY "tutor_boards_write_policy"
    ON public.tutor_boards
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tutor_profiles tp
            WHERE tp.id = tutor_boards.tutor_id
              AND (tp.user_id = auth.uid() OR public.is_current_user_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tutor_profiles tp
            WHERE tp.id = tutor_boards.tutor_id
              AND (tp.user_id = auth.uid() OR public.is_current_user_admin())
        )
    );
