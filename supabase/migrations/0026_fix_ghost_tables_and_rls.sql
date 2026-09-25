BEGIN;

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('match_update', 'leaderboard_shift', 'achievement', 'system', 'skin_won'));

ALTER POLICY "tournaments: public can read open tournaments"
ON public.tournaments
TO PUBLIC
USING (status IN ('open', 'live', 'completed', 'cancelled'));

ALTER POLICY "rounds: public can read open tournament rounds"
ON public.rounds
TO PUBLIC
USING (
    EXISTS (
        SELECT 1
        FROM public.tournaments AS t
        WHERE t.id = tournament_id
          AND t.status IN ('open', 'live', 'completed', 'cancelled')
    )
);

ALTER POLICY "scorecards: public can read open tournament scorecards"
ON public.scorecards
TO PUBLIC
USING (
    status IN ('submitted', 'verified', 'amended')
    AND EXISTS (
        SELECT 1
        FROM public.rounds AS r
        JOIN public.tournaments AS t ON t.id = r.tournament_id
        WHERE r.id = round_id
          AND t.status IN ('open', 'live', 'completed', 'cancelled')
    )
);

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
          AND sc.status IN ('submitted', 'verified', 'amended')
          AND t.status IN ('open', 'live', 'completed', 'cancelled')
    )
);

ALTER POLICY "Player register self"
ON public.tournament_registrations
TO authenticated
WITH CHECK (
    player_id IN (
        SELECT p.id
        FROM public.players AS p
        WHERE p.profile_id = (SELECT auth.uid())
    )
    AND EXISTS (
        SELECT 1
        FROM public.tournaments AS t
        WHERE t.id = tournament_id
          AND t.status = 'open'
    )
);

ALTER POLICY "Player unregister self"
ON public.tournament_registrations
TO authenticated
USING (
    player_id IN (
        SELECT p.id
        FROM public.players AS p
        WHERE p.profile_id = (SELECT auth.uid())
    )
    AND EXISTS (
        SELECT 1
        FROM public.tournaments AS t
        WHERE t.id = tournament_id
          AND t.status = 'open'
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_score_differentials_round_player
ON public.score_differentials (round_id, player_id);

ALTER TABLE public.score_differentials
DROP CONSTRAINT IF EXISTS unique_round_differential;

CREATE OR REPLACE FUNCTION public.calculate_and_store_differential()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_profile_id UUID;
    v_course_id UUID;
    v_course_rating NUMERIC;
    v_slope_rating NUMERIC;
    v_expected_holes INTEGER;
    v_holes_completed INTEGER;
    v_gross_score INTEGER;
    v_differential NUMERIC(5, 2);
BEGIN
    IF NEW.status IS DISTINCT FROM 'verified'::public.scorecard_status
       OR OLD.status IS NOT DISTINCT FROM 'verified'::public.scorecard_status THEN
        RETURN NEW;
    END IF;

    SELECT p.profile_id
    INTO v_profile_id
    FROM public.players AS p
    WHERE p.id = NEW.player_id
      AND p.profile_id IS NOT NULL;

    IF v_profile_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(NEW.course_id, t.course_id)
    INTO v_course_id
    FROM public.rounds AS r
    JOIN public.tournaments AS t ON t.id = r.tournament_id
    WHERE r.id = NEW.round_id;

    IF v_course_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT c.course_rating, c.slope_rating, c.holes_count
    INTO v_course_rating, v_slope_rating, v_expected_holes
    FROM public.courses AS c
    WHERE c.id = v_course_id;

    IF v_course_rating IS NULL
       OR v_course_rating <= 0
       OR v_slope_rating IS NULL
       OR v_slope_rating <= 0
       OR v_expected_holes IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT
        COUNT(*)::INTEGER,
        COALESCE(SUM(sh.strokes), 0)::INTEGER
    INTO v_holes_completed, v_gross_score
    FROM public.scorecard_holes AS sh
    WHERE sh.scorecard_id = NEW.id;

    IF v_holes_completed = 0 OR v_holes_completed <> v_expected_holes THEN
        RETURN NEW;
    END IF;

    v_differential :=
        (113.0 / v_slope_rating) * (v_gross_score::NUMERIC - v_course_rating);

    INSERT INTO public.score_differentials (
        player_id,
        round_id,
        course_id,
        gross_score,
        differential
    )
    VALUES (
        v_profile_id,
        NEW.round_id,
        v_course_id,
        v_gross_score,
        v_differential
    )
    ON CONFLICT (round_id, player_id)
    DO UPDATE SET
        course_id = EXCLUDED.course_id,
        gross_score = EXCLUDED.gross_score,
        differential = EXCLUDED.differential,
        calculated_at = pg_catalog.now();

    RETURN NEW;
END;
$function$;

DO $trigger$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_trigger
        WHERE tgrelid = 'public.scorecards'::pg_catalog.regclass
          AND tgname = 'trg_calculate_differential'
          AND NOT tgisinternal
    ) THEN
        EXECUTE 'CREATE TRIGGER trg_calculate_differential AFTER UPDATE ON public.scorecards FOR EACH ROW EXECUTE FUNCTION public.calculate_and_store_differential()';
    END IF;
END;
$trigger$;

DO $policy$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'score_differentials'
          AND policyname = 'Players can view their own differentials'
    ) THEN
        EXECUTE $ddl$
            CREATE POLICY "Players can view their own differentials"
            ON public.score_differentials
            FOR SELECT
            TO authenticated
            USING (player_id = (SELECT auth.uid()))
        $ddl$;
    END IF;

    EXECUTE $ddl$
        ALTER POLICY "Players can view their own differentials"
        ON public.score_differentials
        TO authenticated
        USING (player_id = (SELECT auth.uid()))
    $ddl$;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'score_differentials'
          AND policyname = 'Admins can manage differentials'
    ) THEN
        EXECUTE $ddl$
            CREATE POLICY "Admins can manage differentials"
            ON public.score_differentials
            FOR ALL
            TO authenticated
            USING ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'))
            WITH CHECK ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'))
        $ddl$;
    END IF;

    EXECUTE $ddl$
        ALTER POLICY "Admins can manage differentials"
        ON public.score_differentials
        TO authenticated
        USING ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'))
        WITH CHECK ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'))
    $ddl$;

    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'score_differentials'
          AND policyname = 'Admins can manage all differentials'
    ) THEN
        EXECUTE $ddl$
            ALTER POLICY "Admins can manage all differentials"
            ON public.score_differentials
            TO authenticated
            USING ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'))
            WITH CHECK ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'))
        $ddl$;
    END IF;
END;
$policy$;

CREATE OR REPLACE VIEW public.player_statistics AS
SELECT
    pl.id AS player_id,
    pl.full_name,
    pl.handicap_index,
    COUNT(sc.id) AS total_rounds,
    COALESCE(SUM(sc.total_strokes), 0) AS total_strokes,
    COALESCE(SUM(sc.total_score_to_par), 0) AS total_to_par,
    CASE
        WHEN COUNT(sc.id) > 0 THEN ROUND(AVG(sc.total_strokes), 1)
        ELSE NULL
    END AS avg_score,
    MIN(sc.total_strokes) AS best_round,
    (
        SELECT AVG(sd.differential)
        FROM public.score_differentials AS sd
        WHERE sd.player_id = pl.profile_id
    ) AS avg_differential
FROM public.players AS pl
LEFT JOIN public.scorecards AS sc
    ON sc.player_id = pl.id
   AND sc.status = 'verified'
GROUP BY pl.id, pl.full_name, pl.handicap_index;

CREATE OR REPLACE VIEW public.live_tournament_leaderboard
WITH (security_invoker = true)
AS
SELECT
    t.id AS tournament_id,
    p.id AS player_id,
    p.full_name,
    COALESCE(p.handicap_index, 0) AS player_handicap,
    COALESCE(SUM(sh.strokes), 0) AS total_gross,
    COALESCE(SUM(sh.strokes), 0)
        - COALESCE(p.handicap_index, 0)
          * COUNT(DISTINCT sc.id) FILTER (WHERE sh.id IS NOT NULL) AS total_net,
    COUNT(sh.id) AS holes_completed
FROM public.tournaments AS t
JOIN public.tournament_registrations AS tr
    ON tr.tournament_id = t.id
JOIN public.players AS p
    ON p.id = tr.player_id
LEFT JOIN public.rounds AS rd
    ON rd.tournament_id = t.id
LEFT JOIN public.scorecards AS sc
    ON sc.round_id = rd.id
   AND sc.player_id = p.id
   AND sc.status IN ('submitted', 'verified', 'amended')
LEFT JOIN public.scorecard_holes AS sh
    ON sh.scorecard_id = sc.id
WHERE t.status IN ('open', 'live', 'completed')
GROUP BY t.id, p.id, p.full_name, p.handicap_index;

GRANT SELECT ON public.live_tournament_leaderboard TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.notify_rank_change(player_id UUID, tournament_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_profile_id UUID;
BEGIN
    SELECT p.profile_id
    INTO v_profile_id
    FROM public.players AS p
    WHERE p.id = $1
      AND p.profile_id IS NOT NULL;

    IF v_profile_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO public.notifications (
        recipient_id,
        title,
        message,
        type
    )
    VALUES (
        v_profile_id,
        'Rank Update!',
        'Your position in the tournament leaderboard has shifted. Check your standing!',
        'leaderboard_shift'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_score_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_profile_id UUID;
BEGIN
    IF NEW.status = 'verified'::public.scorecard_status
       AND OLD.status IS DISTINCT FROM 'verified'::public.scorecard_status THEN
        SELECT p.profile_id
        INTO v_profile_id
        FROM public.players AS p
        WHERE p.id = NEW.player_id
          AND p.profile_id IS NOT NULL;

        IF v_profile_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                recipient_id,
                title,
                message,
                type
            )
            VALUES (
                v_profile_id,
                'Score Verified',
                'Your scorecard for the round has been officially verified!',
                'match_update'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

DO $trigger$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_trigger
        WHERE tgrelid = 'public.scorecards'::pg_catalog.regclass
          AND tgname = 'on_scorecard_status_change'
          AND NOT tgisinternal
    ) THEN
        EXECUTE 'CREATE TRIGGER on_scorecard_status_change AFTER UPDATE ON public.scorecards FOR EACH ROW EXECUTE FUNCTION public.handle_score_verification()';
    END IF;
END;
$trigger$;

DROP POLICY IF EXISTS "Admins can manage all notifications"
ON public.notifications;

DO $policy$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'notifications'
          AND policyname = 'Users can view their own notifications'
    ) THEN
        EXECUTE $ddl$
            CREATE POLICY "Users can view their own notifications"
            ON public.notifications
            FOR SELECT
            TO authenticated
            USING (recipient_id = (SELECT auth.uid()))
        $ddl$;
    END IF;

    EXECUTE $ddl$
        ALTER POLICY "Users can view their own notifications"
        ON public.notifications
        TO authenticated
        USING (recipient_id = (SELECT auth.uid()))
    $ddl$;

    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'notifications'
          AND policyname = 'notifications: users can read own'
    ) THEN
        EXECUTE $ddl$
            ALTER POLICY "notifications: users can read own"
            ON public.notifications
            TO authenticated
            USING (recipient_id = (SELECT auth.uid()))
        $ddl$;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'notifications'
          AND policyname = 'notifications: user can update own read status'
    ) THEN
        EXECUTE $ddl$
            CREATE POLICY "notifications: user can update own read status"
            ON public.notifications
            FOR UPDATE
            TO authenticated
            USING (recipient_id = (SELECT auth.uid()))
            WITH CHECK (recipient_id = (SELECT auth.uid()))
        $ddl$;
    END IF;

    EXECUTE $ddl$
        ALTER POLICY "notifications: user can update own read status"
        ON public.notifications
        TO authenticated
        USING (recipient_id = (SELECT auth.uid()))
        WITH CHECK (recipient_id = (SELECT auth.uid()))
    $ddl$;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'notifications'
          AND policyname = 'notifications: managers can insert'
    ) THEN
        EXECUTE $ddl$
            CREATE POLICY "notifications: managers can insert"
            ON public.notifications
            FOR INSERT
            TO authenticated
            WITH CHECK ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'))
        $ddl$;
    END IF;

    EXECUTE $ddl$
        ALTER POLICY "notifications: managers can insert"
        ON public.notifications
        TO authenticated
        WITH CHECK ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'))
    $ddl$;

    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'notifications'
          AND policyname = 'notifications: system can insert'
    ) THEN
        EXECUTE $ddl$
            ALTER POLICY "notifications: system can insert"
            ON public.notifications
            TO authenticated
            WITH CHECK ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'))
        $ddl$;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'notifications'
          AND policyname = 'notifications: admin can insert'
    ) THEN
        EXECUTE $ddl$
            ALTER POLICY "notifications: admin can insert"
            ON public.notifications
            TO authenticated
            WITH CHECK ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'))
        $ddl$;
    END IF;
END;
$policy$;

NOTIFY pgrst, 'reload schema';

COMMIT;
