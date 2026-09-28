-- Migration 0010: Fix missing INSERT/UPDATE RLS policies on player_statistics
-- The original 0009 migration only had SELECT policies.
-- Without INSERT/UPDATE, client-side computeAndSavePlayerStatistics() silently fails.

DROP POLICY IF EXISTS "player_statistics: players can insert own" ON public.player_statistics;
CREATE POLICY "player_statistics: players can insert own"
  ON public.player_statistics FOR INSERT
  WITH CHECK (player_id IN (
    SELECT id FROM public.players WHERE profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "player_statistics: players can update own" ON public.player_statistics;
CREATE POLICY "player_statistics: players can update own"
  ON public.player_statistics FOR UPDATE
  USING (player_id IN (
    SELECT id FROM public.players WHERE profile_id = auth.uid()
  ))
  WITH CHECK (player_id IN (
    SELECT id FROM public.players WHERE profile_id = auth.uid()
  ));
