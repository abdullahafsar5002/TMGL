ALTER TYPE public.friendly_match_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.friendly_match_status ADD VALUE IF NOT EXISTS 'rejected';

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

BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS auth_user_id uuid;
ALTER TABLE public.galleries ADD COLUMN IF NOT EXISTS created_by uuid;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email <> u.email);

INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), nullif(u.raw_user_meta_data->>'name', ''), 'TMGL Player'),
  'player'::public.user_role
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

UPDATE public.players p
SET auth_user_id = p.profile_id
WHERE p.auth_user_id IS NULL
  AND p.profile_id IS NOT NULL;

UPDATE public.players p
SET profile_id = p.auth_user_id
WHERE p.profile_id IS NULL
  AND p.auth_user_id IS NOT NULL;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY auth_user_id ORDER BY created_at, id) AS row_number
  FROM public.players
  WHERE auth_user_id IS NOT NULL
)
UPDATE public.players p
SET auth_user_id = NULL
WHERE p.id IN (SELECT id FROM ranked WHERE row_number > 1);

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY lower(email) ORDER BY created_at, id) AS row_number
  FROM public.profiles
  WHERE email IS NOT NULL
)
UPDATE public.profiles p
SET email = NULL
WHERE p.id IN (SELECT id FROM ranked WHERE row_number > 1);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS players_auth_user_id_unique_idx
  ON public.players (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_auth_user_id_fkey;
ALTER TABLE public.players
  ADD CONSTRAINT players_auth_user_id_fkey
  FOREIGN KEY (auth_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.profile_role(p_profile_id uuid)
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = p_profile_id;
$$;

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(auth.role() = 'service_role', false);
$$;

CREATE OR REPLACE FUNCTION public.is_event_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(public.get_user_role() IN ('super_admin', 'league_manager'), false);
$$;

CREATE OR REPLACE FUNCTION public.auth_email_for_profile(p_profile_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = p_profile_id;
$$;

CREATE OR REPLACE FUNCTION public.current_player_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.players p
  WHERE p.auth_user_id = auth.uid() OR p.profile_id = auth.uid()
  ORDER BY CASE WHEN p.auth_user_id = auth.uid() THEN 0 ELSE 1 END, p.created_at, p.id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.player_belongs_to_user(p_player_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.id = p_player_id
      AND (p.auth_user_id = auth.uid() OR p.profile_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.map_player_to_profile(p_player_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE id = p_player_id) THEN p_player_id
    ELSE coalesce(
      (SELECT p.auth_user_id FROM public.players p WHERE p.id = p_player_id AND p.auth_user_id IS NOT NULL),
      (SELECT p.profile_id FROM public.players p WHERE p.id = p_player_id AND p.profile_id IS NOT NULL)
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_read_tournament(p_tournament_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tournaments t
    WHERE t.id = p_tournament_id
      AND (t.status IN ('open', 'live', 'completed', 'cancelled') OR public.is_event_manager())
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_player_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mapped uuid;
BEGIN
  IF NEW.player_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.players WHERE id = NEW.player_id) THEN
    SELECT p.id
    INTO v_mapped
    FROM public.players p
    WHERE p.auth_user_id = NEW.player_id OR p.profile_id = NEW.player_id
    ORDER BY CASE WHEN p.auth_user_id = NEW.player_id THEN 0 ELSE 1 END, p.created_at, p.id
    LIMIT 1;
    IF FOUND THEN
      NEW.player_id := v_mapped;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_register_tournament(p_tournament_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tournaments t
    WHERE t.id = p_tournament_id
      AND t.status = 'open'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_scorecard(p_scorecard_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.scorecards sc
    JOIN public.rounds r ON r.id = sc.round_id
    WHERE sc.id = p_scorecard_id
      AND (
        public.is_event_manager()
        OR public.player_belongs_to_user(sc.player_id)
        OR public.can_read_tournament(r.tournament_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_scorecard(p_scorecard_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.scorecards sc
    WHERE sc.id = p_scorecard_id
      AND (
        public.is_event_manager()
        OR (
          sc.status IN ('draft', 'in_progress', 'submitted', 'rejected', 'amended')
          AND public.player_belongs_to_user(sc.player_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_match_participant(p_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = p_match_id
      AND (
        public.player_belongs_to_user(m.player_a_id)
        OR public.player_belongs_to_user(m.player_b_id)
        OR EXISTS (
          SELECT 1
          FROM public.team_members tm
          WHERE tm.team_id IN (m.team_a_id, m.team_b_id)
            AND public.player_belongs_to_user(tm.player_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_match(p_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_event_manager() OR public.is_match_participant(p_match_id);
$$;

CREATE OR REPLACE FUNCTION public.match_contains_profile(p_match_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    JOIN public.players p ON p.id IN (m.player_a_id, m.player_b_id)
    WHERE m.id = p_match_id
      AND (p.auth_user_id = p_profile_id OR p.profile_id = p_profile_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.match_contains_player(p_match_id uuid, p_player_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = p_match_id
      AND p_player_id IN (m.player_a_id, m.player_b_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_shot(p_practice_score_id uuid, p_scorecard_hole_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_practice_score_id IS NOT NULL AND p_scorecard_hole_id IS NULL THEN EXISTS (
      SELECT 1
      FROM public.practice_scores ps
      JOIN public.practice_rounds pr ON pr.id = ps.practice_round_id
      WHERE ps.id = p_practice_score_id
        AND (public.is_event_manager() OR public.player_belongs_to_user(pr.player_id))
    )
    WHEN p_practice_score_id IS NULL AND p_scorecard_hole_id IS NOT NULL THEN EXISTS (
      SELECT 1
      FROM public.scorecard_holes sh
      WHERE sh.id = p_scorecard_hole_id
        AND public.can_edit_scorecard(sh.scorecard_id)
    )
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_read_gallery(p_gallery_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.galleries g
    WHERE g.id = p_gallery_id
      AND (
        public.is_event_manager()
        OR g.created_by = auth.uid()
        OR (g.tournament_id IS NOT NULL AND public.can_read_tournament(g.tournament_id))
        OR (g.tournament_id IS NULL AND g.created_by IS NOT NULL)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_auth_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_player_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.players
  SET profile_id = NEW.id,
      auth_user_id = NEW.id,
      full_name = coalesce(nullif(full_name, ''), nullif(NEW.full_name, ''), 'TMGL Player')
  WHERE profile_id = NEW.id OR auth_user_id = NEW.id;

  IF NOT FOUND THEN
    INSERT INTO public.players (profile_id, auth_user_id, full_name, status, join_date)
    VALUES (NEW.id, NEW.id, coalesce(nullif(NEW.full_name, ''), 'TMGL Player'), 'active', current_date)
    ON CONFLICT (profile_id) DO UPDATE
    SET auth_user_id = EXCLUDED.auth_user_id,
        full_name = coalesce(nullif(public.players.full_name, ''), EXCLUDED.full_name);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_player_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_id IS NOT NULL AND (NEW.auth_user_id IS NULL OR NEW.auth_user_id IS DISTINCT FROM NEW.profile_id) THEN
    NEW.auth_user_id := NEW.profile_id;
  ELSIF NEW.auth_user_id IS NOT NULL AND NEW.profile_id IS NULL THEN
    NEW.profile_id := NEW.auth_user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_identity_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id <> OLD.id THEN
    NEW.id := OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT (public.is_service_role() OR public.is_event_manager()) THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(nullif(NEW.raw_user_meta_data->>'full_name', ''), nullif(NEW.raw_user_meta_data->>'name', ''), 'TMGL Player'),
    'player'::public.user_role
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = coalesce(nullif(public.profiles.full_name, ''), EXCLUDED.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_auth_profile();

DROP TRIGGER IF EXISTS ensure_player_for_profile ON public.profiles;
CREATE TRIGGER ensure_player_for_profile
AFTER INSERT OR UPDATE OF full_name ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.ensure_player_for_profile();

DROP TRIGGER IF EXISTS prevent_profile_identity_change ON public.profiles;
CREATE TRIGGER prevent_profile_identity_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_identity_change();

DROP TRIGGER IF EXISTS guard_profile_privileges ON public.profiles;
CREATE TRIGGER guard_profile_privileges
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();

DROP TRIGGER IF EXISTS sync_player_identity ON public.players;
CREATE TRIGGER sync_player_identity
BEFORE INSERT OR UPDATE OF profile_id, auth_user_id ON public.players
FOR EACH ROW EXECUTE FUNCTION public.sync_player_identity();

DROP TRIGGER IF EXISTS normalize_player_reference ON public.scorecards;
CREATE TRIGGER normalize_player_reference
BEFORE INSERT OR UPDATE OF player_id ON public.scorecards
FOR EACH ROW EXECUTE FUNCTION public.normalize_player_reference();

DROP TRIGGER IF EXISTS normalize_player_reference ON public.practice_rounds;
CREATE TRIGGER normalize_player_reference
BEFORE INSERT OR UPDATE OF player_id ON public.practice_rounds
FOR EACH ROW EXECUTE FUNCTION public.normalize_player_reference();

DROP TRIGGER IF EXISTS normalize_player_reference ON public.tournament_registrations;
CREATE TRIGGER normalize_player_reference
BEFORE INSERT OR UPDATE OF player_id ON public.tournament_registrations
FOR EACH ROW EXECUTE FUNCTION public.normalize_player_reference();

DROP TRIGGER IF EXISTS normalize_player_reference ON public.friendly_match_players;
CREATE TRIGGER normalize_player_reference
BEFORE INSERT OR UPDATE OF player_id ON public.friendly_match_players
FOR EACH ROW EXECUTE FUNCTION public.normalize_player_reference();

DROP TRIGGER IF EXISTS normalize_player_reference ON public.course_notes;
CREATE TRIGGER normalize_player_reference
BEFORE INSERT OR UPDATE OF player_id ON public.course_notes
FOR EACH ROW EXECUTE FUNCTION public.normalize_player_reference();

DROP TRIGGER IF EXISTS normalize_player_reference ON public.player_equipment;
CREATE TRIGGER normalize_player_reference
BEFORE INSERT OR UPDATE OF player_id ON public.player_equipment
FOR EACH ROW EXECUTE FUNCTION public.normalize_player_reference();

INSERT INTO public.players (profile_id, auth_user_id, full_name, status, join_date)
SELECT p.id, p.id, coalesce(nullif(p.full_name, ''), 'TMGL Player'), 'active', current_date
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.players pl WHERE pl.profile_id = p.id OR pl.auth_user_id = p.id)
ON CONFLICT (profile_id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'player_statistics'
      AND c.relkind IN ('v', 'm')
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'player_statistics'
        AND c.relkind = 'm'
    ) THEN
      EXECUTE 'DROP MATERIALIZED VIEW public.player_statistics';
    ELSE
      EXECUTE 'DROP VIEW public.player_statistics';
    END IF;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.player_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL UNIQUE REFERENCES public.players(id) ON DELETE CASCADE,
  rounds_played integer NOT NULL DEFAULT 0 CHECK (rounds_played >= 0),
  average_score numeric(6, 2),
  best_score integer,
  average_to_par numeric(6, 2),
  birdies integer NOT NULL DEFAULT 0 CHECK (birdies >= 0),
  eagles integer NOT NULL DEFAULT 0 CHECK (eagles >= 0),
  pars integer NOT NULL DEFAULT 0 CHECK (pars >= 0),
  bogeys integer NOT NULL DEFAULT 0 CHECK (bogeys >= 0),
  double_bogeys integer NOT NULL DEFAULT 0 CHECK (double_bogeys >= 0),
  average_putts numeric(4, 2),
  fairways_hit_percentage numeric(5, 2),
  greens_in_regulation_percentage numeric(5, 2),
  last_round_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_statistics ADD COLUMN IF NOT EXISTS eagles integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_statistics ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.player_statistics ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
GRANT SELECT ON public.player_statistics TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_player_statistics(p_player_id uuid DEFAULT NULL)
RETURNS public.player_statistics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target uuid;
  v_result public.player_statistics;
BEGIN
  v_target := coalesce(p_player_id, public.current_player_id());
  IF v_target IS NULL THEN
    RAISE EXCEPTION 'player profile is not provisioned';
  END IF;
  IF NOT (public.is_service_role() OR public.is_event_manager() OR public.player_belongs_to_user(v_target)) THEN
    RAISE EXCEPTION 'not authorized to refresh this player';
  END IF;

  WITH completed AS (
    SELECT pr.id, pr.gross_score, pr.total_to_par, pr.completed_at
    FROM public.practice_rounds pr
    WHERE pr.player_id = v_target
      AND pr.status = 'completed'
  ), scores AS (
    SELECT ps.score, ps.par, ps.putts, ps.fairway_hit, ps.green_in_regulation
    FROM public.practice_scores ps
    JOIN completed c ON c.id = ps.practice_round_id
  ), totals AS (
    SELECT
      (SELECT count(*)::integer FROM completed) AS rounds_played,
      (SELECT round(avg(c.gross_score), 2) FROM completed c) AS average_score,
      (SELECT min(c.gross_score) FROM completed c) AS best_score,
      (SELECT round(avg(c.total_to_par), 2) FROM completed c) AS average_to_par,
      (SELECT count(*) FILTER (WHERE score - par = -2)::integer FROM scores) AS eagles,
      (SELECT count(*) FILTER (WHERE score - par = -1)::integer FROM scores) AS birdies,
      (SELECT count(*) FILTER (WHERE score - par = 0)::integer FROM scores) AS pars,
      (SELECT count(*) FILTER (WHERE score - par = 1)::integer FROM scores) AS bogeys,
      (SELECT count(*) FILTER (WHERE score - par >= 2)::integer FROM scores) AS double_bogeys,
      (SELECT round(avg(putts), 2) FROM scores WHERE putts IS NOT NULL) AS average_putts,
      (SELECT round(100.0 * count(*) FILTER (WHERE fairway_hit IS TRUE) / NULLIF(count(*) FILTER (WHERE fairway_hit IS NOT NULL), 0), 2) FROM scores) AS fairways_hit_percentage,
      (SELECT round(100.0 * count(*) FILTER (WHERE green_in_regulation IS TRUE) / NULLIF(count(*) FILTER (WHERE green_in_regulation IS NOT NULL), 0), 2) FROM scores) AS greens_in_regulation_percentage,
      (SELECT max(c.completed_at) FROM completed c) AS last_round_at
  )
  INSERT INTO public.player_statistics (
    player_id,
    rounds_played,
    average_score,
    best_score,
    average_to_par,
    birdies,
    eagles,
    pars,
    bogeys,
    double_bogeys,
    average_putts,
    fairways_hit_percentage,
    greens_in_regulation_percentage,
    last_round_at
  )
  SELECT
    v_target,
    rounds_played,
    average_score,
    best_score,
    average_to_par,
    birdies,
    eagles,
    pars,
    bogeys,
    double_bogeys,
    average_putts,
    fairways_hit_percentage,
    greens_in_regulation_percentage,
    last_round_at
  FROM totals
  ON CONFLICT (player_id) DO UPDATE
  SET rounds_played = EXCLUDED.rounds_played,
      average_score = EXCLUDED.average_score,
      best_score = EXCLUDED.best_score,
      average_to_par = EXCLUDED.average_to_par,
      birdies = EXCLUDED.birdies,
      eagles = EXCLUDED.eagles,
      pars = EXCLUDED.pars,
      bogeys = EXCLUDED.bogeys,
      double_bogeys = EXCLUDED.double_bogeys,
      average_putts = EXCLUDED.average_putts,
      fairways_hit_percentage = EXCLUDED.fairways_hit_percentage,
      greens_in_regulation_percentage = EXCLUDED.greens_in_regulation_percentage,
      last_round_at = EXCLUDED.last_round_at,
      updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_player_statistics(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_player_statistics(uuid) TO authenticated, service_role;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_entity text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE public.notifications SET metadata = '{}'::jsonb WHERE metadata IS NULL;
UPDATE public.notifications SET is_read = false WHERE is_read IS NULL;
ALTER TABLE public.notifications ALTER COLUMN is_read SET DEFAULT false;
ALTER TABLE public.notifications ALTER COLUMN is_read SET NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN metadata SET NOT NULL;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', r.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_allowed;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_allowed
  CHECK (type IN ('match_update', 'leaderboard_shift', 'achievement', 'system', 'skin_won', 'score_verified', 'tournament', 'registration', 'payment', 'membership'));

CREATE OR REPLACE FUNCTION public.normalize_notification_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.recipient_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.recipient_id) THEN
    NEW.recipient_id := public.map_player_to_profile(NEW.recipient_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_rank_change(player_id uuid, tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient uuid;
BEGIN
  v_recipient := public.map_player_to_profile(player_id);
  IF v_recipient IS NOT NULL THEN
    INSERT INTO public.notifications (recipient_id, title, message, type, metadata)
    VALUES (
      v_recipient,
      'Rank Update!',
      'Your tournament position has changed.',
      'leaderboard_shift',
      jsonb_build_object('tournament_id', tournament_id)
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_score_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient uuid;
BEGIN
  IF NEW.status = 'verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    v_recipient := public.map_player_to_profile(NEW.player_id);
    IF v_recipient IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_id, title, message, type, related_entity, related_id, metadata)
      VALUES (
        v_recipient,
        'Score Verified',
        'Your scorecard has been verified.',
        'score_verified',
        'scorecard',
        NEW.id,
        jsonb_build_object('scorecard_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_notification_recipient ON public.notifications;
CREATE TRIGGER normalize_notification_recipient
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.normalize_notification_recipient();

DROP TRIGGER IF EXISTS on_scorecard_status_change ON public.scorecards;
CREATE TRIGGER on_scorecard_status_change
AFTER UPDATE OF status ON public.scorecards
FOR EACH ROW EXECUTE FUNCTION public.handle_score_verification();

ALTER TABLE public.score_differentials ADD COLUMN IF NOT EXISTS scorecard_id uuid;
ALTER TABLE public.score_differentials DROP CONSTRAINT IF EXISTS unique_round_differential;
ALTER TABLE public.score_differentials DROP CONSTRAINT IF EXISTS score_differentials_player_id_fkey;
ALTER TABLE public.score_differentials DROP CONSTRAINT IF EXISTS score_differentials_scorecard_id_fkey;

UPDATE public.score_differentials sd
SET player_id = p.id
FROM public.players p
WHERE sd.player_id = p.id;

UPDATE public.score_differentials sd
SET player_id = p.id
FROM public.players p
WHERE sd.player_id = p.auth_user_id
  AND sd.player_id <> p.id;

UPDATE public.score_differentials sd
SET player_id = p.id
FROM public.players p
WHERE sd.player_id = p.profile_id
  AND sd.player_id <> p.id;

CREATE UNIQUE INDEX IF NOT EXISTS score_differentials_round_player_unique
  ON public.score_differentials (round_id, player_id);

ALTER TABLE public.score_differentials
  ADD CONSTRAINT score_differentials_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.score_differentials
  ADD CONSTRAINT score_differentials_scorecard_id_fkey
  FOREIGN KEY (scorecard_id) REFERENCES public.scorecards(id) ON DELETE CASCADE NOT VALID;

CREATE OR REPLACE FUNCTION public.calculate_and_store_differential()
RETURNS trigger
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
      INSERT INTO public.score_differentials (player_id, scorecard_id, round_id, course_id, gross_score, differential)
      VALUES (NEW.player_id, NEW.id, NEW.round_id, v_course_id, v_gross_score, v_differential)
      ON CONFLICT (round_id, player_id) DO UPDATE
      SET scorecard_id = EXCLUDED.scorecard_id,
          course_id = EXCLUDED.course_id,
          gross_score = EXCLUDED.gross_score,
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

ALTER TABLE public.galleries ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.galleries DROP CONSTRAINT IF EXISTS galleries_created_by_fkey;
ALTER TABLE public.galleries
  ADD CONSTRAINT galleries_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.galleries ALTER COLUMN tournament_id DROP NOT NULL;

ALTER TABLE public.gallery_images ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.gallery_images ALTER COLUMN image_url DROP NOT NULL;
UPDATE public.gallery_images SET image_url = url WHERE image_url IS NULL AND url IS NOT NULL;
UPDATE public.gallery_images SET url = image_url WHERE url IS NULL AND image_url IS NOT NULL;
ALTER TABLE public.gallery_images DROP CONSTRAINT IF EXISTS gallery_images_image_url_present;
ALTER TABLE public.gallery_images
  ADD CONSTRAINT gallery_images_image_url_present CHECK (image_url IS NOT NULL OR url IS NOT NULL);

CREATE OR REPLACE FUNCTION public.sync_gallery_image_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.image_url IS NULL AND NEW.url IS NOT NULL THEN
    NEW.image_url := NEW.url;
  ELSIF NEW.url IS NULL AND NEW.image_url IS NOT NULL THEN
    NEW.url := NEW.image_url;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_gallery_image_url ON public.gallery_images;
CREATE TRIGGER sync_gallery_image_url
BEFORE INSERT OR UPDATE OF image_url, url ON public.gallery_images
FOR EACH ROW EXECUTE FUNCTION public.sync_gallery_image_url();

ALTER TABLE public.course_notes DROP CONSTRAINT IF EXISTS course_notes_player_id_fkey;
UPDATE public.course_notes cn
SET player_id = p.id
FROM public.players p
WHERE cn.player_id = p.id;
UPDATE public.course_notes cn
SET player_id = p.id
FROM public.players p
WHERE cn.player_id = p.profile_id
  AND cn.player_id <> p.id;
UPDATE public.course_notes cn
SET player_id = p.id
FROM public.players p
WHERE cn.player_id = p.auth_user_id
  AND cn.player_id <> p.id;
ALTER TABLE public.course_notes
  ADD CONSTRAINT course_notes_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.player_equipment DROP CONSTRAINT IF EXISTS player_equipment_player_id_fkey;
ALTER TABLE public.player_equipment ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.player_equipment pe
SET player_id = p.id
FROM public.players p
WHERE pe.player_id = p.id;
UPDATE public.player_equipment pe
SET player_id = p.id
FROM public.players p
WHERE pe.player_id = p.profile_id
  AND pe.player_id <> p.id;
UPDATE public.player_equipment pe
SET player_id = p.id
FROM public.players p
WHERE pe.player_id = p.auth_user_id
  AND pe.player_id <> p.id;
ALTER TABLE public.player_equipment
  ADD CONSTRAINT player_equipment_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.hole_skins DROP CONSTRAINT IF EXISTS hole_skins_winner_id_fkey;
UPDATE public.hole_skins hs
SET winner_id = p.id
FROM public.players p
WHERE hs.winner_id = p.id;
UPDATE public.hole_skins hs
SET winner_id = p.id
FROM public.players p
WHERE hs.winner_id = p.profile_id
  AND hs.winner_id <> p.id;
UPDATE public.hole_skins hs
SET winner_id = p.id
FROM public.players p
WHERE hs.winner_id = p.auth_user_id
  AND hs.winner_id <> p.id;
ALTER TABLE public.hole_skins
  ADD CONSTRAINT hole_skins_winner_id_fkey
  FOREIGN KEY (winner_id) REFERENCES public.players(id) ON DELETE SET NULL NOT VALID;

CREATE TABLE IF NOT EXISTS public.player_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fcm_token text NOT NULL UNIQUE CHECK (length(fcm_token) > 20),
  platform text NOT NULL DEFAULT 'android' CHECK (platform IN ('web', 'android', 'ios')),
  device_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS player_devices_profile_platform_unique
  ON public.player_devices (profile_id, platform);

CREATE TABLE IF NOT EXISTS public.fee_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('membership', 'event_fee')),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  duration_days integer NOT NULL DEFAULT 30 CHECK (duration_days > 0),
  currency text NOT NULL DEFAULT 'PKR' CHECK (currency = 'PKR'),
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_products ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 30;

CREATE TABLE IF NOT EXISTS public.fee_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  payer_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  product_key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('membership', 'event_fee')),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL,
  description text,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'PKR' CHECK (currency = 'PKR'),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'void', 'expired')),
  idempotency_key text NOT NULL,
  due_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  UNIQUE (payer_profile_id, idempotency_key),
  UNIQUE (id, payer_profile_id)
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  payer_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('jazzcash', 'easypaisa')),
  provider_reference text NOT NULL UNIQUE,
  idempotency_key text NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'PKR' CHECK (currency = 'PKR'),
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'pending', 'redirected', 'paid', 'failed', 'cancelled', 'expired')),
  provider_transaction_id text,
  provider_status text,
  checkout_url text,
  provider_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  finalized_at timestamptz,
  UNIQUE (payer_profile_id, idempotency_key),
  UNIQUE (id, payer_profile_id),
  FOREIGN KEY (invoice_id, payer_profile_id)
    REFERENCES public.fee_invoices(id, payer_profile_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('jazzcash', 'easypaisa')),
  event_id text NOT NULL,
  transaction_id uuid NOT NULL REFERENCES public.payment_transactions(id) ON DELETE RESTRICT,
  payload_digest text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processing_status text NOT NULL DEFAULT 'processed' CHECK (processing_status IN ('processed', 'rejected')),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider, event_id)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'membership_invoices'
      AND c.relkind IN ('v', 'm')
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'membership_invoices'
        AND c.relkind = 'm'
    ) THEN
      EXECUTE 'DROP MATERIALIZED VIEW public.membership_invoices';
    ELSE
      EXECUTE 'DROP VIEW public.membership_invoices';
    END IF;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'membership_invoices'
  ) THEN
    EXECUTE $view$
      CREATE VIEW public.membership_invoices
      WITH (security_invoker = true)
      AS
      SELECT
        i.id,
        i.invoice_number,
        i.payer_profile_id AS profile_id,
        round(i.amount_minor::numeric / 100, 2) AS amount,
        i.currency,
        CASE i.status
          WHEN 'open' THEN 'pending'
          ELSE i.status
        END AS status,
        i.created_at,
        i.updated_at,
        i.paid_at
      FROM public.fee_invoices i
      WHERE i.kind = 'membership'
    $view$;
  END IF;
END;
$$;

GRANT SELECT ON public.membership_invoices TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_one_open_per_invoice_provider
  ON public.payment_transactions (invoice_id, provider)
  WHERE status IN ('created', 'pending', 'redirected');
CREATE INDEX IF NOT EXISTS payment_transactions_invoice_idx ON public.payment_transactions (invoice_id);
CREATE INDEX IF NOT EXISTS payment_transactions_payer_idx ON public.payment_transactions (payer_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_webhook_events_transaction_idx ON public.payment_webhook_events (transaction_id);

CREATE OR REPLACE FUNCTION public.redact_payment_metadata(p_value jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_value IS NULL THEN '{}'::jsonb
    ELSE p_value - ARRAY[
      'password', 'Password', 'integritySalt', 'IntegritySalt', 'hashKey', 'HashKey',
      'merchantPassword', 'merchantHashedReq', 'merchantHashedResp', 'secureHash',
      'pp_SecureHash', 'accessToken', 'access_token', 'refreshToken', 'refresh_token',
      'secret', 'secretKey', 'apiKey', 'authorization'
    ]::text[]
  END;
$$;

CREATE OR REPLACE FUNCTION public.create_fee_invoice(
  p_product_key text,
  p_idempotency_key text,
  p_tournament_id uuid DEFAULT NULL,
  p_payer_profile_id uuid DEFAULT NULL
)
RETURNS public.fee_invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_service boolean := public.is_service_role();
  v_payer uuid;
  v_product public.fee_products%ROWTYPE;
  v_invoice public.fee_invoices%ROWTYPE;
BEGIN
  IF p_product_key IS NULL OR length(trim(p_product_key)) < 1 OR length(trim(p_product_key)) > 120 THEN
    RAISE EXCEPTION 'invalid product key';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 8 OR length(trim(p_idempotency_key)) > 200 THEN
    RAISE EXCEPTION 'invalid idempotency key';
  END IF;

  v_payer := coalesce(p_payer_profile_id, v_actor);
  IF v_payer IS NULL OR (NOT v_service AND v_actor IS DISTINCT FROM v_payer AND NOT public.is_event_manager()) THEN
    RAISE EXCEPTION 'not authorized to create invoice';
  END IF;

  SELECT * INTO v_product
  FROM public.fee_products
  WHERE product_key = trim(p_product_key) AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'fee product is unavailable';
  END IF;
  IF v_product.kind = 'event_fee' AND (p_tournament_id IS NULL OR v_product.tournament_id IS DISTINCT FROM p_tournament_id) THEN
    RAISE EXCEPTION 'tournament does not match fee product';
  END IF;
  IF v_product.kind = 'membership' AND p_tournament_id IS NOT NULL THEN
    RAISE EXCEPTION 'membership fee cannot have a tournament';
  END IF;

  SELECT * INTO v_invoice
  FROM public.fee_invoices
  WHERE payer_profile_id = v_payer AND idempotency_key = trim(p_idempotency_key)
  FOR UPDATE;

  IF FOUND THEN
    IF v_invoice.product_key <> v_product.product_key OR v_invoice.amount_minor <> v_product.amount_minor THEN
      RAISE EXCEPTION 'idempotency key was used for another fee';
    END IF;
    RETURN v_invoice;
  END IF;

  INSERT INTO public.fee_invoices (
    invoice_number,
    payer_profile_id,
    product_key,
    kind,
    tournament_id,
    description,
    amount_minor,
    currency,
    idempotency_key,
    metadata
  )
  VALUES (
    'INV-' || upper(replace(gen_random_uuid()::text, '-', '')),
    v_payer,
    v_product.product_key,
    v_product.kind,
    coalesce(p_tournament_id, v_product.tournament_id),
    v_product.description,
    v_product.amount_minor,
    'PKR',
    trim(p_idempotency_key),
    jsonb_build_object('product_key', v_product.product_key)
  )
  ON CONFLICT (payer_profile_id, idempotency_key) DO NOTHING;

  SELECT * INTO v_invoice
  FROM public.fee_invoices
  WHERE payer_profile_id = v_payer AND idempotency_key = trim(p_idempotency_key)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice could not be created';
  END IF;
  RETURN v_invoice;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_payment_transaction(
  p_invoice_id uuid,
  p_provider text,
  p_idempotency_key text,
  p_checkout_reference text DEFAULT NULL,
  p_requester_profile_id uuid DEFAULT NULL
)
RETURNS public.payment_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_requester uuid := coalesce(p_requester_profile_id, v_actor);
  v_invoice public.fee_invoices%ROWTYPE;
  v_transaction public.payment_transactions%ROWTYPE;
  v_reference text;
BEGIN
  IF p_invoice_id IS NULL OR p_provider IS NULL OR lower(trim(p_provider)) NOT IN ('jazzcash', 'easypaisa') THEN
    RAISE EXCEPTION 'invalid payment request';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 8 OR length(trim(p_idempotency_key)) > 200 THEN
    RAISE EXCEPTION 'invalid idempotency key';
  END IF;
  IF NOT public.is_service_role() AND v_actor IS DISTINCT FROM v_requester THEN
    RAISE EXCEPTION 'not authorized to create payment transaction';
  END IF;
  IF v_requester IS NULL THEN
    RAISE EXCEPTION 'requester is required';
  END IF;

  SELECT * INTO v_invoice
  FROM public.fee_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice not found';
  END IF;
  IF v_invoice.payer_profile_id <> v_requester THEN
    RAISE EXCEPTION 'invoice does not belong to requester';
  END IF;
  IF v_invoice.status <> 'open' OR (v_invoice.due_at IS NOT NULL AND v_invoice.due_at <= now()) THEN
    RAISE EXCEPTION 'invoice is not payable';
  END IF;

  SELECT * INTO v_transaction
  FROM public.payment_transactions
  WHERE payer_profile_id = v_requester AND idempotency_key = trim(p_idempotency_key)
  FOR UPDATE;

  IF FOUND THEN
    IF v_transaction.invoice_id <> p_invoice_id OR v_transaction.provider <> lower(trim(p_provider)) THEN
      RAISE EXCEPTION 'idempotency key was used for another payment';
    END IF;
    RETURN v_transaction;
  END IF;

  SELECT * INTO v_transaction
  FROM public.payment_transactions
  WHERE invoice_id = p_invoice_id AND provider = lower(trim(p_provider))
    AND status IN ('created', 'pending', 'redirected')
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN v_transaction;
  END IF;

  v_reference := coalesce(nullif(trim(p_checkout_reference), ''), 'TMGL-' || upper(replace(gen_random_uuid()::text, '-', '')));
  IF v_reference !~ '^[A-Za-z0-9._-]{8,100}$' THEN
    RAISE EXCEPTION 'invalid checkout reference';
  END IF;

  BEGIN
    INSERT INTO public.payment_transactions (
      invoice_id,
      payer_profile_id,
      provider,
      provider_reference,
      idempotency_key,
      amount_minor,
      currency
    )
    VALUES (
      v_invoice.id,
      v_invoice.payer_profile_id,
      lower(trim(p_provider)),
      v_reference,
      trim(p_idempotency_key),
      v_invoice.amount_minor,
      v_invoice.currency
    )
    RETURNING * INTO v_transaction;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT * INTO v_transaction
      FROM public.payment_transactions
      WHERE invoice_id = p_invoice_id
        AND provider = lower(trim(p_provider))
        AND status IN ('created', 'pending', 'redirected')
      ORDER BY created_at DESC
      LIMIT 1;
      IF NOT FOUND THEN
        RAISE;
      END IF;
  END;

  RETURN v_transaction;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_payment_checkout(
  p_transaction_id uuid,
  p_checkout_url text
)
RETURNS public.payment_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction public.payment_transactions%ROWTYPE;
BEGIN
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'service role required';
  END IF;
  IF p_checkout_url IS NULL OR p_checkout_url !~ '^https://[^/]+' THEN
    RAISE EXCEPTION 'invalid checkout URL';
  END IF;

  UPDATE public.payment_transactions
  SET checkout_url = trim(p_checkout_url),
      status = CASE WHEN status = 'created' THEN 'redirected' ELSE status END,
      updated_at = now()
  WHERE id = p_transaction_id
    AND status NOT IN ('paid', 'failed', 'cancelled', 'expired')
  RETURNING * INTO v_transaction;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment transaction is not redirectable';
  END IF;
  RETURN v_transaction;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_payment_transaction(
  p_transaction_id uuid,
  p_event_id text,
  p_provider_reference text,
  p_provider_transaction_id text,
  p_provider_status text,
  p_amount_minor bigint,
  p_currency text,
  p_raw_response jsonb DEFAULT '{}'::jsonb
)
RETURNS public.payment_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction public.payment_transactions%ROWTYPE;
  v_invoice public.fee_invoices%ROWTYPE;
  v_status text;
  v_success boolean;
  v_pending boolean;
  v_cancelled boolean;
  v_digest text;
  v_event_transaction uuid;
  v_event_digest text;
  v_payload jsonb;
  v_duration_days integer;
BEGIN
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'service role required';
  END IF;
  IF p_event_id IS NULL OR length(trim(p_event_id)) < 8 OR length(trim(p_event_id)) > 240 THEN
    RAISE EXCEPTION 'invalid webhook event id';
  END IF;

  v_status := lower(trim(coalesce(p_provider_status, '')));
  IF v_status = '' THEN
    RAISE EXCEPTION 'provider status is required';
  END IF;
  v_success := v_status IN ('000', '0000', '1', 'paid', 'completed', 'success', 'successful', 'captured', 'approved');
  v_pending := v_status IN ('0', 'pending', 'processing', 'in_progress');
  v_cancelled := v_status IN ('cancelled', 'canceled', 'expired');

  SELECT * INTO v_transaction
  FROM public.payment_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment transaction not found';
  END IF;
  IF p_provider_reference IS NULL OR v_transaction.provider_reference <> p_provider_reference THEN
    RAISE EXCEPTION 'provider reference mismatch';
  END IF;
  IF p_amount_minor IS NULL OR p_currency IS NULL OR v_transaction.amount_minor <> p_amount_minor OR v_transaction.currency <> upper(trim(p_currency)) THEN
    RAISE EXCEPTION 'payment amount or currency mismatch';
  END IF;

  v_payload := public.redact_payment_metadata(coalesce(p_raw_response, '{}'::jsonb));
  v_digest := encode(digest(v_payload::text, 'sha256'), 'hex');

  SELECT transaction_id, payload_digest
  INTO v_event_transaction, v_event_digest
  FROM public.payment_webhook_events
  WHERE provider = v_transaction.provider AND event_id = trim(p_event_id);

  IF FOUND THEN
    IF v_event_transaction <> v_transaction.id OR v_event_digest <> v_digest THEN
      RAISE EXCEPTION 'webhook event conflict';
    END IF;
    RAISE EXCEPTION 'duplicate webhook event';
  END IF;

  SELECT * INTO v_invoice
  FROM public.fee_invoices
  WHERE id = v_transaction.invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice not found';
  END IF;
  IF v_invoice.status = 'void' OR v_invoice.status = 'expired' THEN
    RAISE EXCEPTION 'invoice is not payable';
  END IF;
  IF v_invoice.status = 'paid' THEN
    RAISE EXCEPTION 'invoice already paid';
  END IF;
  IF v_transaction.status = 'paid' THEN
    RAISE EXCEPTION 'transaction already finalized';
  END IF;

  BEGIN
    INSERT INTO public.payment_webhook_events (
      provider,
      event_id,
      transaction_id,
      payload_digest,
      payload,
      processed_at
    )
    VALUES (
      v_transaction.provider,
      trim(p_event_id),
      v_transaction.id,
      v_digest,
      v_payload,
      now()
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'duplicate webhook event';
  END;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    v_invoice.payer_profile_id,
    'payment.webhook_processed',
    'payment_transaction',
    v_transaction.id,
    jsonb_build_object('provider', v_transaction.provider, 'status', v_status, 'event_id', trim(p_event_id))
  );

  IF v_success THEN
    UPDATE public.payment_transactions
    SET status = 'paid',
        provider_transaction_id = coalesce(nullif(trim(p_provider_transaction_id), ''), provider_transaction_id),
        provider_status = v_status,
        provider_response = v_payload,
        paid_at = coalesce(paid_at, now()),
        finalized_at = now(),
        updated_at = now()
    WHERE id = v_transaction.id
    RETURNING * INTO v_transaction;

    UPDATE public.fee_invoices
    SET status = 'paid',
        paid_at = coalesce(paid_at, now()),
        updated_at = now()
    WHERE id = v_invoice.id AND status = 'open';

    IF v_invoice.kind = 'membership' THEN
      SELECT duration_days
      INTO v_duration_days
      FROM public.fee_products
      WHERE product_key = v_invoice.product_key;

      UPDATE public.profiles
      SET membership_tier = 'pro',
          membership_expires_at = greatest(coalesce(membership_expires_at, now()), now()) + make_interval(days => coalesce(v_duration_days, 30)),
          updated_at = now()
      WHERE id = v_invoice.payer_profile_id;

      INSERT INTO public.notifications (recipient_id, title, message, type, related_entity, related_id, metadata)
      VALUES (
        v_invoice.payer_profile_id,
        'Membership activated',
        'Your membership payment was confirmed.',
        'membership',
        'invoice',
        v_invoice.id,
        jsonb_build_object('invoice_id', v_invoice.id, 'transaction_id', v_transaction.id)
      );
    END IF;
  ELSE
    UPDATE public.payment_transactions
      SET status = CASE
          WHEN v_pending THEN 'pending'
          WHEN v_cancelled THEN 'cancelled'
          ELSE 'failed'
        END,
        provider_transaction_id = coalesce(nullif(trim(p_provider_transaction_id), ''), provider_transaction_id),
        provider_status = v_status,
        provider_response = v_payload,
        finalized_at = now(),
        updated_at = now()
    WHERE id = v_transaction.id
    RETURNING * INTO v_transaction;
  END IF;

  RETURN v_transaction;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_payment_status(
  p_transaction_id uuid,
  p_requester_profile_id uuid DEFAULT NULL
)
RETURNS public.payment_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_requester uuid := coalesce(p_requester_profile_id, v_actor);
  v_transaction public.payment_transactions%ROWTYPE;
BEGIN
  IF v_requester IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;
  IF NOT public.is_service_role() AND v_actor IS DISTINCT FROM v_requester THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO v_transaction
  FROM public.payment_transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment transaction not found';
  END IF;
  IF v_transaction.payer_profile_id <> v_requester
     AND coalesce(public.profile_role(v_requester) IN ('super_admin', 'league_manager'), false) = false THEN
    RAISE EXCEPTION 'not authorized to inspect payment transaction';
  END IF;
  RETURN v_transaction;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.profile_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_role(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.is_service_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_service_role() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_event_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_event_manager() TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.auth_email_for_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_email_for_profile(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.current_player_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_player_id() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.player_belongs_to_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_belongs_to_user(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.map_player_to_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.map_player_to_profile(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_read_tournament(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_tournament(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_register_tournament(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_register_tournament(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_view_scorecard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_scorecard(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_edit_scorecard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_edit_scorecard(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_match_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_match_participant(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_manage_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_match(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_manage_shot(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_shot(uuid, uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_read_gallery(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_gallery(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.redact_payment_metadata(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redact_payment_metadata(jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.create_fee_invoice(text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_fee_invoice(text, text, uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_payment_transaction(uuid, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_payment_transaction(uuid, text, text, text, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_payment_checkout(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_payment_checkout(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.finalize_payment_transaction(uuid, text, text, text, text, bigint, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_payment_transaction(uuid, text, text, text, text, bigint, text, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.get_payment_status(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_status(uuid, uuid) TO authenticated, service_role;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'players', 'player_statistics', 'practice_rounds', 'practice_scores',
        'scorecards', 'scorecard_holes', 'tournament_registrations', 'shot_tracking',
        'tournament_trophies', 'galleries', 'gallery_images', 'score_differentials',
        'course_notes', 'player_equipment', 'match_stakes', 'hole_skins', 'audit_logs',
        'notifications', 'player_devices', 'fee_products', 'fee_invoices',
        'payment_transactions', 'payment_webhook_events'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecard_holes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_differentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_stakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hole_skins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: owner can read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles: managers can read" ON public.profiles FOR SELECT TO authenticated USING (public.is_event_manager());
CREATE POLICY "profiles: owner can update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND email = public.auth_email_for_profile(id));
CREATE POLICY "profiles: managers can update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());
CREATE POLICY "profiles: self provision" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND role = 'player' AND email = public.auth_email_for_profile(id));

CREATE POLICY "players: active players are public" ON public.players FOR SELECT
  USING (status = 'active');
CREATE POLICY "players: owner can read" ON public.players FOR SELECT TO authenticated
  USING (public.player_belongs_to_user(id));
CREATE POLICY "players: managers can read" ON public.players FOR SELECT TO authenticated
  USING (public.is_event_manager());
CREATE POLICY "players: self provision" ON public.players FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() AND (auth_user_id IS NULL OR auth_user_id = auth.uid()));
CREATE POLICY "players: managers can insert" ON public.players FOR INSERT TO authenticated
  WITH CHECK (public.is_event_manager());
CREATE POLICY "players: owner can update" ON public.players FOR UPDATE TO authenticated
  USING (public.player_belongs_to_user(id))
  WITH CHECK (profile_id = auth.uid() OR auth_user_id = auth.uid());
CREATE POLICY "players: managers can update" ON public.players FOR UPDATE TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());
CREATE POLICY "players: managers can delete" ON public.players FOR DELETE TO authenticated
  USING (public.is_event_manager());

CREATE POLICY "player_statistics: public active" ON public.player_statistics FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.status = 'active'));
CREATE POLICY "player_statistics: owner can read" ON public.player_statistics FOR SELECT TO authenticated
  USING (public.player_belongs_to_user(player_id));
CREATE POLICY "player_statistics: managers can read" ON public.player_statistics FOR SELECT TO authenticated
  USING (public.is_event_manager());

CREATE POLICY "practice_rounds: owner can read" ON public.practice_rounds FOR SELECT TO authenticated
  USING (public.player_belongs_to_user(player_id));
CREATE POLICY "practice_rounds: managers can read" ON public.practice_rounds FOR SELECT TO authenticated
  USING (public.is_event_manager());
CREATE POLICY "practice_rounds: owner can insert" ON public.practice_rounds FOR INSERT TO authenticated
  WITH CHECK (public.player_belongs_to_user(player_id));
CREATE POLICY "practice_rounds: owner can update" ON public.practice_rounds FOR UPDATE TO authenticated
  USING (public.player_belongs_to_user(player_id) AND status IN ('draft', 'in_progress'))
  WITH CHECK (public.player_belongs_to_user(player_id));
CREATE POLICY "practice_rounds: owner can delete" ON public.practice_rounds FOR DELETE TO authenticated
  USING (public.player_belongs_to_user(player_id) AND status = 'draft');
CREATE POLICY "practice_rounds: managers can manage" ON public.practice_rounds FOR ALL TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());

CREATE POLICY "practice_scores: owner can read" ON public.practice_scores FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.practice_rounds pr
    WHERE pr.id = practice_round_id AND public.player_belongs_to_user(pr.player_id)
  ));
CREATE POLICY "practice_scores: managers can read" ON public.practice_scores FOR SELECT TO authenticated
  USING (public.is_event_manager());
CREATE POLICY "practice_scores: owner can insert" ON public.practice_scores FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.practice_rounds pr
    WHERE pr.id = practice_round_id
      AND public.player_belongs_to_user(pr.player_id)
      AND pr.status IN ('draft', 'in_progress')
  ));
CREATE POLICY "practice_scores: owner can update" ON public.practice_scores FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.practice_rounds pr
    WHERE pr.id = practice_round_id
      AND public.player_belongs_to_user(pr.player_id)
      AND pr.status IN ('draft', 'in_progress')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.practice_rounds pr
    WHERE pr.id = practice_round_id
      AND public.player_belongs_to_user(pr.player_id)
      AND pr.status IN ('draft', 'in_progress')
  ));
CREATE POLICY "practice_scores: owner can delete" ON public.practice_scores FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.practice_rounds pr
    WHERE pr.id = practice_round_id
      AND public.player_belongs_to_user(pr.player_id)
      AND pr.status IN ('draft', 'in_progress')
  ));
CREATE POLICY "practice_scores: managers can manage" ON public.practice_scores FOR ALL TO authenticated
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

CREATE POLICY "scorecard_holes: public can read" ON public.scorecard_holes FOR SELECT
  USING (public.can_view_scorecard(scorecard_id));
CREATE POLICY "scorecard_holes: owner can insert" ON public.scorecard_holes FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_scorecard(scorecard_id));
CREATE POLICY "scorecard_holes: owner can update" ON public.scorecard_holes FOR UPDATE TO authenticated
  USING (public.can_edit_scorecard(scorecard_id)) WITH CHECK (public.can_edit_scorecard(scorecard_id));
CREATE POLICY "scorecard_holes: owner can delete" ON public.scorecard_holes FOR DELETE TO authenticated
  USING (public.can_edit_scorecard(scorecard_id));
CREATE POLICY "scorecard_holes: managers can manage" ON public.scorecard_holes FOR ALL TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());

CREATE POLICY "tournament_registrations: public can read" ON public.tournament_registrations FOR SELECT
  USING (public.can_read_tournament(tournament_id));
CREATE POLICY "tournament_registrations: owner can read" ON public.tournament_registrations FOR SELECT TO authenticated
  USING (public.player_belongs_to_user(player_id));
CREATE POLICY "tournament_registrations: owner can register" ON public.tournament_registrations FOR INSERT TO authenticated
  WITH CHECK (public.player_belongs_to_user(player_id) AND public.can_register_tournament(tournament_id));
CREATE POLICY "tournament_registrations: owner can leave" ON public.tournament_registrations FOR DELETE TO authenticated
  USING (public.player_belongs_to_user(player_id));
CREATE POLICY "tournament_registrations: managers can manage" ON public.tournament_registrations FOR ALL TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());

CREATE POLICY "shot_tracking: owner can read" ON public.shot_tracking FOR SELECT TO authenticated
  USING (public.can_manage_shot(practice_score_id, scorecard_hole_id));
CREATE POLICY "shot_tracking: owner can insert" ON public.shot_tracking FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_shot(practice_score_id, scorecard_hole_id));
CREATE POLICY "shot_tracking: owner can update" ON public.shot_tracking FOR UPDATE TO authenticated
  USING (public.can_manage_shot(practice_score_id, scorecard_hole_id))
  WITH CHECK (public.can_manage_shot(practice_score_id, scorecard_hole_id));
CREATE POLICY "shot_tracking: owner can delete" ON public.shot_tracking FOR DELETE TO authenticated
  USING (public.can_manage_shot(practice_score_id, scorecard_hole_id));
CREATE POLICY "shot_tracking: managers can manage" ON public.shot_tracking FOR ALL TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());

CREATE POLICY "tournament_trophies: public can read" ON public.tournament_trophies FOR SELECT
  USING (public.can_read_tournament(tournament_id));
CREATE POLICY "tournament_trophies: managers can manage" ON public.tournament_trophies FOR ALL TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());

CREATE POLICY "galleries: readable" ON public.galleries FOR SELECT
  USING (public.can_read_gallery(id));
CREATE POLICY "galleries: managers can insert" ON public.galleries FOR INSERT TO authenticated
  WITH CHECK (public.is_event_manager() AND created_by = auth.uid());
CREATE POLICY "galleries: managers can update" ON public.galleries FOR UPDATE TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());
CREATE POLICY "galleries: managers can delete" ON public.galleries FOR DELETE TO authenticated
  USING (public.is_event_manager());

CREATE POLICY "gallery_images: readable" ON public.gallery_images FOR SELECT
  USING (public.can_read_gallery(gallery_id));
CREATE POLICY "gallery_images: managers can insert" ON public.gallery_images FOR INSERT TO authenticated
  WITH CHECK (public.is_event_manager() AND uploaded_by = auth.uid());
CREATE POLICY "gallery_images: managers can update" ON public.gallery_images FOR UPDATE TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());
CREATE POLICY "gallery_images: managers can delete" ON public.gallery_images FOR DELETE TO authenticated
  USING (public.is_event_manager());

CREATE POLICY "score_differentials: owner can read" ON public.score_differentials FOR SELECT TO authenticated
  USING (public.player_belongs_to_user(player_id));
CREATE POLICY "score_differentials: managers can read" ON public.score_differentials FOR SELECT TO authenticated
  USING (public.is_event_manager());
CREATE POLICY "score_differentials: managers can insert" ON public.score_differentials FOR INSERT TO authenticated
  WITH CHECK (public.is_event_manager());
CREATE POLICY "score_differentials: managers can update" ON public.score_differentials FOR UPDATE TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());
CREATE POLICY "score_differentials: managers can delete" ON public.score_differentials FOR DELETE TO authenticated
  USING (public.is_event_manager());

CREATE POLICY "course_notes: owner can read" ON public.course_notes FOR SELECT TO authenticated
  USING (public.player_belongs_to_user(player_id));
CREATE POLICY "course_notes: managers can read" ON public.course_notes FOR SELECT TO authenticated
  USING (public.is_event_manager());
CREATE POLICY "course_notes: owner can insert" ON public.course_notes FOR INSERT TO authenticated
  WITH CHECK (public.player_belongs_to_user(player_id));
CREATE POLICY "course_notes: owner can update" ON public.course_notes FOR UPDATE TO authenticated
  USING (public.player_belongs_to_user(player_id)) WITH CHECK (public.player_belongs_to_user(player_id));
CREATE POLICY "course_notes: owner can delete" ON public.course_notes FOR DELETE TO authenticated
  USING (public.player_belongs_to_user(player_id));
CREATE POLICY "course_notes: managers can manage" ON public.course_notes FOR ALL TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());

CREATE POLICY "player_equipment: owner can read" ON public.player_equipment FOR SELECT TO authenticated
  USING (public.player_belongs_to_user(player_id));
CREATE POLICY "player_equipment: managers can read" ON public.player_equipment FOR SELECT TO authenticated
  USING (public.is_event_manager());
CREATE POLICY "player_equipment: owner can insert" ON public.player_equipment FOR INSERT TO authenticated
  WITH CHECK (public.player_belongs_to_user(player_id));
CREATE POLICY "player_equipment: owner can update" ON public.player_equipment FOR UPDATE TO authenticated
  USING (public.player_belongs_to_user(player_id)) WITH CHECK (public.player_belongs_to_user(player_id));
CREATE POLICY "player_equipment: owner can delete" ON public.player_equipment FOR DELETE TO authenticated
  USING (public.player_belongs_to_user(player_id));
CREATE POLICY "player_equipment: managers can manage" ON public.player_equipment FOR ALL TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());

CREATE POLICY "match_stakes: participants can read" ON public.match_stakes FOR SELECT TO authenticated
  USING (public.can_manage_match(match_id));
CREATE POLICY "match_stakes: participants can insert" ON public.match_stakes FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_match(match_id) AND (created_by IS NULL OR created_by = auth.uid() OR public.is_event_manager()));
CREATE POLICY "match_stakes: participants can update" ON public.match_stakes FOR UPDATE TO authenticated
  USING (public.can_manage_match(match_id))
  WITH CHECK (public.can_manage_match(match_id) AND (created_by IS NULL OR created_by = auth.uid() OR public.is_event_manager()));
CREATE POLICY "match_stakes: participants can delete" ON public.match_stakes FOR DELETE TO authenticated
  USING (public.can_manage_match(match_id));
CREATE POLICY "match_stakes: managers can manage" ON public.match_stakes FOR ALL TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());

CREATE POLICY "hole_skins: participants can read" ON public.hole_skins FOR SELECT TO authenticated
  USING (public.can_manage_match(match_id));
CREATE POLICY "hole_skins: participants can insert" ON public.hole_skins FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_match(match_id) AND (winner_id IS NULL OR public.match_contains_player(match_id, winner_id)));
CREATE POLICY "hole_skins: participants can update" ON public.hole_skins FOR UPDATE TO authenticated
  USING (public.can_manage_match(match_id))
  WITH CHECK (public.can_manage_match(match_id) AND (winner_id IS NULL OR public.match_contains_player(match_id, winner_id)));
CREATE POLICY "hole_skins: participants can delete" ON public.hole_skins FOR DELETE TO authenticated
  USING (public.can_manage_match(match_id));
CREATE POLICY "hole_skins: managers can manage" ON public.hole_skins FOR ALL TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());

CREATE POLICY "audit_logs: managers can read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_event_manager());
CREATE POLICY "audit_logs: managers can insert" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_event_manager() AND user_id = auth.uid());
CREATE POLICY "audit_logs: managers can update" ON public.audit_logs FOR UPDATE TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());
CREATE POLICY "audit_logs: managers can delete" ON public.audit_logs FOR DELETE TO authenticated
  USING (public.is_event_manager());

CREATE POLICY "notifications: owner can read" ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());
CREATE POLICY "notifications: managers can read" ON public.notifications FOR SELECT TO authenticated
  USING (public.is_event_manager());
CREATE POLICY "notifications: owner can insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (recipient_id = auth.uid() AND type IN ('match_update', 'leaderboard_shift', 'achievement', 'system', 'skin_won', 'score_verified', 'tournament', 'registration', 'payment', 'membership'));
CREATE POLICY "notifications: managers can insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_event_manager() AND type IN ('match_update', 'leaderboard_shift', 'achievement', 'system', 'skin_won', 'score_verified', 'tournament', 'registration', 'payment', 'membership'));
CREATE POLICY "notifications: owner can update" ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "notifications: managers can update" ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());
CREATE POLICY "notifications: owner can delete" ON public.notifications FOR DELETE TO authenticated
  USING (recipient_id = auth.uid());
CREATE POLICY "notifications: managers can delete" ON public.notifications FOR DELETE TO authenticated
  USING (public.is_event_manager());

CREATE POLICY "player_devices: owner can read" ON public.player_devices FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
CREATE POLICY "player_devices: owner can insert" ON public.player_devices FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "player_devices: owner can update" ON public.player_devices FOR UPDATE TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "player_devices: owner can delete" ON public.player_devices FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "fee_products: active products are public" ON public.fee_products FOR SELECT
  USING (active);
CREATE POLICY "fee_products: managers can read" ON public.fee_products FOR SELECT TO authenticated
  USING (public.is_event_manager());
CREATE POLICY "fee_products: managers can manage" ON public.fee_products FOR ALL TO authenticated
  USING (public.is_event_manager()) WITH CHECK (public.is_event_manager());

CREATE POLICY "fee_invoices: payer can read" ON public.fee_invoices FOR SELECT TO authenticated
  USING (payer_profile_id = auth.uid());
CREATE POLICY "fee_invoices: managers can read" ON public.fee_invoices FOR SELECT TO authenticated
  USING (public.is_event_manager());

CREATE POLICY "payment_transactions: payer can read" ON public.payment_transactions FOR SELECT TO authenticated
  USING (payer_profile_id = auth.uid());
CREATE POLICY "payment_transactions: managers can read" ON public.payment_transactions FOR SELECT TO authenticated
  USING (public.is_event_manager());

CREATE POLICY "payment_webhook_events: managers can read" ON public.payment_webhook_events FOR SELECT TO authenticated
  USING (public.is_event_manager());

REVOKE INSERT, UPDATE, DELETE ON public.fee_invoices FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payment_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payment_webhook_events FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.player_statistics FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.score_differentials FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.fee_products, public.fee_invoices, public.payment_transactions, public.payment_webhook_events TO authenticated;

DROP TRIGGER IF EXISTS set_updated_at ON public.player_statistics;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.player_statistics FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.fee_products;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.fee_products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.fee_invoices;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.fee_invoices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.payment_transactions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.player_equipment;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.player_equipment FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.player_devices;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.player_devices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view team logos" ON storage.objects;
DROP POLICY IF EXISTS "Managers can upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Managers can update team logos" ON storage.objects;
DROP POLICY IF EXISTS "Managers can delete team logos" ON storage.objects;
DROP POLICY IF EXISTS "gallery-images: public read" ON storage.objects;
DROP POLICY IF EXISTS "gallery-images: managers insert" ON storage.objects;
DROP POLICY IF EXISTS "gallery-images: managers update" ON storage.objects;
DROP POLICY IF EXISTS "gallery-images: managers delete" ON storage.objects;

CREATE POLICY "Public can view team logos" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'team-logos');
CREATE POLICY "Managers can upload team logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-logos' AND public.is_event_manager());
CREATE POLICY "Managers can update team logos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'team-logos' AND public.is_event_manager())
  WITH CHECK (bucket_id = 'team-logos' AND public.is_event_manager());
CREATE POLICY "Managers can delete team logos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'team-logos' AND public.is_event_manager());
CREATE POLICY "gallery-images: public read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'gallery-images');
CREATE POLICY "gallery-images: managers insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery-images' AND public.is_event_manager());
CREATE POLICY "gallery-images: managers update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'gallery-images' AND public.is_event_manager())
  WITH CHECK (bucket_id = 'gallery-images' AND public.is_event_manager());
CREATE POLICY "gallery-images: managers delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gallery-images' AND public.is_event_manager());

ALTER TABLE public.scorecards REPLICA IDENTITY FULL;
ALTER TABLE public.scorecard_holes REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
DECLARE
  r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOR r IN
      SELECT *
      FROM (VALUES
        ('public', 'scorecards'),
        ('public', 'scorecard_holes'),
        ('public', 'notifications')
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
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'live_tournament_leaderboard'
  ) THEN
    EXECUTE $leaderboard$
      CREATE VIEW public.live_tournament_leaderboard
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
      GROUP BY t.id, p.id, p.full_name, p.handicap_index
    $leaderboard$;
  END IF;
END;
$$;

GRANT SELECT ON public.live_tournament_leaderboard TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
