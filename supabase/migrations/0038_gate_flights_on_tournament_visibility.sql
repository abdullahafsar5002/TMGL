-- ============================================================
-- 0038: Gate flights and flight players on tournament visibility
-- ============================================================
--
-- Migration 0037 made live and closed tournaments readable, and
-- tournaments, rounds, matches, registrations and trophies all gate
-- their reads on can_read_tournament(). Flights and flight_players were
-- left as unconditional policies:
--
--   create policy "flights: public can read" ... using (true)
--   create policy "flight_players: public can read" ... using (true)
--
-- So a flight belonging to a draft tournament is readable by anyone,
-- including an anonymous visitor, while its parent tournament, rounds
-- and matches are all manager-only. No draft tournament has flights
-- yet, so nothing leaked today; this closes it before one does.

DROP POLICY IF EXISTS "flights: public can read" ON public.flights;
CREATE POLICY "flights: public can read"
  ON public.flights
  FOR SELECT
  USING (public.can_read_tournament(tournament_id));

DROP POLICY IF EXISTS "flight_players: public can read" ON public.flight_players;
CREATE POLICY "flight_players: public can read"
  ON public.flight_players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.flights f
      WHERE f.id = flight_id
        AND public.can_read_tournament(f.tournament_id)
    )
  );