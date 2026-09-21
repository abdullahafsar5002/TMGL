BEGIN;

-- 1. Force Cleanup
DROP TABLE IF EXISTS public.notifications CASCADE;

-- 2. Notifications Table Creation (Using recipient_id to match frontend)
CREATE TABLE public.notifications (
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
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = recipient_id);

CREATE POLICY "Admins can manage all notifications" 
ON public.notifications FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role::text IN ('admin', 'super_admin', 'league_manager', 'manager')
    )
);

-- 4. Real-time Leaderboard View (Resilient)
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'registrations') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.live_tournament_leaderboard AS
        SELECT 
            t.id AS tournament_id,
            p.id AS player_id,
            p.full_name,
            p.handicap as player_handicap,
            COALESCE(SUM(hs.score), 0) as total_gross,
            (COALESCE(SUM(hs.score), 0) - p.handicap) as total_net,
            COUNT(hs.id) as holes_completed
        FROM 
            public.tournaments t
        JOIN 
            public.registrations r ON t.id = r.tournament_id
        JOIN 
            public.profiles p ON r.player_id = p.id
        LEFT JOIN 
            public.rounds rd ON t.id = rd.tournament_id AND rd.player_id = p.id
        LEFT JOIN 
            public.hole_scores hs ON rd.id = hs.round_id
        GROUP BY 
            t.id, p.id, p.full_name, p.handicap;';
    END IF;
END $$;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
