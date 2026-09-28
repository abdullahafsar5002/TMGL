BEGIN;

DO $guard$
DECLARE
  v_needs_rebuild boolean := false;
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN
    v_needs_rebuild := true;
  ELSE
    SELECT NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'recipient_id'
    )
    INTO v_needs_rebuild;
  END IF;

  IF NOT v_needs_rebuild THEN
    RAISE NOTICE 'notifications already matches the live-engine shape; keeping existing rows';
    RETURN;
  END IF;

  EXECUTE 'DROP TABLE IF EXISTS public.notifications CASCADE';
END;
$guard$;

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('match_update', 'leaderboard_shift', 'achievement', 'system')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Policy Implementation
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
CREATE POLICY "Admins can manage all notifications" 
ON public.notifications FOR ALL
USING (get_user_role() IN ('super_admin', 'league_manager'))
WITH CHECK (get_user_role() IN ('super_admin', 'league_manager'));

-- 5. Automation Function (Updated to recipient_id)
CREATE OR REPLACE FUNCTION public.notify_rank_change(player_id UUID, tournament_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notifications (recipient_id, title, message, type)
    VALUES (
        player_id, 
        'Rank Update!', 
        'Your position in the tournament leaderboard has shifted. Check your standing!', 
        'leaderboard_shift'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 6. Score Verification Trigger (Updated to recipient_id)
CREATE OR REPLACE FUNCTION public.handle_score_verification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
        INSERT INTO public.notifications (recipient_id, title, message, type)
        VALUES (
            NEW.player_id, 
            'Score Verified', 
            'Your scorecard for the round has been officially verified!', 
            'match_update'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Safety check for the scorecards table trigger
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'scorecards') THEN
        DROP TRIGGER IF EXISTS on_scorecard_status_change ON public.scorecards;
        CREATE TRIGGER on_scorecard_status_change
        AFTER UPDATE ON public.scorecards
        FOR EACH ROW EXECUTE FUNCTION public.handle_score_verification();
    END IF;
END $$;

COMMIT;
