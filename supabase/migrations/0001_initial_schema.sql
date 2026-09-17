-- TMGL STARTER SCHEMA
-- This is a foundation. Extend it through later migrations.
-- Never put secrets in SQL files.

create extension if not exists pgcrypto;

create type public.user_role as enum ('super_admin','league_manager','player','public');

create type public.season_status as enum ('draft','active','completed','archived');
create type public.tournament_status as enum ('draft','open','closed','live','completed','cancelled');
create type public.match_status as enum ('scheduled','live','completed','cancelled');
create type public.scorecard_status as enum ('draft','in_progress','submitted','verified','rejected','amended');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  status public.season_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.divisions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(season_id, name)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  player_code text unique,
  full_name text not null,
  phone text,
  handicap_index numeric(5,2),
  status text not null default 'active',
  join_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  division_id uuid references public.divisions(id) on delete set null,
  name text not null,
  logo_url text,
  captain_player_id uuid references public.players(id) on delete set null,
  vice_captain_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(season_id, name)
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(team_id, player_id)
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  description text,
  holes_count int not null default 18 check (holes_count in (9,18)),
  course_rating numeric(5,2),
  slope_rating numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_holes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  par int not null check (par between 3 and 6),
  handicap_index int check (handicap_index between 1 and 18),
  yardage int check (yardage >= 0),
  unique(course_id, hole_number)
);

create index if not exists idx_players_profile on public.players(profile_id);
create index if not exists idx_teams_season on public.teams(season_id);
create index if not exists idx_team_members_player on public.team_members(player_id);
create index if not exists idx_course_holes_course on public.course_holes(course_id);

alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.seasons enable row level security;
alter table public.divisions enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.courses enable row level security;
alter table public.course_holes enable row level security;

-- Baseline policies should be replaced/refined in later security migrations.
-- Public read policies must expose only intentionally public fields.
