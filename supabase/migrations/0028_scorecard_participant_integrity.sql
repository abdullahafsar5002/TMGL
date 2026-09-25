BEGIN;

CREATE OR REPLACE FUNCTION public.current_player_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
SELECT p.id
FROM public.players AS p
WHERE p.profile_id = auth.uid()
ORDER BY p.id
LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.current_player_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_player_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_player_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.scorecard_expected_holes(p_course_id UUID)
RETURNS INTEGER[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_holes_count INTEGER;
    v_holes INTEGER[];
BEGIN
    IF p_course_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT c.holes_count
    INTO v_holes_count
    FROM public.courses AS c
    WHERE c.id = p_course_id;

    IF v_holes_count IS NOT NULL AND v_holes_count >= 1 AND v_holes_count <= 18 THEN
        RETURN ARRAY(SELECT pg_catalog.generate_series(1, v_holes_count));
    END IF;

    SELECT ARRAY_AGG(ch.hole_number ORDER BY ch.hole_number)
    INTO v_holes
    FROM public.course_holes AS ch
    WHERE ch.course_id = p_course_id;

    IF v_holes IS NOT NULL AND COALESCE(pg_catalog.array_length(v_holes, 1), 0) > 0 THEN
        RETURN v_holes;
    END IF;

    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_scorecard_totals(p_scorecard_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_status public.scorecard_status;
    v_course_id UUID;
    v_expected INTEGER[];
    v_required INTEGER;
    v_present INTEGER;
    v_total_strokes INTEGER;
    v_total_to_par INTEGER;
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

    IF v_expected IS NOT NULL
       AND v_status IN ('submitted'::public.scorecard_status, 'verified'::public.scorecard_status) THEN
        v_required := COALESCE(pg_catalog.array_length(v_expected, 1), 0);

        SELECT COUNT(*)::INTEGER
        INTO v_present
        FROM public.scorecard_holes AS ch
        WHERE ch.scorecard_id = p_scorecard_id
          AND ch.hole_number = ANY (v_expected);

        IF v_present IS DISTINCT FROM v_required THEN
            RAISE EXCEPTION
                'scorecard % may only stay % while every expected hole exists (% of % present)',
                p_scorecard_id, v_status, v_present, v_required
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    SELECT SUM(ch.strokes)::INTEGER, SUM(ch.strokes - ch.par)::INTEGER
    INTO v_total_strokes, v_total_to_par
    FROM public.scorecard_holes AS ch
    WHERE ch.scorecard_id = p_scorecard_id;

    UPDATE public.scorecards
    SET total_strokes = v_total_strokes,
        total_score_to_par = v_total_to_par,
        updated_at = pg_catalog.now()
    WHERE id = p_scorecard_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_scorecard_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_authenticated BOOLEAN;
    v_manager BOOLEAN;
    v_status_changed BOOLEAN;
    v_course_id UUID;
    v_expected INTEGER[];
    v_required INTEGER;
    v_present INTEGER;
    v_total_strokes INTEGER;
    v_total_to_par INTEGER;
BEGIN
    v_authenticated := (auth.uid() IS NOT NULL);
    v_manager := COALESCE(
        public.get_user_role() IN ('super_admin'::public.user_role, 'league_manager'::public.user_role),
        FALSE
    );

    IF v_authenticated THEN
        IF TG_OP = 'UPDATE' THEN
            IF NEW.id IS DISTINCT FROM OLD.id
               OR NEW.player_id IS DISTINCT FROM OLD.player_id
               OR NEW.round_id IS DISTINCT FROM OLD.round_id THEN
                RAISE EXCEPTION 'scorecard %: id, player_id and round_id are immutable', NEW.id
                    USING ERRCODE = 'insufficient_privilege';
            END IF;

            v_status_changed := (OLD.status IS DISTINCT FROM NEW.status);
        ELSE
            v_status_changed := TRUE;
        END IF;

        IF NOT v_manager
           AND NEW.status IN (
               'verified'::public.scorecard_status,
               'rejected'::public.scorecard_status,
               'amended'::public.scorecard_status
           ) THEN
            RAISE EXCEPTION 'scorecard %: only managers may set status %', NEW.id, NEW.status
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    ELSE
        v_status_changed := TRUE;
    END IF;

    v_course_id := COALESCE(
        NEW.course_id,
        (
            SELECT t.course_id
            FROM public.rounds AS r
            JOIN public.tournaments AS t ON t.id = r.tournament_id
            WHERE r.id = NEW.round_id
        )
    );

    v_expected := public.scorecard_expected_holes(v_course_id);

    IF v_expected IS NOT NULL
       AND v_status_changed
       AND NEW.status IN ('submitted'::public.scorecard_status, 'verified'::public.scorecard_status) THEN
        v_required := COALESCE(pg_catalog.array_length(v_expected, 1), 0);

        SELECT COUNT(*)::INTEGER
        INTO v_present
        FROM public.scorecard_holes AS ch
        WHERE ch.scorecard_id = NEW.id
          AND ch.hole_number = ANY (v_expected);

        IF v_present IS DISTINCT FROM v_required THEN
            RAISE EXCEPTION
                'scorecard % cannot be set to %: % of % required holes are scored',
                NEW.id, NEW.status, v_present, v_required
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    SELECT SUM(ch.strokes)::INTEGER, SUM(ch.strokes - ch.par)::INTEGER
    INTO v_total_strokes, v_total_to_par
    FROM public.scorecard_holes AS ch
    WHERE ch.scorecard_id = NEW.id;

    NEW.total_strokes := v_total_strokes;
    NEW.total_score_to_par := v_total_to_par;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_scorecard_holes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_manager BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    v_manager := COALESCE(
        public.get_user_role() IN ('super_admin'::public.user_role, 'league_manager'::public.user_role),
        FALSE
    );

    IF v_manager THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF COALESCE((pg_catalog.to_jsonb(NEW) ->> 'verified')::BOOLEAN, FALSE) THEN
            RAISE EXCEPTION 'only managers may set hole verification'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        RETURN NEW;
    END IF;

    IF NEW.scorecard_id IS DISTINCT FROM OLD.scorecard_id THEN
        RAISE EXCEPTION 'scorecard hole % cannot be moved to another scorecard', OLD.id
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF (pg_catalog.to_jsonb(NEW) -> 'verified') IS DISTINCT FROM (pg_catalog.to_jsonb(OLD) -> 'verified') THEN
        RAISE EXCEPTION 'only managers may set hole verification'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_scorecard_holes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recompute_scorecard_totals(OLD.scorecard_id);
        RETURN NULL;
    END IF;

    PERFORM public.recompute_scorecard_totals(NEW.scorecard_id);

    IF TG_OP = 'UPDATE' AND OLD.scorecard_id IS DISTINCT FROM NEW.scorecard_id THEN
        PERFORM public.recompute_scorecard_totals(OLD.scorecard_id);
    END IF;

    RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.scorecard_expected_holes(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scorecard_expected_holes(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.scorecard_expected_holes(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.recompute_scorecard_totals(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_scorecard_totals(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.recompute_scorecard_totals(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.guard_scorecard_write() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_scorecard_write() FROM anon;
GRANT EXECUTE ON FUNCTION public.guard_scorecard_write() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.guard_scorecard_holes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_scorecard_holes() FROM anon;
GRANT EXECUTE ON FUNCTION public.guard_scorecard_holes() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.sync_scorecard_holes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_scorecard_holes() FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_scorecard_holes() TO authenticated, service_role;

DO $policy$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'scorecards'
          AND policyname = 'scorecards: public can read open tournament scorecards'
    ) THEN
        ALTER POLICY "scorecards: public can read open tournament scorecards"
        ON public.scorecards
        TO PUBLIC
        USING (
            status IN (
                'submitted'::public.scorecard_status,
                'verified'::public.scorecard_status,
                'amended'::public.scorecard_status
            )
            AND EXISTS (
                SELECT 1
                FROM public.rounds AS r
                JOIN public.tournaments AS t ON t.id = r.tournament_id
                WHERE r.id = round_id
                  AND t.status IN (
                      'open'::public.tournament_status,
                      'live'::public.tournament_status,
                      'completed'::public.tournament_status,
                      'cancelled'::public.tournament_status
                  )
            )
        );
    END IF;
END;
$policy$;

DO $policy$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'scorecard_holes'
          AND policyname = 'scorecard_holes: public can read open tournament scorecard holes'
    ) THEN
        ALTER POLICY "scorecard_holes: public can read open tournament scorecard holes"
        ON public.scorecard_holes
        TO PUBLIC
        USING (
            EXISTS (
                SELECT 1
                FROM public.scorecards AS sc
                JOIN public.rounds AS r ON r.id = sc.round_id
                JOIN public.tournaments AS t ON t.id = r.tournament_id
                WHERE sc.id = scorecard_id
                  AND sc.status IN (
                      'submitted'::public.scorecard_status,
                      'verified'::public.scorecard_status,
                      'amended'::public.scorecard_status
                  )
                  AND t.status IN (
                      'open'::public.tournament_status,
                      'live'::public.tournament_status,
                      'completed'::public.tournament_status,
                      'cancelled'::public.tournament_status
                  )
            )
        );
    END IF;
END;
$policy$;

DROP POLICY IF EXISTS "scorecards: player can read own" ON public.scorecards;

CREATE POLICY "scorecards: player can read own"
  ON public.scorecards
  FOR SELECT
  TO authenticated
  USING (player_id = (SELECT public.current_player_id()));

DROP POLICY IF EXISTS "scorecards: player can insert own" ON public.scorecards;

CREATE POLICY "scorecards: player can insert own"
  ON public.scorecards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = (SELECT public.current_player_id())
    AND status IN (
      'draft'::public.scorecard_status,
      'in_progress'::public.scorecard_status,
      'submitted'::public.scorecard_status
    )
  );

DROP POLICY IF EXISTS "scorecards: player can update own" ON public.scorecards;

CREATE POLICY "scorecards: player can update own"
  ON public.scorecards
  FOR UPDATE
  TO authenticated
  USING (
    player_id = (SELECT public.current_player_id())
    AND status IN (
      'draft'::public.scorecard_status,
      'in_progress'::public.scorecard_status,
      'submitted'::public.scorecard_status
    )
  )
  WITH CHECK (
    player_id = (SELECT public.current_player_id())
    AND status IN (
      'draft'::public.scorecard_status,
      'in_progress'::public.scorecard_status,
      'submitted'::public.scorecard_status
    )
  );

DROP POLICY IF EXISTS "scorecard_holes: player can read own" ON public.scorecard_holes;

CREATE POLICY "scorecard_holes: player can read own"
  ON public.scorecard_holes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.scorecards AS sc
      WHERE sc.id = scorecard_id
        AND sc.player_id = (SELECT public.current_player_id())
    )
  );

DROP POLICY IF EXISTS "scorecard_holes: player can insert own" ON public.scorecard_holes;

CREATE POLICY "scorecard_holes: player can insert own"
  ON public.scorecard_holes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.scorecards AS sc
      WHERE sc.id = scorecard_id
        AND sc.player_id = (SELECT public.current_player_id())
        AND sc.status IN (
          'draft'::public.scorecard_status,
          'in_progress'::public.scorecard_status,
          'submitted'::public.scorecard_status
        )
    )
  );

DROP POLICY IF EXISTS "scorecard_holes: player can update own" ON public.scorecard_holes;

CREATE POLICY "scorecard_holes: player can update own"
  ON public.scorecard_holes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.scorecards AS sc
      WHERE sc.id = scorecard_id
        AND sc.player_id = (SELECT public.current_player_id())
        AND sc.status IN (
          'draft'::public.scorecard_status,
          'in_progress'::public.scorecard_status,
          'submitted'::public.scorecard_status
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.scorecards AS sc
      WHERE sc.id = scorecard_id
        AND sc.player_id = (SELECT public.current_player_id())
        AND sc.status IN (
          'draft'::public.scorecard_status,
          'in_progress'::public.scorecard_status,
          'submitted'::public.scorecard_status
        )
    )
  );

DROP POLICY IF EXISTS "scorecard_holes: player can delete own" ON public.scorecard_holes;

CREATE POLICY "scorecard_holes: player can delete own"
  ON public.scorecard_holes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.scorecards AS sc
      WHERE sc.id = scorecard_id
        AND sc.player_id = (SELECT public.current_player_id())
        AND sc.status IN (
          'draft'::public.scorecard_status,
          'in_progress'::public.scorecard_status,
          'submitted'::public.scorecard_status
        )
    )
  );

DO $policy$
DECLARE
    v_policy RECORD;
BEGIN
    FOR v_policy IN
        SELECT pol.tablename, pol.policyname
        FROM pg_catalog.pg_policies AS pol
        WHERE pol.schemaname = 'public'
          AND pol.tablename IN ('scorecards', 'scorecard_holes')
          AND (
            regexp_replace(COALESCE(pol.qual, ''), '[[:space:]()]', '', 'g') = 'true'
            OR regexp_replace(COALESCE(pol.with_check, ''), '[[:space:]()]', '', 'g') = 'true'
          )
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public.%I',
            v_policy.policyname,
            v_policy.tablename
        );
    END LOOP;
END;
$policy$;

GRANT SELECT ON public.scorecards TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scorecards TO authenticated;

GRANT SELECT ON public.scorecard_holes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scorecard_holes TO authenticated;

DO $trigger$
BEGIN
    IF to_regclass('public.scorecards') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_trigger
            WHERE tgrelid = to_regclass('public.scorecards')
              AND tgname = 'trg_scorecards_guard_write'
              AND NOT tgisinternal
       ) THEN
        EXECUTE 'CREATE TRIGGER trg_scorecards_guard_write BEFORE INSERT OR UPDATE ON public.scorecards FOR EACH ROW EXECUTE FUNCTION public.guard_scorecard_write()';
    END IF;
END;
$trigger$;

DO $trigger$
BEGIN
    IF to_regclass('public.scorecard_holes') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_trigger
            WHERE tgrelid = to_regclass('public.scorecard_holes')
              AND tgname = 'trg_scorecard_holes_guard_write'
              AND NOT tgisinternal
       ) THEN
        EXECUTE 'CREATE TRIGGER trg_scorecard_holes_guard_write BEFORE INSERT OR UPDATE ON public.scorecard_holes FOR EACH ROW EXECUTE FUNCTION public.guard_scorecard_holes()';
    END IF;
END;
$trigger$;

DO $trigger$
BEGIN
    IF to_regclass('public.scorecard_holes') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_trigger
            WHERE tgrelid = to_regclass('public.scorecard_holes')
              AND tgname = 'trg_scorecard_holes_sync_totals'
              AND NOT tgisinternal
       ) THEN
        EXECUTE 'CREATE TRIGGER trg_scorecard_holes_sync_totals AFTER INSERT OR UPDATE OR DELETE ON public.scorecard_holes FOR EACH ROW EXECUTE FUNCTION public.sync_scorecard_holes()';
    END IF;
END;
$trigger$;

NOTIFY pgrst, 'reload schema';

COMMIT;
