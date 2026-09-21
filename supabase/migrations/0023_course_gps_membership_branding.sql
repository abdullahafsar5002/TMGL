-- Performance indexes + course GPS + membership tiers + club branding
-- Run this migration on your Supabase database

-- 1. Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_practice_scores_round_id ON practice_scores(practice_round_id);
CREATE INDEX IF NOT EXISTS idx_practice_scores_player_id ON practice_scores(player_id);
CREATE INDEX IF NOT EXISTS idx_practice_rounds_player_id ON practice_rounds(player_id);
CREATE INDEX IF NOT EXISTS idx_practice_rounds_completed_at ON practice_rounds(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_rounds_status ON practice_rounds(status);
CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament_id ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_player_id ON tournament_players(player_id);
CREATE INDEX IF NOT EXISTS idx_tournament_rounds_tournament_id ON tournament_rounds(tournament_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_tournament_id ON scorecards(tournament_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_player_id ON scorecards(player_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_holes_scorecard_id ON scorecard_holes(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_head_to_head_player_a ON head_to_head_matches(player_a_id);
CREATE INDEX IF NOT EXISTS idx_head_to_head_player_b ON head_to_head_matches(player_b_id);
CREATE INDEX IF NOT EXISTS idx_notifications_player_id ON notifications(player_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- 2. Course GPS fields
ALTER TABLE courses ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS elevation INTEGER;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_type TEXT DEFAULT '18_hole';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS slope_rating NUMERIC(4,1);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_rating NUMERIC(4,1);

-- 3. Membership / subscription columns on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 4. Club branding on leagues or profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS club_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS club_logo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS club_primary_color TEXT DEFAULT '#166534';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS club_accent_color TEXT DEFAULT '#22C55E';

-- 5. Official certification / partner status
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certified_club BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_since DATE;

-- 6. Scorecard verification flag
ALTER TABLE scorecard_holes ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

-- 7. Tournament date fields (if missing)
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS end_date DATE;

-- 8. Edge caching support — created_at for public data queries
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(name);
CREATE INDEX IF NOT EXISTS idx_practice_rounds_course_id ON practice_rounds(course_id);
