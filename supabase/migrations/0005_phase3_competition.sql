-- TMGL Migration 0005: Phase 3 — Competition Engine
-- Tournaments, Rounds, Matches, Scorecards, Scorecard Holes
--
-- This migration does NOT modify migrations 0001-0004.
-- Uses get_user_role() SECURITY DEFINER function from migration 0004.

-- ============================================================
-- NEW ENUM TYPES
-- ============================================================

create type public.match_type as enum (
  'singles',       -- 1v1 player match
  'foursome',      -- 2v2 alternate shot
  'fourball',      -- 2v2 best ball
  'team'           -- full team vs team aggregate
);

-- ============================================================
-- TABLE: tournaments
-- ============================================================

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  name text not null,
  description text,
  event_date date,
  status public.tournament_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TABLE: rounds
-- ============================================================

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_number int not null,
  name text not null,
  date date,
  status public.match_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tournament_id, round_number)
);

-- ============================================================
-- TABLE: matches
-- ============================================================

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  match_type public.match_type not null default 'singles',
  team_a_id uuid references public.teams(id) on delete set null,
  team_b_id uuid references public.teams(id) on delete set null,
  player_a_id uuid references public.players(id) on delete set null,
  player_b_id uuid references public.players(id) on delete set null,
  winner_team_id uuid references public.teams(id) on delete set null,
  winner_player_id uuid references public.players(id) on delete set null,
  result text,
  status public.match_status not null default 'scheduled',
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TABLE: scorecards
-- ============================================================

create table if not exists public.scorecards (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete set null,
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  status public.scorecard_status not null default 'draft',
  total_strokes int,
  total_score_to_par int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, player_id)
);

-- ============================================================
-- TABLE: scorecard_holes
-- ============================================================

create table if not exists public.scorecard_holes (
  id uuid primary key default gen_random_uuid(),
  scorecard_id uuid not null references public.scorecards(id) on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  par int not null check (par between 3 and 6),
  strokes int not null check (strokes between 1 and 20),
  score_to_par int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(scorecard_id, hole_number)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_tournaments_season on public.tournaments(season_id);
create index if not exists idx_tournaments_course on public.tournaments(course_id);
create index if not exists idx_tournaments_status on public.tournaments(status);
create index if not exists idx_rounds_tournament on public.rounds(tournament_id);
create index if not exists idx_matches_round on public.matches(round_id);
create index if not exists idx_matches_status on public.matches(status);
create index if not exists idx_matches_team_a on public.matches(team_a_id);
create index if not exists idx_matches_team_b on public.matches(team_b_id);
create index if not exists idx_matches_player_a on public.matches(player_a_id);
create index if not exists idx_matches_player_b on public.matches(player_b_id);
create index if not exists idx_scorecards_match on public.scorecards(match_id);
create index if not exists idx_scorecards_round on public.scorecards(round_id);
create index if not exists idx_scorecards_player on public.scorecards(player_id);
create index if not exists idx_scorecards_status on public.scorecards(status);
create index if not exists idx_scorecard_holes_scorecard on public.scorecard_holes(scorecard_id);

-- ============================================================
-- ENABLE RLS
-- ============================================================

alter table public.tournaments enable row level security;
alter table public.rounds enable row level security;
alter table public.matches enable row level security;
alter table public.scorecards enable row level security;
alter table public.scorecard_holes enable row level security;

-- ============================================================
-- RLS POLICIES: tournaments
-- ============================================================

-- Public: read open/completed/cancelled tournaments
create policy "tournaments: public can read open tournaments"
  on public.tournaments
  for select
  using (status in ('open', 'completed', 'cancelled'));

-- Managers: read all tournaments
create policy "tournaments: managers can read all"
  on public.tournaments
  for select
  using (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: insert tournaments
create policy "tournaments: managers can insert"
  on public.tournaments
  for insert
  with check (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: update tournaments
create policy "tournaments: managers can update"
  on public.tournaments
  for update
  using (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: delete tournaments
create policy "tournaments: managers can delete"
  on public.tournaments
  for delete
  using (public.get_user_role() in ('super_admin', 'league_manager'));

-- ============================================================
-- RLS POLICIES: rounds
-- ============================================================

-- Public: read rounds for open/completed tournaments
create policy "rounds: public can read open tournament rounds"
  on public.rounds
  for select
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id
        and t.status in ('open', 'completed', 'cancelled')
    )
  );

-- Managers: read all rounds
create policy "rounds: managers can read all"
  on public.rounds
  for select
  using (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: insert rounds
create policy "rounds: managers can insert"
  on public.rounds
  for insert
  with check (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: update rounds
create policy "rounds: managers can update"
  on public.rounds
  for update
  using (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: delete rounds
create policy "rounds: managers can delete"
  on public.rounds
  for delete
  using (public.get_user_role() in ('super_admin', 'league_manager'));

-- ============================================================
-- RLS POLICIES: matches
-- ============================================================

-- Public: read matches in open/completed rounds
create policy "matches: public can read open round matches"
  on public.matches
  for select
  using (
    exists (
      select 1 from public.rounds r
      join public.tournaments t on t.id = r.tournament_id
      where r.id = round_id
        and t.status in ('open', 'completed', 'cancelled')
    )
  );

-- Managers: read all matches
create policy "matches: managers can read all"
  on public.matches
  for select
  using (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: insert matches
create policy "matches: managers can insert"
  on public.matches
  for insert
  with check (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: update matches
create policy "matches: managers can update"
  on public.matches
  for update
  using (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: delete matches
create policy "matches: managers can delete"
  on public.matches
  for delete
  using (public.get_user_role() in ('super_admin', 'league_manager'));

-- ============================================================
-- RLS POLICIES: scorecards
-- ============================================================

-- Public: read scorecards for open/completed tournaments
create policy "scorecards: public can read open tournament scorecards"
  on public.scorecards
  for select
  using (
    exists (
      select 1 from public.rounds r
      join public.tournaments t on t.id = r.tournament_id
      where r.id = round_id
        and t.status in ('open', 'completed', 'cancelled')
    )
  );

-- Managers: read all scorecards
create policy "scorecards: managers can read all"
  on public.scorecards
  for select
  using (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: insert scorecards
create policy "scorecards: managers can insert"
  on public.scorecards
  for insert
  with check (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: update scorecards
create policy "scorecards: managers can update"
  on public.scorecards
  for update
  using (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: delete scorecards
create policy "scorecards: managers can delete"
  on public.scorecards
  for delete
  using (public.get_user_role() in ('super_admin', 'league_manager'));

-- ============================================================
-- RLS POLICIES: scorecard_holes
-- ============================================================

-- Public: read scorecard holes for open/completed tournaments
create policy "scorecard_holes: public can read open tournament scorecard holes"
  on public.scorecard_holes
  for select
  using (
    exists (
      select 1 from public.scorecards sc
      join public.rounds r on r.id = sc.round_id
      join public.tournaments t on t.id = r.tournament_id
      where sc.id = scorecard_id
        and t.status in ('open', 'completed', 'cancelled')
    )
  );

-- Managers: read all scorecard holes
create policy "scorecard_holes: managers can read all"
  on public.scorecard_holes
  for select
  using (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: insert scorecard holes
create policy "scorecard_holes: managers can insert"
  on public.scorecard_holes
  for insert
  with check (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: update scorecard holes
create policy "scorecard_holes: managers can update"
  on public.scorecard_holes
  for update
  using (public.get_user_role() in ('super_admin', 'league_manager'));

-- Managers: delete scorecard holes
create policy "scorecard_holes: managers can delete"
  on public.scorecard_holes
  for delete
  using (public.get_user_role() in ('super_admin', 'league_manager'));
