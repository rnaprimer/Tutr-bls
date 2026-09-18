-- Tutr Migration: 005_reference_and_junctions
-- Description: Normalized reference tables (subjects, classes, boards), seed data, and tutor junction tables.

-- 1. Reference Table: Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 2. Reference Table: Classes
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 3. Reference Table: Boards
CREATE TABLE IF NOT EXISTS public.boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 4. Seed Reference Data (Idempotent via ON CONFLICT)

-- Subjects: 10 common Balasore subjects
INSERT INTO public.subjects (name, slug)
VALUES
    ('Mathematics', 'mathematics'),
    ('Physics', 'physics'),
    ('Chemistry', 'chemistry'),
    ('Biology', 'biology'),
    ('English', 'english'),
    ('Odia', 'odia'),
    ('Computer Science', 'computer-science'),
    ('Social Science', 'social-science'),
    ('Science', 'science'),
    ('Hindi', 'hindi')
ON CONFLICT (slug) DO NOTHING;

-- Classes: Class 1 through Class 12
INSERT INTO public.classes (name, slug, sort_order)
VALUES
    ('Class 1', 'class-1', 1),
    ('Class 2', 'class-2', 2),
    ('Class 3', 'class-3', 3),
    ('Class 4', 'class-4', 4),
    ('Class 5', 'class-5', 5),
    ('Class 6', 'class-6', 6),
    ('Class 7', 'class-7', 7),
    ('Class 8', 'class-8', 8),
    ('Class 9', 'class-9', 9),
    ('Class 10', 'class-10', 10),
    ('Class 11', 'class-11', 11),
    ('Class 12', 'class-12', 12)
ON CONFLICT (slug) DO NOTHING;

-- Boards: Target academic boards in Balasore, Odisha
INSERT INTO public.boards (name, slug)
VALUES
    ('BSE Odisha', 'bse-odisha'),
    ('CHSE Odisha', 'chse-odisha'),
    ('CBSE', 'cbse'),
    ('ICSE', 'icse')
ON CONFLICT (slug) DO NOTHING;

-- 5. Normalized Junction Tables for Approved Marketplace Tutors
-- ARCHITECTURAL PRINCIPLE: No duplicate sources of truth.
-- While incoming raw application submissions use JSONB in 'tutor_applications',
-- verified tutor marketplace discovery exclusively uses these normalized tables.

CREATE TABLE IF NOT EXISTS public.tutor_subjects (
    tutor_id UUID NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (tutor_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_tutor_subjects_subject ON public.tutor_subjects(subject_id);

CREATE TABLE IF NOT EXISTS public.tutor_classes (
    tutor_id UUID NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    PRIMARY KEY (tutor_id, class_id)
);
CREATE INDEX IF NOT EXISTS idx_tutor_classes_class ON public.tutor_classes(class_id);

CREATE TABLE IF NOT EXISTS public.tutor_boards (
    tutor_id UUID NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    PRIMARY KEY (tutor_id, board_id)
);
CREATE INDEX IF NOT EXISTS idx_tutor_boards_board ON public.tutor_boards(board_id);
