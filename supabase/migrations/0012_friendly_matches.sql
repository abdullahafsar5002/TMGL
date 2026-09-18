-- Migration 0012: Friendly Matches system
-- Tables: friendly_matches, friendly_match_players, friendly_match_scores

-- ============================================================
-- ENUM: friendly_match_status
-- ============================================================

CREATE TYPE public.friendly_match_status AS ENUM (
  'pending',
  'active',
  'completed',
  'cancelled'
);

-- ============================================================
-- ENUM: friendly_match_format
-- ============================================================

CREATE TYPE public.friendly_match_format AS ENUM (
  'stroke_play',
  'stableford',
  'match_play',
  'best_ball',
  'scramble'
);

-- ============================================================
-- ENUM: invitation_status
-- ============================================================

CREATE TYPE public.invitation_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'cancelled'
);

-- ============================================================
-- TABLE: friendly_matches
-- ============================================================

CREATE TABLE IF NOT EXISTS public.friendly_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  match_format public.friendly_match_format NOT NULL DEFAULT 'stroke_play',
  round_type INT NOT NULL CHECK (round_type IN (9, 18)),
  status public.friendly_match_status NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: friendly_match_players
-- ============================================================

CREATE TABLE IF NOT EXISTS public.friendly_match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.friendly_matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  invitation_status public.invitation_status NOT NULL DEFAULT 'pending',
  score INT,
  to_par INT,
  position INT,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, player_id)
);

-- ============================================================
-- TABLE: friendly_match_scores
-- ============================================================

CREATE TABLE IF NOT EXISTS public.friendly_match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_player_id UUID NOT NULL REFERENCES public.friendly_match_players(id) ON DELETE CASCADE,
  hole_number INT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  par INT NOT NULL CHECK (par BETWEEN 3 AND 6),
  score INT NOT NULL CHECK (score BETWEEN 1 AND 20),
  stableford_points INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_player_id, hole_number)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_friendly_matches_creator ON public.friendly_matches(creator_id);
CREATE INDEX IF NOT EXISTS idx_friendly_matches_course ON public.friendly_matches(course_id);
CREATE INDEX IF NOT EXISTS idx_friendly_matches_status ON public.friendly_matches(status);
CREATE INDEX IF NOT EXISTS idx_friendly_match_players_match ON public.friendly_match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_friendly_match_players_player ON public.friendly_match_players(player_id);
CREATE INDEX IF NOT EXISTS idx_friendly_match_scores_player ON public.friendly_match_scores(match_player_id);

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE public.friendly_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendly_match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendly_match_scores ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: friendly_matches
-- ============================================================

CREATE POLICY "friendly_matches: players can read own"
  ON public.friendly_matches FOR SELECT
  USING (
    creator_id IN (SELECT id FROM public.players WHERE profile_id = auth.uid())
    OR id IN (
      SELECT fm.match_id FROM public.friendly_match_players fm
      JOIN public.players p ON p.id = fm.player_id
      WHERE p.profile_id = auth.uid()
    )
  );

CREATE POLICY "friendly_matches: managers can read all"
  ON public.friendly_matches FOR SELECT
  USING (get_user_role() IN ('super_admin', 'league_manager'));

CREATE POLICY "friendly_matches: players can insert own"
  ON public.friendly_matches FOR INSERT
  WITH CHECK (creator_id IN (SELECT id FROM public.players WHERE profile_id = auth.uid()));

CREATE POLICY "friendly_matches: creator can update own"
  ON public.friendly_matches FOR UPDATE
  USING (creator_id IN (SELECT id FROM public.players WHERE profile_id = auth.uid()))
  WITH CHECK (creator_id IN (SELECT id FROM public.players WHERE profile_id = auth.uid()));

CREATE POLICY "friendly_matches: creator can delete own pending"
  ON public.friendly_matches FOR DELETE
  USING (
    creator_id IN (SELECT id FROM public.players WHERE profile_id = auth.uid())
    AND status = 'pending'
  );

-- ============================================================
-- RLS POLICIES: friendly_match_players
-- ============================================================

CREATE POLICY "friendly_match_players: match participants can read"
  ON public.friendly_match_players FOR SELECT
  USING (
    player_id IN (SELECT id FROM public.players WHERE profile_id = auth.uid())
    OR match_id IN (
      SELECT fm.match_id FROM public.friendly_match_players fm
      JOIN public.players p ON p.id = fm.player_id
      WHERE p.profile_id = auth.uid()
    )
  );

CREATE POLICY "friendly_match_players: managers can read all"
  ON public.friendly_match_players FOR SELECT
  USING (get_user_role() IN ('super_admin', 'league_manager'));

CREATE POLICY "friendly_match_players: match creator can insert"
  ON public.friendly_match_players FOR INSERT
  WITH CHECK (
    match_id IN (
      SELECT id FROM public.friendly_matches
      WHERE creator_id IN (SELECT id FROM public.players WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "friendly_match_players: player can update own invitation"
  ON public.friendly_match_players FOR UPDATE
  USING (player_id IN (SELECT id FROM public.players WHERE profile_id = auth.uid()))
  WITH CHECK (player_id IN (SELECT id FROM public.players WHERE profile_id = auth.uid()));

CREATE POLICY "friendly_match_players: match creator can delete"
  ON public.friendly_match_players FOR DELETE
  USING (
    match_id IN (
      SELECT id FROM public.friendly_matches
      WHERE creator_id IN (SELECT id FROM public.players WHERE profile_id = auth.uid())
    )
  );

-- ============================================================
-- RLS POLICIES: friendly_match_scores
-- ============================================================

CREATE POLICY "friendly_match_scores: participants can read"
  ON public.friendly_match_scores FOR SELECT
  USING (
    match_player_id IN (
      SELECT fmp.id FROM public.friendly_match_players fmp
      JOIN public.players p ON p.id = fmp.player_id
      WHERE p.profile_id = auth.uid()
    )
    OR match_player_id IN (
      SELECT fmp2.id FROM public.friendly_match_players fmp2
      JOIN public.friendly_matches fm ON fm.id = fmp2.match_id
      WHERE fm.creator_id IN (SELECT id FROM public.players WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "friendly_match_scores: managers can read all"
  ON public.friendly_match_scores FOR SELECT
  USING (get_user_role() IN ('super_admin', 'league_manager'));

CREATE POLICY "friendly_match_scores: player can insert own scores"
  ON public.friendly_match_scores FOR INSERT
  WITH CHECK (
    match_player_id IN (
      SELECT fmp.id FROM public.friendly_match_players fmp
      JOIN public.players p ON p.id = fmp.player_id
      WHERE p.profile_id = auth.uid()
    )
  );

CREATE POLICY "friendly_match_scores: player can update own scores"
  ON public.friendly_match_scores FOR UPDATE
  USING (
    match_player_id IN (
      SELECT fmp.id FROM public.friendly_match_players fmp
      JOIN public.players p ON p.id = fmp.player_id
      WHERE p.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    match_player_id IN (
      SELECT fmp.id FROM public.friendly_match_players fmp
      JOIN public.players p ON p.id = fmp.player_id
      WHERE p.profile_id = auth.uid()
    )
  );

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.friendly_matches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.friendly_match_players
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.friendly_match_scores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
