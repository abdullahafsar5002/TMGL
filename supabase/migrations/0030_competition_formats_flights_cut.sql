BEGIN;

DO $enum$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'scoring_format'
  ) THEN
    CREATE TYPE public.scoring_format AS ENUM ('stroke_play', 'stableford', 'match_play', 'nassau', 'best_ball', 'scramble');
  END IF;
END;
$enum$;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS scoring_format public.scoring_format NOT NULL DEFAULT 'stroke_play';
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS flight_count integer NOT NULL DEFAULT 1;
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_flight_count_check;
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_flight_count_check CHECK (flight_count BETWEEN 1 AND 10);

ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS scoring_format public.scoring_format NOT NULL DEFAULT 'stroke_play';
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS cut_after_hole integer;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS cut_line_score integer;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS tee_interval_minutes integer NOT NULL DEFAULT 9;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS first_tee_time time;
ALTER TABLE public.rounds DROP CONSTRAINT IF EXISTS rounds_cut_after_hole_check;
ALTER TABLE public.rounds
  ADD CONSTRAINT rounds_cut_after_hole_check CHECK (cut_after_hole IS NULL OR cut_after_hole BETWEEN 1 AND 18);
ALTER TABLE public.rounds DROP CONSTRAINT IF EXISTS rounds_cut_line_score_check;
ALTER TABLE public.rounds
  ADD CONSTRAINT rounds_cut_line_score_check CHECK (cut_line_score IS NULL OR cut_line_score > 0);
ALTER TABLE public.rounds DROP CONSTRAINT IF EXISTS rounds_tee_interval_minutes_check;
ALTER TABLE public.rounds
  ADD CONSTRAINT rounds_tee_interval_minutes_check CHECK (tee_interval_minutes BETWEEN 3 AND 30);

CREATE TABLE IF NOT EXISTS public.flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL,
  tournament_id uuid NOT NULL,
  name text NOT NULL,
  order_index integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flights_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE CASCADE,
  CONSTRAINT flights_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE,
  CONSTRAINT flights_round_id_name_key UNIQUE (round_id, name),
  CONSTRAINT flights_round_id_order_index_key UNIQUE (round_id, order_index)
);

CREATE TABLE IF NOT EXISTS public.flight_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid NOT NULL,
  player_id uuid NOT NULL,
  pairing_no integer NOT NULL CHECK (pairing_no >= 1),
  tee_time time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flight_players_flight_id_fkey FOREIGN KEY (flight_id) REFERENCES public.flights(id) ON DELETE CASCADE,
  CONSTRAINT flight_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE,
  CONSTRAINT flight_players_flight_id_player_id_key UNIQUE (flight_id, player_id),
  CONSTRAINT flight_players_flight_id_pairing_no_key UNIQUE (flight_id, pairing_no)
);

ALTER TABLE public.flights DROP CONSTRAINT IF EXISTS flights_round_id_fkey;
ALTER TABLE public.flights
  ADD CONSTRAINT flights_round_id_fkey
  FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE CASCADE;
ALTER TABLE public.flights DROP CONSTRAINT IF EXISTS flights_tournament_id_fkey;
ALTER TABLE public.flights
  ADD CONSTRAINT flights_tournament_id_fkey
  FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;
ALTER TABLE public.flights DROP CONSTRAINT IF EXISTS flights_round_id_name_key;
ALTER TABLE public.flights
  ADD CONSTRAINT flights_round_id_name_key UNIQUE (round_id, name);
ALTER TABLE public.flights DROP CONSTRAINT IF EXISTS flights_round_id_order_index_key;
ALTER TABLE public.flights
  ADD CONSTRAINT flights_round_id_order_index_key UNIQUE (round_id, order_index);

ALTER TABLE public.flight_players DROP CONSTRAINT IF EXISTS flight_players_flight_id_fkey;
ALTER TABLE public.flight_players
  ADD CONSTRAINT flight_players_flight_id_fkey
  FOREIGN KEY (flight_id) REFERENCES public.flights(id) ON DELETE CASCADE;
ALTER TABLE public.flight_players DROP CONSTRAINT IF EXISTS flight_players_player_id_fkey;
ALTER TABLE public.flight_players
  ADD CONSTRAINT flight_players_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;
ALTER TABLE public.flight_players DROP CONSTRAINT IF EXISTS flight_players_flight_id_player_id_key;
ALTER TABLE public.flight_players
  ADD CONSTRAINT flight_players_flight_id_player_id_key UNIQUE (flight_id, player_id);
ALTER TABLE public.flight_players DROP CONSTRAINT IF EXISTS flight_players_flight_id_pairing_no_key;
ALTER TABLE public.flight_players
  ADD CONSTRAINT flight_players_flight_id_pairing_no_key UNIQUE (flight_id, pairing_no);

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS flight_id uuid;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS pairing_no integer;
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_flight_id_fkey;
ALTER TABLE public.matches
  ADD CONSTRAINT matches_flight_id_fkey
  FOREIGN KEY (flight_id) REFERENCES public.flights(id) ON DELETE SET NULL;
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_pairing_no_check;
ALTER TABLE public.matches
  ADD CONSTRAINT matches_pairing_no_check CHECK (pairing_no IS NULL OR pairing_no >= 1);

ALTER TABLE public.scorecards ADD COLUMN IF NOT EXISTS dnf boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS flights_tournament_idx ON public.flights (tournament_id);
CREATE INDEX IF NOT EXISTS flight_players_player_idx ON public.flight_players (player_id);
CREATE INDEX IF NOT EXISTS matches_flight_idx ON public.matches (flight_id);
CREATE INDEX IF NOT EXISTS matches_round_pairing_idx ON public.matches (round_id, pairing_no);

CREATE OR REPLACE FUNCTION public.match_tournament_id(p_match_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.tournament_id
  FROM public.matches m
  JOIN public.rounds r ON r.id = m.round_id
  WHERE m.id = p_match_id;
$$;

REVOKE ALL ON FUNCTION public.match_tournament_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_tournament_id(uuid) TO anon, authenticated, service_role;

DO $policies$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('flights', 'flight_players', 'matches', 'scorecards')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END;
$policies$;

ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flights: public can read" ON public.flights FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "flights: managers can insert" ON public.flights FOR INSERT TO authenticated
  WITH CHECK (
    public.is_event_manager()
    AND EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = public.flights.tournament_id)
  );
CREATE POLICY "flights: managers can update" ON public.flights FOR UPDATE TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());
CREATE POLICY "flights: managers can delete" ON public.flights FOR DELETE TO authenticated
  USING (public.is_event_manager());

CREATE POLICY "flight_players: authenticated can read" ON public.flight_players FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "flight_players: managers can insert" ON public.flight_players FOR INSERT TO authenticated
  WITH CHECK (public.is_event_manager());
CREATE POLICY "flight_players: managers can update" ON public.flight_players FOR UPDATE TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());
CREATE POLICY "flight_players: managers can delete" ON public.flight_players FOR DELETE TO authenticated
  USING (public.is_event_manager());

CREATE POLICY "matches: public can read open tournament matches" ON public.matches FOR SELECT
  USING (public.can_read_tournament(public.match_tournament_id(id)));
CREATE POLICY "matches: managers can manage" ON public.matches FOR ALL TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());

CREATE POLICY "scorecards: public can read event data" ON public.scorecards FOR SELECT
  USING (public.can_view_scorecard(id));
CREATE POLICY "scorecards: managers can read" ON public.scorecards FOR SELECT TO authenticated
  USING (public.is_event_manager());
CREATE POLICY "scorecards: owner can insert" ON public.scorecards FOR INSERT TO authenticated
  WITH CHECK (
    (public.player_belongs_to_user(player_id) AND status IN ('draft', 'in_progress', 'submitted'))
    OR public.is_event_manager()
  );
CREATE POLICY "scorecards: owner can update" ON public.scorecards FOR UPDATE TO authenticated
  USING (public.can_edit_scorecard(id))
  WITH CHECK (
    (public.player_belongs_to_user(player_id) AND status IN ('draft', 'in_progress', 'submitted', 'rejected', 'amended'))
    OR public.is_event_manager()
  );
CREATE POLICY "scorecards: owner can delete" ON public.scorecards FOR DELETE TO authenticated
  USING (public.can_edit_scorecard(id) AND status IN ('draft', 'rejected'));
CREATE POLICY "scorecards: managers can manage" ON public.scorecards FOR ALL TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());

DROP TRIGGER IF EXISTS set_updated_at ON public.flights;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.flights
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.flight_players;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.flight_players
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.flights REPLICA IDENTITY FULL;
ALTER TABLE public.flight_players REPLICA IDENTITY FULL;

DO $$
DECLARE
  r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOR r IN
      SELECT *
      FROM (VALUES
        ('public', 'flights'),
        ('public', 'flight_players')
      ) AS v(schemaname, tablename)
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables pt
        WHERE pt.pubname = 'supabase_realtime'
          AND pt.schemaname = r.schemaname
          AND pt.tablename = r.tablename
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I', r.schemaname, r.tablename);
      END IF;
    END LOOP;
  END IF;
END;
$$;

DO $pairings$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'round_pairings'
      AND c.relkind IN ('v', 'm')
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'round_pairings'
        AND c.relkind = 'm'
    ) THEN
      EXECUTE 'DROP MATERIALIZED VIEW public.round_pairings';
    ELSE
      EXECUTE 'DROP VIEW public.round_pairings';
    END IF;
  END IF;

  EXECUTE $create_view$
    CREATE VIEW public.round_pairings
    WITH (security_invoker = true)
    AS
    SELECT
      f.id AS flight_id,
      f.name AS flight_name,
      f.order_index,
      fp.player_id,
      p.full_name AS player_name,
      p.handicap_index,
      fp.pairing_no,
      fp.tee_time
    FROM public.flights f
    JOIN public.flight_players fp ON fp.flight_id = f.id
    JOIN public.players p ON p.id = fp.player_id
    ORDER BY f.order_index, fp.pairing_no
  $create_view$;
END;
$pairings$;

GRANT ALL ON TABLE public.flights, public.flight_players TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tournaments, public.rounds, public.matches, public.scorecards TO anon, authenticated, service_role;
GRANT SELECT ON public.round_pairings TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
