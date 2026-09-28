-- Migration 0017: The Brain - WHS Handicap Infrastructure
-- This migration adds the necessary data columns for professional handicap calculations.

-- 1. Course Ratings
-- Every professional course must have a Rating and a Slope.
-- Course Rating: The score a scratch golfer would likely shoot.
-- Slope Rating: The relative difficulty of a course for a bogey golfer compared to a scratch golfer.
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS course_rating DECIMAL(4, 2) DEFAULT 72.0,
ADD COLUMN IF NOT EXISTS slope_rating INTEGER DEFAULT 113;

-- 2. Profile Handicap Index
-- Store the calculated current Index.
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS handicap_index DECIMAL(4, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS last_handicap_update TIMESTAMPTZ;

-- 3. Score Differentials Table
-- The WHS calculates handicap based on 'Score Differentials' from the best 8 of the last 20 rounds.
CREATE TABLE IF NOT EXISTS public.score_differentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id),
    gross_score INTEGER NOT NULL,
    differential DECIMAL(5, 2) NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_round_differential UNIQUE (round_id)
);

-- Enable RLS
ALTER TABLE public.score_differentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view their own differentials" ON public.score_differentials;
CREATE POLICY "Players can view their own differentials" 
ON public.score_differentials FOR SELECT
USING (player_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all differentials" ON public.score_differentials;
CREATE POLICY "Admins can manage all differentials" 
ON public.score_differentials FOR ALL
USING (get_user_role() IN ('super_admin', 'league_manager'))
WITH CHECK (get_user_role() IN ('super_admin', 'league_manager'));
