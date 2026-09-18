-- Migration 0006: updated_at trigger + fix deprecated auth.role()
-- Run: supabase db push

-- 1. Create auto-update trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply trigger to all tables with updated_at column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.seasons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.rounds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.scorecards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.scorecard_holes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Fix deprecated auth.role() usage in RLS policies
-- Replace auth.role() = 'authenticated' with auth.uid() IS NOT NULL

-- Drop and recreate courses read policy
DROP POLICY IF EXISTS "courses: authenticated users can read" ON public.courses;
CREATE POLICY "courses: authenticated users can read"
  ON public.courses FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Drop and recreate course_holes read policy
DROP POLICY IF EXISTS "course_holes: authenticated users can read" ON public.course_holes;
CREATE POLICY "course_holes: authenticated users can read"
  ON public.course_holes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 4. Add missing DELETE policy for seasons
DROP POLICY IF EXISTS "seasons: managers can delete" ON public.seasons;
CREATE POLICY "seasons: managers can delete"
  ON public.seasons FOR DELETE
  USING (get_user_role() IN ('super_admin', 'league_manager'));

-- 5. Add missing UPDATE policy for course_holes
DROP POLICY IF EXISTS "course_holes: managers can update" ON public.course_holes;
CREATE POLICY "course_holes: managers can update"
  ON public.course_holes FOR UPDATE
  USING (get_user_role() IN ('super_admin', 'league_manager'));
