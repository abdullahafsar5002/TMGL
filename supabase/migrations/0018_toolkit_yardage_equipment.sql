-- Migration 0018: Toolkit - Digital Yardage Book & Equipment
-- This migration adds the infrastructure for player-specific course notes and gear tracking.

-- 1. Course Notes (The Digital Yardage Book)
-- Allows players to save strategic notes for specific holes on specific courses.
CREATE TABLE IF NOT EXISTS public.course_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    hole_number INTEGER NOT NULL CHECK (hole_number >= 1 AND hole_number <= 18),
    note_text TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_player_hole_note UNIQUE (player_id, course_id, hole_number)
);

-- Enable RLS on course_notes
ALTER TABLE public.course_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can manage their own course notes" ON public.course_notes;
CREATE POLICY "Players can manage their own course notes" 
ON public.course_notes FOR ALL 
USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Admins can view all course notes" ON public.course_notes;
CREATE POLICY "Admins can view all course notes" 
ON public.course_notes FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role::text IN ('admin', 'super_admin', 'league_manager', 'manager')
    )
);

-- 2. Equipment Bag (Gear Tracking)
-- Allows players to track their clubs and gear.
CREATE TABLE IF NOT EXISTS public.player_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    club_name TEXT NOT NULL, -- e.g. "Driver", "7 Iron", "Putter"
    brand TEXT,              -- e.g. "TaylorMade", "Callaway"
    model TEXT,              -- e.g. "Stealth 2", "Apex"
    added_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on player_equipment
ALTER TABLE public.player_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can manage their own equipment" ON public.player_equipment;
CREATE POLICY "Players can manage their own equipment" 
ON public.player_equipment FOR ALL 
USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Admins can view all equipment" ON public.player_equipment;
CREATE POLICY "Admins can view all equipment" 
ON public.player_equipment FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role::text IN ('admin', 'super_admin', 'league_manager', 'manager')
    )
);
