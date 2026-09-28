BEGIN;

CREATE OR REPLACE FUNCTION public.recompute_scorecard_totals(p_scorecard_id uuid) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_status public.scorecard_status;
    v_course_id uuid;
    v_expected integer[];
    v_required integer;
    v_present integer;
    v_total_strokes integer;
    v_total_to_par integer;
    v_complete boolean;
BEGIN
    IF p_scorecard_id IS NULL THEN
        RETURN;
    END IF;

    PERFORM 1
    FROM public.scorecards AS sc
    WHERE sc.id = p_scorecard_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT
        sc.status,
        COALESCE(
            sc.course_id,
            (
                SELECT t.course_id
                FROM public.rounds AS r
                JOIN public.tournaments AS t ON t.id = r.tournament_id
                WHERE r.id = sc.round_id
            )
        )
    INTO v_status, v_course_id
    FROM public.scorecards AS sc
    WHERE sc.id = p_scorecard_id;

    v_expected := public.scorecard_expected_holes(v_course_id);

    v_complete := true;
    IF v_expected IS NOT NULL THEN
        v_required := COALESCE(pg_catalog.array_length(v_expected, 1), 0);

        SELECT COUNT(*)::integer
        INTO v_present
        FROM public.scorecard_holes AS ch
        WHERE ch.scorecard_id = p_scorecard_id
          AND ch.hole_number = ANY (v_expected);

        v_complete := (v_present = v_required);
    END IF;

    IF NOT v_complete
       AND v_status IN ('submitted'::public.scorecard_status, 'verified'::public.scorecard_status) THEN
        v_status := 'in_progress'::public.scorecard_status;
    END IF;

    SELECT SUM(ch.strokes)::integer, SUM(ch.strokes - ch.par)::integer
    INTO v_total_strokes, v_total_to_par
    FROM public.scorecard_holes AS ch
    WHERE ch.scorecard_id = p_scorecard_id;

    UPDATE public.scorecards
    SET total_strokes = v_total_strokes,
        total_score_to_par = v_total_to_par,
        status = v_status,
        updated_at = pg_catalog.now()
    WHERE id = p_scorecard_id;
END;
$function$;

NOTIFY pgrst, 'reload schema';

COMMIT;
