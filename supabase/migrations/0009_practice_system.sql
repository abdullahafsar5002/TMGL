-- Migration 0009: Practice system + Player statistics
-- Tables: practice_rounds, practice_scores, player_statistics

-- ============================================================
-- ENUM: practice_round_status
-- ============================================================

CREATE TYPE public.practice_round_status AS ENUM (
  'draft',
  'in_progress',
  'completed',
  'cancelled'
);

-- ============================================================
-- TABLE: practice_rounds
-- ============================================================

CREATE TABLE IF NOT EXISTS public.practice_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  round_type INT NOT NULL CHECK (round_type IN (9, 18)),
  tee_box TEXT,
  status public.practice_round_status NOT NULL DEFAULT 'draft',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  gross_score INT,
  net_score INT,
  total_to_par INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: practice_scores
-- ============================================================

CREATE TABLE IF NOT EXISTS public.practice_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_round_id UUID NOT NULL REFERENCES public.practice_rounds(id) ON DELETE CASCADE,
  hole_number INT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  par INT NOT NULL CHECK (par BETWEEN 3 AND 6),
  stroke_index INT CHECK (stroke_index BETWEEN 1 AND 18),
  score INT NOT NULL CHECK (score BETWEEN 1 AND 20),
  putts INT CHECK (putts >= 0 AND putts <= 20),
  fairway_hit BOOLEAN,
  green_in_regulation BOOLEAN,
  penalty_strokes INT DEFAULT 0 CHECK (penalty_strokes >= 0 AND penalty_strokes <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(practice_round_id, hole_number)
);

-- ============================================================
-- TABLE: player_statistics
-- ============================================================

CREATE TABLE IF NOT EXISTS public.player_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL UNIQUE REFERENCES public.players(id) ON DELETE CASCADE,
  rounds_played INT NOT NULL DEFAULT 0,
  average_score NUMERIC(6,2),
  best_score INT,
  average_to_par NUMERIC(6,2),
  birdies INT NOT NULL DEFAULT 0,
  pars INT NOT NULL DEFAULT 0,
  bogeys INT NOT NULL DEFAULT 0,
  double_bogeys INT NOT NULL DEFAULT 0,
  average_putts NUMERIC(4,2),
  fairways_hit_percentage NUMERIC(5,2),
  greens_in_regulation_percentage NUMERIC(5,2),
  last_round_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_practice_rounds_player ON public.practice_rounds(player_id);
CREATE INDEX IF NOT EXISTS idx_practice_rounds_course ON public.practice_rounds(course_id);
CREATE INDEX IF NOT EXISTS idx_practice_rounds_status ON public.practice_rounds(status);
CREATE INDEX IF NOT EXISTS idx_practice_scores_round ON public.practice_scores(practice_round_id);
CREATE INDEX IF NOT EXISTS idx_player_statistics_player ON public.player_statistics(player_id);

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE public.practice_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_statistics ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: practice_rounds
-- ============================================================

-- Players can read their own practice rounds
CREATE POLICY "practice_rounds: players can read own"
  ON public.practice_rounds FOR SELECT
  USING (player_id IN (
    SELECT id FROM public.players WHERE profile_id = auth.uid()
  ));

-- Managers can read all practice rounds
CREATE POLICY "practice_rounds: managers can read all"
  ON public.practice_rounds FOR SELECT
  USING (get_user_role() IN ('super_admin', 'league_manager'));

-- Players can insert their own practice rounds
CREATE POLICY "practice_rounds: players can insert own"
  ON public.practice_rounds FOR INSERT
  WITH CHECK (player_id IN (
    SELECT id FROM public.players WHERE profile_id = auth.uid()
  ));

-- Players can update their own draft/in-progress practice rounds
CREATE POLICY "practice_rounds: players can update own drafts"
  ON public.practice_rounds FOR UPDATE
  USING (
    player_id IN (SELECT id FROM public.players WHERE profile_id = auth.uid())
    AND status IN ('draft', 'in_progress')
  )
  WITH CHECK (
    player_id IN (SELECT id FROM public.players WHERE profile_id = auth.uid())
  );

-- Players can delete their own draft practice rounds
CREATE POLICY "practice_rounds: players can delete own drafts"
  ON public.practice_rounds FOR DELETE
  USING (
    player_id IN (SELECT id FROM public.players WHERE profile_id = auth.uid())
    AND status = 'draft'
  );

-- ============================================================
-- RLS POLICIES: practice_scores
-- ============================================================

-- Players can read scores for their own practice rounds
CREATE POLICY "practice_scores: players can read own"
  ON public.practice_scores FOR SELECT
  USING (practice_round_id IN (
    SELECT pr.id FROM public.practice_rounds pr
    JOIN public.players p ON p.id = pr.player_id
    WHERE p.profile_id = auth.uid()
  ));

-- Managers can read all practice scores
CREATE POLICY "practice_scores: managers can read all"
  ON public.practice_scores FOR SELECT
  USING (get_user_role() IN ('super_admin', 'league_manager'));

-- Players can insert scores for their own editable practice rounds
CREATE POLICY "practice_scores: players can insert own"
  ON public.practice_scores FOR INSERT
  WITH CHECK (practice_round_id IN (
    SELECT pr.id FROM public.practice_rounds pr
    JOIN public.players p ON p.id = pr.player_id
    WHERE p.profile_id = auth.uid()
      AND pr.status IN ('draft', 'in_progress')
  ));

-- Players can update scores for their own editable practice rounds
CREATE POLICY "practice_scores: players can update own"
  ON public.practice_scores FOR UPDATE
  USING (practice_round_id IN (
    SELECT pr.id FROM public.practice_rounds pr
    JOIN public.players p ON p.id = pr.player_id
    WHERE p.profile_id = auth.uid()
      AND pr.status IN ('draft', 'in_progress')
  ))
  WITH CHECK (practice_round_id IN (
    SELECT pr.id FROM public.practice_rounds pr
    JOIN public.players p ON p.id = pr.player_id
    WHERE p.profile_id = auth.uid()
      AND pr.status IN ('draft', 'in_progress')
  ));

-- Players can delete scores for their own editable practice rounds
CREATE POLICY "practice_scores: players can delete own"
  ON public.practice_scores FOR DELETE
  USING (practice_round_id IN (
    SELECT pr.id FROM public.practice_rounds pr
    JOIN public.players p ON p.id = pr.player_id
    WHERE p.profile_id = auth.uid()
      AND pr.status IN ('draft', 'in_progress')
  ));

-- ============================================================
-- RLS POLICIES: player_statistics
-- ============================================================

-- Players can read their own statistics
CREATE POLICY "player_statistics: players can read own"
  ON public.player_statistics FOR SELECT
  USING (player_id IN (
    SELECT id FROM public.players WHERE profile_id = auth.uid()
  ));

-- Public can read statistics for active players (for leaderboards)
CREATE POLICY "player_statistics: public can read active players"
  ON public.player_statistics FOR SELECT
  USING (player_id IN (
    SELECT id FROM public.players WHERE status = 'active'
  ));

-- Managers can read all statistics
CREATE POLICY "player_statistics: managers can read all"
  ON public.player_statistics FOR SELECT
  USING (get_user_role() IN ('super_admin', 'league_manager'));

-- Only system functions should update statistics (via SECURITY DEFINER)
-- Players can insert their own statistics record (first-time setup)
CREATE POLICY "player_statistics: players can insert own"
  ON public.player_statistics FOR INSERT
  WITH CHECK (player_id IN (
    SELECT id FROM public.players WHERE profile_id = auth.uid()
  ));

-- Players can update their own statistics record
CREATE POLICY "player_statistics: players can update own"
  ON public.player_statistics FOR UPDATE
  USING (player_id IN (
    SELECT id FROM public.players WHERE profile_id = auth.uid()
  ))
  WITH CHECK (player_id IN (
    SELECT id FROM public.players WHERE profile_id = auth.uid()
  ));

-- No direct DELETE policies for players on this table

-- ============================================================
-- TRIGGER: updated_at for practice_rounds and practice_scores
-- ============================================================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.practice_rounds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.practice_scores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.player_statistics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
