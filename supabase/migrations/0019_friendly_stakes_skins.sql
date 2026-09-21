-- Migration 0019: Toolkit - Friendly Stakes & Skins Tracker
-- This migration adds the ability to track bets and skins for specific matches.

-- 1. Match Stakes Table
-- Tracks the overall bet for a match (e.g. "Dinner", "$10", "Bragging Rights").
CREATE TABLE IF NOT EXISTS public.match_stakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    stake_type TEXT NOT NULL, -- e.g., 'money', 'social', 'custom'
    stake_value TEXT NOT NULL, -- e.g., '10 USD', 'Dinner'
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_match_stake UNIQUE (match_id)
);

-- 2. Hole Skins Table
-- Tracks who won the 'skin' for each individual hole.
CREATE TABLE IF NOT EXISTS public.hole_skins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    hole_number INTEGER NOT NULL CHECK (hole_number >= 1 AND hole_number <= 18),
    winner_id UUID REFERENCES public.profiles(id), -- NULL if halved (carried over)
    is_carried_over BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_match_hole_skin UNIQUE (match_id, hole_number)
);

-- Enable RLS on match_stakes
ALTER TABLE public.match_stakes ENABLE ROW LEVEL SECURITY;

-- RLS for match_stakes:
-- matches.player_a_id / player_b_id reference players(id), NOT profiles(id).
-- auth.uid() is a profiles(id), so we must JOIN through players.profile_id.

DROP POLICY IF EXISTS "Players can view stakes for their matches" ON public.match_stakes;
CREATE POLICY "Players can view stakes for their matches" 
ON public.match_stakes FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.matches m
        JOIN public.players pa ON pa.id = m.player_a_id
        JOIN public.players pb ON pb.id = m.player_b_id
        WHERE m.id = match_id 
          AND (pa.profile_id = auth.uid() OR pb.profile_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Players can manage stakes for their matches" ON public.match_stakes;
CREATE POLICY "Players can manage stakes for their matches" 
ON public.match_stakes FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.matches m
        JOIN public.players pa ON pa.id = m.player_a_id
        JOIN public.players pb ON pb.id = m.player_b_id
        WHERE m.id = match_id 
          AND (pa.profile_id = auth.uid() OR pb.profile_id = auth.uid())
    )
);

-- Enable RLS on hole_skins
ALTER TABLE public.hole_skins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view skins for their matches" ON public.hole_skins;
CREATE POLICY "Players can view skins for their matches" 
ON public.hole_skins FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.matches m
        JOIN public.players pa ON pa.id = m.player_a_id
        JOIN public.players pb ON pb.id = m.player_b_id
        WHERE m.id = match_id 
          AND (pa.profile_id = auth.uid() OR pb.profile_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Players can manage skins for their matches" ON public.hole_skins;
CREATE POLICY "Players can manage skins for their matches" 
ON public.hole_skins FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.matches m
        JOIN public.players pa ON pa.id = m.player_a_id
        JOIN public.players pb ON pb.id = m.player_b_id
        WHERE m.id = match_id 
          AND (pa.profile_id = auth.uid() OR pb.profile_id = auth.uid())
    )
);
