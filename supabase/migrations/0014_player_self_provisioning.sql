-- Migration 0014: Player self-provisioning
-- Problem: PlayerCreatePage sets profile_id: null, so getPlayerByProfileId()
-- always returns zero rows. Regular players have no INSERT policy on players.
-- Fix: Allow authenticated users to INSERT a player linked to their own profile.

-- 1. Allow authenticated users to insert a player linked to their own profile
--    The WITH CHECK ensures profile_id = auth.uid() so users can only create
--    their own player record. The UNIQUE constraint on profile_id prevents duplicates.
CREATE POLICY "players: authenticated can self-provision"
  ON public.players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
  );

-- 2. Allow authenticated users to update their own player record (for profile linking)
--    This enables fixing existing players that were created with profile_id: null
CREATE POLICY "players: owner can update own"
  ON public.players
  FOR UPDATE
  TO authenticated
  USING (
    profile_id = auth.uid()
  )
  WITH CHECK (
    profile_id = auth.uid()
  );
