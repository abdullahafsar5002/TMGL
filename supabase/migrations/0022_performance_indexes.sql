-- 0022: Performance indexes for scorecard holes and related tables
-- As tables grow to millions of rows, these indexes keep
-- leaderboards, analytics, and player stats fast.

-- Scorecard holes: primary query patterns
CREATE INDEX IF NOT EXISTS idx_scorecard_holes_scorecard_id
  ON scorecard_holes (scorecard_id);

CREATE INDEX IF NOT EXISTS idx_scorecard_holes_hole_number
  ON scorecard_holes (hole_number);

-- Composite index for leaderboard queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_scorecard_holes_scorecard_strokes
  ON scorecard_holes (scorecard_id, hole_number, strokes, par);

-- Scorecards: filter by round and player
CREATE INDEX IF NOT EXISTS idx_scorecards_round_id
  ON scorecards (round_id);

CREATE INDEX IF NOT EXISTS idx_scorecards_player_id
  ON scorecards (player_id);

CREATE INDEX IF NOT EXISTS idx_scorecards_round_status
  ON scorecards (round_id, status);

-- Practice scores: analytics queries
CREATE INDEX IF NOT EXISTS idx_practice_scores_round_id
  ON practice_scores (practice_round_id);

CREATE INDEX IF NOT EXISTS idx_practice_scores_hole_par
  ON practice_scores (hole_number, par);

-- Practice rounds: player history
CREATE INDEX IF NOT EXISTS idx_practice_rounds_player_status
  ON practice_rounds (player_id, status);

CREATE INDEX IF NOT EXISTS idx_practice_rounds_completed_at
  ON practice_rounds (completed_at DESC NULLS LAST);

-- Notifications: unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications (recipient_id, is_read)
  WHERE is_read = false;

-- player_statistics is a VIEW (migration 0020), not a table — cannot be indexed.
-- Underlying query performance is covered by idx_scorecards_player_id above.

-- Friendly match scores
CREATE INDEX IF NOT EXISTS idx_friendly_match_scores_player
  ON friendly_match_scores (match_player_id);

-- Leaderboard: tournament standings
CREATE INDEX IF NOT EXISTS idx_scorecards_player_strokes
  ON scorecards (player_id, total_strokes);
