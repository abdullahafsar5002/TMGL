-- Migration 0008: Security fixes
-- 1. Add missing DELETE policies for courses and course_holes
-- 2. Tighten storage policies to manager-only for write operations

-- ============================================================
-- COURSES: add missing delete policy
-- ============================================================
DROP POLICY IF EXISTS "courses: managers can delete" ON public.courses;
CREATE POLICY "courses: managers can delete"
  ON public.courses FOR DELETE
  USING (get_user_role() IN ('super_admin', 'league_manager'));

-- ============================================================
-- COURSE_HOLES: add missing delete policy
-- ============================================================
DROP POLICY IF EXISTS "course_holes: managers can delete" ON public.course_holes;
CREATE POLICY "course_holes: managers can delete"
  ON public.course_holes FOR DELETE
  USING (get_user_role() IN ('super_admin', 'league_manager'));

-- ============================================================
-- STORAGE: tighten policies — managers only for write operations
-- ============================================================

-- Drop permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update team logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete team logos" ON storage.objects;

-- Managers can upload team logos
CREATE POLICY "Managers can upload team logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-logos'
  AND get_user_role() IN ('super_admin', 'league_manager')
);

-- Managers can update team logos
CREATE POLICY "Managers can update team logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-logos'
  AND get_user_role() IN ('super_admin', 'league_manager')
);

-- Managers can delete team logos
CREATE POLICY "Managers can delete team logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-logos'
  AND get_user_role() IN ('super_admin', 'league_manager')
);
