-- TMGL Migration 0003: Phase 2 — Players, Teams, Seasons, Divisions RLS
-- Adds Row Level Security policies and indexes for Phase 2 entities.
-- Never put secrets in migration files.

-- ============================================================
-- INDEXES for Phase 2 query patterns
-- ============================================================
create index if not exists idx_divisions_season on public.divisions(season_id);
create index if not exists idx_teams_division on public.teams(division_id);
create index if not exists idx_teams_name on public.teams(name);
create index if not exists idx_team_members_team on public.team_members(team_id);
create index if not exists idx_players_name on public.players(full_name);
create index if not exists idx_players_status on public.players(status);

-- ============================================================
-- RLS POLICIES: players
-- ============================================================

-- Public: read active players (for public-facing player lists)
create policy "players: public can read active players"
  on public.players
  for select
  using (status = 'active');

-- Managers: read all players regardless of status
create policy "players: managers can read all"
  on public.players
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- Player owner: read own player record (linked via profile_id)
create policy "players: owner can read own"
  on public.players
  for select
  using (
    profile_id = auth.uid()
  );

-- Managers: insert players
create policy "players: managers can insert"
  on public.players
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- Managers: update players
create policy "players: managers can update"
  on public.players
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- Managers: delete players
create policy "players: managers can delete"
  on public.players
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- ============================================================
-- RLS POLICIES: divisions
-- ============================================================

-- Public: read divisions of active or completed seasons
create policy "divisions: public can read active season divisions"
  on public.divisions
  for select
  using (
    exists (
      select 1 from public.seasons s
      where s.id = season_id
        and s.status in ('active', 'completed')
    )
  );

-- Managers: read all divisions
create policy "divisions: managers can read all"
  on public.divisions
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- Managers: insert divisions
create policy "divisions: managers can insert"
  on public.divisions
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- Managers: update divisions
create policy "divisions: managers can update"
  on public.divisions
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- Managers: delete divisions
create policy "divisions: managers can delete"
  on public.divisions
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- ============================================================
-- RLS POLICIES: teams
-- ============================================================

-- Public: read teams in active or completed seasons
create policy "teams: public can read active season teams"
  on public.teams
  for select
  using (
    exists (
      select 1 from public.seasons s
      where s.id = season_id
        and s.status in ('active', 'completed')
    )
  );

-- Managers: read all teams
create policy "teams: managers can read all"
  on public.teams
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- Managers: insert teams
create policy "teams: managers can insert"
  on public.teams
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- Managers: update teams
create policy "teams: managers can update"
  on public.teams
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- Managers: delete teams
create policy "teams: managers can delete"
  on public.teams
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- ============================================================
-- RLS POLICIES: team_members
-- ============================================================

-- Public: read members of teams in active or completed seasons
create policy "team_members: public can read active season members"
  on public.team_members
  for select
  using (
    exists (
      select 1 from public.teams t
      join public.seasons s on s.id = t.season_id
      where t.id = team_id
        and s.status in ('active', 'completed')
    )
  );

-- Managers: read all team members
create policy "team_members: managers can read all"
  on public.team_members
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- Managers: insert team members
create policy "team_members: managers can insert"
  on public.team_members
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- Managers: delete team members
create policy "team_members: managers can delete"
  on public.team_members
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- ============================================================
-- NOTE: Further RLS policies for tournaments, fixtures,
-- scorecards, etc. will be added in their respective phase
-- migrations. Policies should never be invented ahead of the
-- business rules they protect.
-- ============================================================
