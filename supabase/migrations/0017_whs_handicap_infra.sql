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

CREATE POLICY "Players can view their own differentials" 
ON public.score_differentials FOR SELECT 
USING (auth.uid() = player_id);

CREATE POLICY "Admins can manage all differentials" 
ON public.score_differentials FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role::text IN ('admin', 'super_admin', 'league_manager', 'manager')
    )
);

-- 4. Automation: Calculate Differential on Score Verification
-- We create a function that calculates the differential the moment a scorecard is verified.
CREATE OR REPLACE FUNCTION public.calculate_and_store_differential()
RETURNS TRIGGER AS $$
DECLARE
    v_course_rating DECIMAL(4, 2);
    v_slope_rating INTEGER;
    v_gross_score INTEGER;
    v_differential DECIMAL(5, 2);
BEGIN
    -- Only calculate for verified scores
    IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
        
        -- 1. Get Course Data
        SELECT course_rating, slope_rating INTO v_course_rating, v_slope_rating
        FROM public.courses c
        JOIN public.rounds r ON r.course_id = c.id
        WHERE r.id = NEW.round_id;

        -- 2. Calculate Gross Score (Sum of hole scores)
        SELECT SUM(score) INTO v_gross_score
        FROM public.hole_scores
        WHERE round_id = NEW.round_id;

        -- 3. WHS Formula: (113 / Slope) * (Gross - Rating)
        v_differential := (113.0 / v_slope_rating) * (v_gross_score - v_course_rating);

        -- 4. Store the result
        INSERT INTO public.score_differentials (player_id, round_id, course_id, gross_score, differential)
        VALUES (
            NEW.player_id, 
            NEW.round_id, 
            (SELECT course_id FROM public.rounds WHERE id = NEW.round_id),
            v_gross_score, 
            v_differential
        )
        ON CONFLICT (round_id) DO UPDATE 
        SET gross_score = EXCLUDED.gross_score, differential = EXCLUDED.differential;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the differential calculator to the scorecards table
DROP TRIGGER IF EXISTS trg_calculate_differential ON public.scorecards;
CREATE TRIGGER trg_calculate_differential
AFTER UPDATE ON public.scorecards
FOR EACH ROW EXECUTE FUNCTION public.calculate_and_store_differential();
