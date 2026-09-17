-- TMGL Migration 0002: Auth RLS Policies
-- Adds proper Row Level Security policies for the profiles table
-- and a trigger to auto-create a profile row on new user signup.
-- Never put secrets in migration files.

-- ============================================================
-- TRIGGER: auto-create profile row on auth.users insert
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- Runs with the privileges of the function owner (postgres),
-- so it can insert into profiles even with RLS enabled.
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'player'::public.user_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop trigger first if it already exists (idempotent)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- RLS POLICIES: profiles table
-- ============================================================

-- 1. Any authenticated user can read their own profile
create policy "profiles: owner can read own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- 2. super_admin and league_manager can read all profiles
create policy "profiles: managers can read all"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- 3. Owner can update their own full_name and avatar_url only
--    They cannot update their own role field.
create policy "profiles: owner can update own name and avatar"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Prevent self-role escalation: role must remain unchanged from db value
    and role = (select role from public.profiles where id = auth.uid())
  );

-- 4. super_admin can update any profile including role field
create policy "profiles: super_admin can update any"
  on public.profiles
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'super_admin'
    )
  );

-- ============================================================
-- RLS POLICIES: seasons (public read baseline)
-- ============================================================
create policy "seasons: public can read active seasons"
  on public.seasons
  for select
  using (status in ('active', 'completed'));

create policy "seasons: managers can read all seasons"
  on public.seasons
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

create policy "seasons: managers can insert"
  on public.seasons
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

create policy "seasons: managers can update"
  on public.seasons
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- ============================================================
-- RLS POLICIES: courses (public read baseline)
-- ============================================================
create policy "courses: authenticated users can read"
  on public.courses
  for select
  using (auth.role() = 'authenticated');

create policy "courses: managers can insert"
  on public.courses
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

create policy "courses: managers can update"
  on public.courses
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

create policy "course_holes: authenticated users can read"
  on public.course_holes
  for select
  using (auth.role() = 'authenticated');

create policy "course_holes: managers can insert"
  on public.course_holes
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'league_manager')
    )
  );

-- ============================================================
-- NOTE: Further RLS policies for players, teams, tournaments,
-- scorecards, etc. will be added in their respective phase
-- migrations. Policies should never be invented ahead of the
-- business rules they protect.
-- ============================================================
