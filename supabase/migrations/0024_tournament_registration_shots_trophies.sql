-- Tournament registration, shot tracking, rejection reason, trophies
-- Run this migration on your Supabase database

-- 1. Tournament registrations (self-join for players)
CREATE TABLE IF NOT EXISTS tournament_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_reg_tournament ON tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_reg_player ON tournament_registrations(player_id);

-- 2. Tournament trophies
CREATE TABLE IF NOT EXISTS tournament_trophies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  trophy_type TEXT NOT NULL DEFAULT 'champion',
  awarded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, trophy_type)
);

CREATE INDEX IF NOT EXISTS idx_trophy_tournament ON tournament_trophies(tournament_id);

-- 3. Shot tracking (per-shot data for practice and tournament rounds)
CREATE TABLE IF NOT EXISTS shot_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_score_id UUID REFERENCES practice_scores(id) ON DELETE CASCADE,
  scorecard_hole_id UUID REFERENCES scorecard_holes(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  shot_number INTEGER NOT NULL,
  club TEXT NOT NULL,
  distance_yards INTEGER,
  result TEXT NOT NULL CHECK (result IN ('fairway', 'green', 'rough', 'bunker', 'water', 'out_of_bounds', 'hole_out')),
  lie TEXT NOT NULL CHECK (lie IN ('tee', 'fairway', 'rough', 'bunker', 'green', 'penalty')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (practice_score_id IS NOT NULL AND scorecard_hole_id IS NULL) OR
    (practice_score_id IS NULL AND scorecard_hole_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_shot_practice ON shot_tracking(practice_score_id);
CREATE INDEX IF NOT EXISTS idx_shot_scorecard ON shot_tracking(scorecard_hole_id);
CREATE INDEX IF NOT EXISTS idx_shot_hole ON shot_tracking(hole_number);

-- 4. Rejection reason column on scorecards
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 5. Max participants on tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS max_participants INTEGER;

-- 6. RLS policies for new tables
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_tracking ENABLE ROW LEVEL SECURITY;

-- Tournament registrations: anyone can read, authenticated players can register themselves
CREATE POLICY "Public read tournament_registrations" ON tournament_registrations FOR SELECT USING (true);
CREATE POLICY "Player register self" ON tournament_registrations FOR INSERT WITH CHECK (auth.uid() = (SELECT profile_id FROM players WHERE id = player_id));
CREATE POLICY "Player unregister self" ON tournament_registrations FOR DELETE USING (auth.uid() = (SELECT profile_id FROM players WHERE id = player_id));

-- Trophies: public read
CREATE POLICY "Public read trophies" ON tournament_trophies FOR SELECT USING (true);
CREATE POLICY "Admin manage trophies" ON tournament_trophies FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'league_manager'))
);

-- Shot tracking: players can manage their own shots
CREATE POLICY "Public read shots" ON shot_tracking FOR SELECT USING (true);
CREATE POLICY "Player insert shots" ON shot_tracking FOR INSERT WITH CHECK (true);
CREATE POLICY "Player update shots" ON shot_tracking FOR UPDATE USING (true);
CREATE POLICY "Player delete shots" ON shot_tracking FOR DELETE USING (true);
