BEGIN;

DO $normalize$
DECLARE
  v_type text;
  v_cleared integer := 0;
BEGIN
  SELECT data_type
  INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'tournament_registrations'
    AND column_name = 'player_id';

  IF v_type = 'text' THEN
    EXECUTE $q$
      UPDATE public.tournament_registrations
      SET player_id = NULL
      WHERE player_id IS NOT NULL
        AND player_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    $q$;
    GET DIAGNOSTICS v_cleared = ROW_COUNT;
    EXECUTE 'ALTER TABLE public.tournament_registrations ALTER COLUMN player_id DROP NOT NULL';
    EXECUTE 'ALTER TABLE public.tournament_registrations ALTER COLUMN player_id TYPE uuid USING player_id::uuid';
    RAISE NOTICE 'tournament_registrations.player_id: text -> uuid (% invalid rows cleared)', v_cleared;
  END IF;
END;
$normalize$;

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS auth_user_id uuid;

UPDATE public.players p
SET auth_user_id = p.profile_id
WHERE p.auth_user_id IS NULL
  AND p.profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS players_auth_user_id_unique_idx
  ON public.players (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

ALTER TABLE public.score_differentials DROP CONSTRAINT IF EXISTS unique_round_differential;
ALTER TABLE public.score_differentials DROP CONSTRAINT IF EXISTS score_differentials_player_id_fkey;

UPDATE public.score_differentials sd
SET player_id = p.id
FROM public.players p
WHERE sd.player_id = p.profile_id
  AND sd.player_id <> p.id;

UPDATE public.score_differentials sd
SET player_id = p.id
FROM public.players p
WHERE sd.player_id = p.auth_user_id
  AND sd.player_id <> p.id;

ALTER TABLE public.score_differentials
  ADD CONSTRAINT score_differentials_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS score_differentials_round_player_unique
  ON public.score_differentials (round_id, player_id);

CREATE OR REPLACE FUNCTION public.calculate_and_store_differential()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_rating numeric(6, 2);
  v_slope_rating numeric(6, 2);
  v_gross_score integer;
  v_differential numeric(8, 2);
  v_course_id uuid;
BEGIN
  IF NEW.status = 'verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    SELECT c.course_rating, c.slope_rating, c.id
    INTO v_course_rating, v_slope_rating, v_course_id
    FROM public.scorecards sc
    JOIN public.rounds r ON r.id = sc.round_id
    JOIN public.tournaments t ON t.id = r.tournament_id
    JOIN public.courses c ON c.id = t.course_id
    WHERE sc.id = NEW.id;

    SELECT COALESCE(SUM(sh.strokes), 0)
    INTO v_gross_score
    FROM public.scorecard_holes sh
    WHERE sh.scorecard_id = NEW.id;

    IF v_course_rating IS NOT NULL AND v_slope_rating IS NOT NULL AND v_slope_rating > 0 THEN
      v_differential := (113.0 / v_slope_rating) * (v_gross_score - v_course_rating);
      INSERT INTO public.score_differentials (player_id, round_id, course_id, gross_score, differential)
      VALUES (NEW.player_id, NEW.round_id, v_course_id, v_gross_score, v_differential)
      ON CONFLICT (round_id, player_id) DO UPDATE
      SET gross_score = EXCLUDED.gross_score,
          differential = EXCLUDED.differential;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_differential ON public.scorecards;
CREATE TRIGGER trg_calculate_differential
AFTER UPDATE OF status ON public.scorecards
FOR EACH ROW EXECUTE FUNCTION public.calculate_and_store_differential();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'live_tournament_leaderboard'
      AND c.relkind IN ('v', 'm')
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'live_tournament_leaderboard'
        AND c.relkind = 'm'
    ) THEN
      EXECUTE 'DROP MATERIALIZED VIEW public.live_tournament_leaderboard';
    ELSE
      EXECUTE 'DROP VIEW public.live_tournament_leaderboard';
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE VIEW public.live_tournament_leaderboard
WITH (security_invoker = true)
AS
SELECT
  t.id AS tournament_id,
  p.id AS player_id,
  p.full_name,
  COALESCE(p.handicap_index, 0) AS player_handicap,
  COALESCE(SUM(sh.strokes), 0) AS total_gross,
  COALESCE(SUM(sh.strokes), 0) - COALESCE(p.handicap_index, 0) AS total_net,
  COUNT(sh.id) AS holes_completed
FROM public.tournaments t
JOIN public.tournament_registrations r ON r.tournament_id = t.id
JOIN public.players p ON p.id = r.player_id::uuid
LEFT JOIN public.rounds rd ON rd.tournament_id = t.id
LEFT JOIN public.scorecards sc ON sc.round_id = rd.id AND sc.player_id = p.id
LEFT JOIN public.scorecard_holes sh ON sh.scorecard_id = sc.id
GROUP BY t.id, p.id, p.full_name, p.handicap_index;

GRANT SELECT ON public.live_tournament_leaderboard TO anon, authenticated;

DROP POLICY IF EXISTS "Players can view their own differentials" ON public.score_differentials;
DROP POLICY IF EXISTS "Admins can manage all differentials" ON public.score_differentials;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications: users can read own" ON public.notifications;
DROP POLICY IF EXISTS "notifications: system can insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications: admin can insert" ON public.notifications;

COMMIT;
