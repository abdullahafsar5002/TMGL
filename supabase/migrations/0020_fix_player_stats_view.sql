-- Migration 0020: Fix player_statistics View
-- This migration fixes the 406 error by recreating the player_statistics view 
-- to align with the new WHS and Professional Evolution schema.

-- 1. Drop the existing view to clear the stale cache
DROP VIEW IF EXISTS public.player_statistics;

-- 2. Create the Enhanced Professional Statistics View
-- This view now incorporates Handicap Index and real-time totals.
CREATE OR REPLACE VIEW public.player_statistics AS
SELECT 
    pl.id AS player_id,
    pl.full_name,
    pl.handicap_index,
    
    -- Aggregated Performance
    COUNT(sc.id) AS total_rounds,
    COALESCE(SUM(sc.total_strokes), 0) AS total_strokes,
    COALESCE(SUM(sc.total_score_to_par), 0) AS total_to_par,
    
    -- Calculate Average Score
    CASE 
        WHEN COUNT(sc.id) > 0 THEN ROUND(AVG(sc.total_strokes), 1) 
        ELSE NULL 
    END AS avg_score,
    
    -- Best Round (Lowest score)
    MIN(sc.total_strokes) AS best_round,
    
    -- WHS Differential Stats
    (SELECT AVG(differential) FROM public.score_differentials WHERE player_id = pl.id) AS avg_differential
FROM 
    public.players pl
LEFT JOIN 
    public.scorecards sc ON pl.id = sc.player_id AND sc.status = 'verified'
GROUP BY 
    pl.id, pl.full_name, pl.handicap_index;

-- 3. Ensure RLS/Permissions
-- Views in Supabase inherit permissions from the underlying tables, 
-- but we ensure the view is accessible to authenticated users.
GRANT SELECT ON public.player_statistics TO authenticated;
GRANT SELECT ON public.player_statistics TO service_role;

-- 4. Force API Refresh
NOTIFY pgrst, 'reload schema';
