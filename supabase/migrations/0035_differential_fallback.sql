BEGIN;

ALTER TABLE public.score_differentials
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS par_total integer;

ALTER TABLE public.score_differentials
  DROP CONSTRAINT IF EXISTS score_differentials_source_check;
ALTER TABLE public.score_differentials
  ADD CONSTRAINT score_differentials_source_check
  CHECK (source IN ('course_rating', 'scratch_par', 'unknown'));

CREATE OR REPLACE FUNCTION public.calculate_and_store_differential() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_course_rating numeric(6, 2);
  v_slope_rating numeric(6, 2);
  v_gross_score integer;
  v_par_total integer;
  v_differential numeric(8, 2);
  v_course_id uuid;
  v_source text;
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

    SELECT COALESCE(SUM(h.par), 0)
    INTO v_par_total
    FROM public.scorecard_holes h
    WHERE h.scorecard_id = NEW.id;

    IF v_gross_score > 0 THEN
      IF v_course_rating IS NOT NULL AND v_slope_rating IS NOT NULL AND v_slope_rating > 0 THEN
        v_differential := (113.0 / v_slope_rating) * (v_gross_score - v_course_rating);
        v_source := 'course_rating';
      ELSIF v_par_total > 0 THEN
        v_differential := (v_gross_score - v_par_total)::numeric;
        v_source := 'scratch_par';
      ELSE
        v_differential := NULL;
        v_source := 'unknown';
      END IF;

      IF v_differential IS NOT NULL THEN
        INSERT INTO public.score_differentials
          (player_id, scorecard_id, round_id, course_id, gross_score, differential, par_total, source)
        VALUES
          (NEW.player_id, NEW.id, NEW.round_id, v_course_id, v_gross_score, v_differential, v_par_total, v_source)
        ON CONFLICT (round_id, player_id) DO UPDATE
        SET scorecard_id = EXCLUDED.scorecard_id,
            course_id = EXCLUDED.course_id,
            gross_score = EXCLUDED.gross_score,
            differential = EXCLUDED.differential,
            par_total = EXCLUDED.par_total,
            source = EXCLUDED.source,
            calculated_at = now();
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP FUNCTION IF EXISTS public.rebuild_missing_differentials();

CREATE FUNCTION public.rebuild_missing_differentials() RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count integer := 0;
  r record;
  v_par integer;
  v_differential numeric(8, 2);
  v_source text;
BEGIN
  FOR r IN
    SELECT sc.id AS scorecard_id, sc.player_id, sc.round_id, t.course_id,
      (SELECT COALESCE(SUM(h.strokes), 0) FROM public.scorecard_holes h WHERE h.scorecard_id = sc.id) AS gross,
      (SELECT COALESCE(SUM(h.par), 0) FROM public.scorecard_holes h WHERE h.scorecard_id = sc.id) AS par_total,
      c.course_rating, c.slope_rating
    FROM public.scorecards sc
    JOIN public.rounds r2 ON r2.id = sc.round_id
    JOIN public.tournaments t ON t.id = r2.tournament_id
    LEFT JOIN public.courses c ON c.id = t.course_id
    WHERE sc.status IN ('verified', 'amended')
      AND NOT EXISTS (
        SELECT 1 FROM public.score_differentials d WHERE d.scorecard_id = sc.id
      )
  LOOP
    v_par := r.par_total;
    IF r.gross > 0 AND r.course_rating IS NOT NULL AND r.slope_rating IS NOT NULL AND r.slope_rating > 0 THEN
      v_differential := (113.0 / r.slope_rating) * (r.gross - r.course_rating);
      v_source := 'course_rating';
    ELSIF r.gross > 0 AND v_par > 0 THEN
      v_differential := (r.gross - v_par)::numeric;
      v_source := 'scratch_par';
    ELSE
      CONTINUE;
    END IF;

    INSERT INTO public.score_differentials
      (player_id, scorecard_id, round_id, course_id, gross_score, differential, par_total, source)
    VALUES
      (r.player_id, r.scorecard_id, r.round_id, r.course_id, r.gross, v_differential, v_par, v_source)
    ON CONFLICT (round_id, player_id) DO UPDATE
    SET scorecard_id = EXCLUDED.scorecard_id,
        course_id = EXCLUDED.course_id,
        gross_score = EXCLUDED.gross_score,
        differential = EXCLUDED.differential,
        par_total = EXCLUDED.par_total,
        source = EXCLUDED.source,
        calculated_at = now();
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.rebuild_missing_differentials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_missing_differentials() TO service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.score_differentials TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
