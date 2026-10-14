-- ============================================================
-- 0037: Tournament visibility, lifecycle flow, notification fan-out
-- ============================================================
--
-- Reported problems:
--   1. A tournament moved to 'live' disappeared for every player and
--      anonymous visitor. The only public SELECT policies for
--      tournaments and rounds come from 0005 and list
--      ('open','completed','cancelled') only, and no later migration
--      ever replaced them - while can_read_tournament() and the
--      registrations/matches policies already allowed 'live'.
--   2. Nothing ever produced a notification: publishing an
--      announcement, opening registration, going live or publishing
--      results were all silent, so the bell stayed at zero.
--   3. The public contact form looked up admin profile ids as anon
--      (profiles is authenticated-only) and then tried to insert a
--      notification addressed to someone else, which the INSERT
--      policies forbid. Every visitor got
--      "No league contact is currently available."
--
-- Note: the Supabase CLI runs each migration file in its own
-- transaction, so there is no explicit BEGIN/COMMIT here.


-- ------------------------------------------------------------
-- 1. One source of truth for tournament visibility
-- ------------------------------------------------------------

-- 'closed' means registration has closed but play has not started.
-- Players still need to see pairings and the tee sheet for it.
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
      AND (
        t.status IN ('open', 'closed', 'live', 'completed', 'cancelled')
        OR public.is_event_manager()
      )
  );
  $$;

DROP POLICY IF EXISTS "tournaments: public can read open tournaments" ON public.tournaments;
CREATE POLICY "tournaments: public can read open tournaments"
  ON public.tournaments
  FOR SELECT
  USING (public.can_read_tournament(id));

DROP POLICY IF EXISTS "rounds: public can read open tournament rounds" ON public.rounds;
CREATE POLICY "rounds: public can read open tournament rounds"
  ON public.rounds
  FOR SELECT
  USING (public.can_read_tournament(tournament_id));


-- ------------------------------------------------------------
-- 2. Contact form: one anon-safe call instead of two RLS-blocked reads
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_contact_message(
  p_name text,
  p_email text,
  p_subject text,
  p_message text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_admin uuid;
    v_delivered integer := 0;
  BEGIN
    IF coalesce(trim(p_name), '') = ''
       OR coalesce(trim(p_email), '') = ''
       OR coalesce(trim(p_subject), '') = ''
       OR coalesce(trim(p_message), '') = '' THEN
      RAISE EXCEPTION 'Please complete every field before sending your message.';
    END IF;

    IF length(p_name) > 200 OR length(p_email) > 320
       OR length(p_subject) > 300 OR length(p_message) > 5000 THEN
      RAISE EXCEPTION 'One of the fields is too long.';
    END IF;

    IF p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
      RAISE EXCEPTION 'Please enter a valid email address.';
    END IF;

    FOR v_admin IN
      SELECT id
      FROM public.profiles
      WHERE role IN ('super_admin', 'league_manager')
      ORDER BY (role = 'super_admin') DESC, created_at
      LIMIT 5
    LOOP
      INSERT INTO public.notifications (recipient_id, type, title, message, related_entity)
      VALUES (
        v_admin,
        'system',
        'Contact: ' || left(trim(p_subject), 200),
        'From: ' || left(trim(p_name), 200) || ' (' || left(trim(p_email), 320) || ')'
          || E'\n\n' || left(trim(p_message), 5000),
        'contact'
      );
      v_delivered := v_delivered + 1;
    END LOOP;

    IF v_delivered = 0 THEN
      RAISE EXCEPTION 'No league contact is currently available.';
    END IF;
  END;
  $$;

REVOKE ALL ON FUNCTION public.submit_contact_message(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_contact_message(text, text, text, text) TO anon, authenticated;


-- ------------------------------------------------------------
-- 3. League-wide fan-out for announcements
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_all_members(
  p_title text,
  p_message text,
  p_announcement_id uuid DEFAULT NULL
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_count integer;
    v_title text;
    v_body text;
  BEGIN
    IF NOT public.is_event_manager() THEN
      RAISE EXCEPTION 'Only league managers can send league-wide notifications.';
    END IF;

    v_title := left(nullif(trim(p_title), ''), 200);
    v_body := left(nullif(trim(p_message), ''), 4000);

    IF v_title IS NULL OR v_body IS NULL THEN
      RAISE EXCEPTION 'A title and a message are required.';
    END IF;

    INSERT INTO public.notifications (recipient_id, type, title, message, related_entity, related_id)
    SELECT id, 'system', v_title, v_body, 'announcement', p_announcement_id
    FROM public.profiles
    WHERE id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
  END;
  $$;

REVOKE ALL ON FUNCTION public.notify_all_members(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_all_members(text, text, uuid) TO authenticated;


-- ------------------------------------------------------------
-- 4. Tournament lifecycle events notify the entrants
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_tournament_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_heading text;
    v_body text;
  BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NULL;
    END IF;

    CASE NEW.status::text
      WHEN 'open' THEN
        v_heading := 'Registration open';
        v_body := 'Registration is now open. Join from the tournament page.';
      WHEN 'closed' THEN
        v_heading := 'Registration closed';
        v_body := 'Registration has closed. Pairings and tee times will follow.';
      WHEN 'live' THEN
        v_heading := 'Tournament is live';
        v_body := 'Play is under way. Live scoring is now available.';
      WHEN 'completed' THEN
        v_heading := 'Results published';
        v_body := 'Final results and standings are now available.';
      ELSE
        RETURN NULL;
    END CASE;

    INSERT INTO public.notifications (recipient_id, type, title, message, related_entity, related_id)
    SELECT DISTINCT public.map_player_to_profile(tr.player_id),
           'tournament',
           v_heading || ': ' || left(NEW.name, 120),
           v_body,
           'tournament',
           NEW.id
    FROM public.tournament_registrations tr
    WHERE tr.tournament_id = NEW.id;

    RETURN NULL;
  END;
  $$;

DROP TRIGGER IF EXISTS on_tournament_status_change ON public.tournaments;
CREATE TRIGGER on_tournament_status_change
  AFTER UPDATE OF status ON public.tournaments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_tournament_status_change();


-- ------------------------------------------------------------
-- 5. Drop the narrower type CHECK left behind by 0016, if it survived
--    (0013 created the table without a CHECK, so this is normally a
--    no-op, but 0016 would have added one had it won the race).
-- ------------------------------------------------------------

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
