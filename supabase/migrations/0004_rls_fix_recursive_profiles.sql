-- TMGL Migration 0004: Fix recursive RLS on profiles
--
-- Problem:
--   The "profiles" table policies "managers can read all" and
--   "super_admin can update any" contain self-referencing subqueries:
--     EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() ...)
--   When PostgreSQL evaluates these policies, it must query profiles to
--   resolve the subquery. But profiles has RLS enabled, so PostgreSQL
--   evaluates profiles policies again, producing infinite recursion.
--   PostgREST surfaces the resulting PostgreSQL error as HTTP 500 on
--   EVERY endpoint that references profiles in its policies.
--
-- Solution:
--   Create a SECURITY DEFINER function that reads the current user's
--   role from profiles as the function owner (postgres), bypassing RLS.
--   Replace all profiles subqueries in policies with calls to this function.
--
-- This migration does NOT:
--   - Modify migrations 0001, 0002, or 0003
--   - Disable RLS on any table
--   - Add mock data
--   - Change authorization semantics

-- ============================================================
-- STEP 1: SECURITY DEFINER helper function
-- ============================================================
-- Runs as the function owner (postgres), bypassing RLS.
-- Returns NULL for anon users or users without a profile,
-- which evaluates to falsy in IN (...) comparisons.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- STEP 2: Grant execute permissions
-- ============================================================
-- PostgREST evaluates ALL SELECT policies on a table for every
-- request, including anonymous ones. Without EXECUTE for anon,
-- the manager-check policy evaluation would fail with a
-- permission error, producing HTTP 500.

GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- ============================================================
-- STEP 3: Recreate affected policies
-- ============================================================
-- Each policy below was originally defined in migrations 0002 or
-- 0003 with a direct subquery into public.profiles. The new
-- version calls public.get_user_role() instead, which breaks
-- the recursion cycle.

-- ----------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------
-- "profiles: owner can read own" is unchanged (uses auth.uid() = id)

DROP POLICY IF EXISTS "profiles: managers can read all" ON public.profiles;
CREATE POLICY "profiles: managers can read all"
  ON public.profiles
  FOR SELECT
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "profiles: super_admin can update any" ON public.profiles;
CREATE POLICY "profiles: super_admin can update any"
  ON public.profiles
  FOR UPDATE
  USING (
    public.get_user_role() = 'super_admin'
  );

-- "profiles: owner can update own name and avatar" — USING unchanged,
-- WITH CHECK updated to remove self-referencing subquery.
DROP POLICY IF EXISTS "profiles: owner can update own name and avatar" ON public.profiles;
CREATE POLICY "profiles: owner can update own name and avatar"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.get_user_role()
  );

-- ----------------------------------------------------------
-- SEASONS
-- ----------------------------------------------------------
-- "seasons: public can read active seasons" is unchanged

DROP POLICY IF EXISTS "seasons: managers can read all seasons" ON public.seasons;
CREATE POLICY "seasons: managers can read all seasons"
  ON public.seasons
  FOR SELECT
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "seasons: managers can insert" ON public.seasons;
CREATE POLICY "seasons: managers can insert"
  ON public.seasons
  FOR INSERT
  WITH CHECK (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "seasons: managers can update" ON public.seasons;
CREATE POLICY "seasons: managers can update"
  ON public.seasons
  FOR UPDATE
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

-- ----------------------------------------------------------
-- PLAYERS
-- ----------------------------------------------------------
-- "players: public can read active players" is unchanged
-- "players: owner can read own" is unchanged

DROP POLICY IF EXISTS "players: managers can read all" ON public.players;
CREATE POLICY "players: managers can read all"
  ON public.players
  FOR SELECT
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "players: managers can insert" ON public.players;
CREATE POLICY "players: managers can insert"
  ON public.players
  FOR INSERT
  WITH CHECK (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "players: managers can update" ON public.players;
CREATE POLICY "players: managers can update"
  ON public.players
  FOR UPDATE
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "players: managers can delete" ON public.players;
CREATE POLICY "players: managers can delete"
  ON public.players
  FOR DELETE
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

-- ----------------------------------------------------------
-- DIVISIONS
-- ----------------------------------------------------------
-- "divisions: public can read active season divisions" is unchanged

DROP POLICY IF EXISTS "divisions: managers can read all" ON public.divisions;
CREATE POLICY "divisions: managers can read all"
  ON public.divisions
  FOR SELECT
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "divisions: managers can insert" ON public.divisions;
CREATE POLICY "divisions: managers can insert"
  ON public.divisions
  FOR INSERT
  WITH CHECK (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "divisions: managers can update" ON public.divisions;
CREATE POLICY "divisions: managers can update"
  ON public.divisions
  FOR UPDATE
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "divisions: managers can delete" ON public.divisions;
CREATE POLICY "divisions: managers can delete"
  ON public.divisions
  FOR DELETE
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

-- ----------------------------------------------------------
-- TEAMS
-- ----------------------------------------------------------
-- "teams: public can read active season teams" is unchanged

DROP POLICY IF EXISTS "teams: managers can read all" ON public.teams;
CREATE POLICY "teams: managers can read all"
  ON public.teams
  FOR SELECT
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "teams: managers can insert" ON public.teams;
CREATE POLICY "teams: managers can insert"
  ON public.teams
  FOR INSERT
  WITH CHECK (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "teams: managers can update" ON public.teams;
CREATE POLICY "teams: managers can update"
  ON public.teams
  FOR UPDATE
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "teams: managers can delete" ON public.teams;
CREATE POLICY "teams: managers can delete"
  ON public.teams
  FOR DELETE
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

-- ----------------------------------------------------------
-- TEAM_MEMBERS
-- ----------------------------------------------------------
-- "team_members: public can read active season members" is unchanged

DROP POLICY IF EXISTS "team_members: managers can read all" ON public.team_members;
CREATE POLICY "team_members: managers can read all"
  ON public.team_members
  FOR SELECT
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "team_members: managers can insert" ON public.team_members;
CREATE POLICY "team_members: managers can insert"
  ON public.team_members
  FOR INSERT
  WITH CHECK (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "team_members: managers can delete" ON public.team_members;
CREATE POLICY "team_members: managers can delete"
  ON public.team_members
  FOR DELETE
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

-- ----------------------------------------------------------
-- COURSES
-- ----------------------------------------------------------
-- "courses: authenticated users can read" is unchanged

DROP POLICY IF EXISTS "courses: managers can insert" ON public.courses;
CREATE POLICY "courses: managers can insert"
  ON public.courses
  FOR INSERT
  WITH CHECK (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

DROP POLICY IF EXISTS "courses: managers can update" ON public.courses;
CREATE POLICY "courses: managers can update"
  ON public.courses
  FOR UPDATE
  USING (
    public.get_user_role() in ('super_admin', 'league_manager')
  );

-- ----------------------------------------------------------
-- COURSE_HOLES
-- ----------------------------------------------------------
-- "course_holes: authenticated users can read" is unchanged

DROP POLICY IF EXISTS "course_holes: managers can insert" ON public.course_holes;
CREATE POLICY "course_holes: managers can insert"
  ON public.course_holes
  FOR INSERT
  WITH CHECK (
    public.get_user_role() in ('super_admin', 'league_manager')
  );
