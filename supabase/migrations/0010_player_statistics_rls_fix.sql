-- Migration 0010: Fix missing INSERT/UPDATE RLS policies on player_statistics
-- The original 0009 migration only had SELECT policies.
-- Without INSERT/UPDATE, client-side computeAndSavePlayerStatistics() silently fails.

-- Players can insert their own statistics record (first-time setup)
CREATE POLICY "player_statistics: players can insert own"
  ON public.player_statistics FOR INSERT
  WITH CHECK (player_id IN (
    SELECT id FROM public.players WHERE profile_id = auth.uid()
  ));

-- Players can update their own statistics record
CREATE POLICY "player_statistics: players can update own"
  ON public.player_statistics FOR UPDATE
  USING (player_id IN (
    SELECT id FROM public.players WHERE profile_id = auth.uid()
  ))
  WITH CHECK (player_id IN (
    SELECT id FROM public.players WHERE profile_id = auth.uid()
  ));
