BEGIN;

DO $policies$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "flight_players: authenticated can read" ON public.flight_players';
  EXECUTE 'CREATE POLICY "flight_players: public can read" ON public.flight_players FOR SELECT TO anon, authenticated USING (true)';
END;
$policies$;

GRANT SELECT ON TABLE public.flight_players TO anon, authenticated, service_role;

GRANT SELECT ON TABLE public.round_pairings TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
