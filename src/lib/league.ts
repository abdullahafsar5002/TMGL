/**
 * Phase 2 Service Layer — Seasons, Divisions, Players, Teams, Team Members
 *
 * All Supabase access is isolated here. Components call these functions
 * instead of writing queries inline.
 *
 * Authorization is enforced by RLS on the database side.
 * These functions do not perform authorization checks themselves.
 */

import { supabase } from '@/lib/supabase';
import type {
  Season,
  Division,
  Player,
  Team,
  TeamMember,
} from '@/types/database';

// -------------------------------------------------------------------
// Generic result type
// -------------------------------------------------------------------

export type ServiceResult<T> = { data: T; error: null } | { data: null; error: string };

// -------------------------------------------------------------------
// Seasons
// -------------------------------------------------------------------

export async function getSeasons(): Promise<ServiceResult<Season[]>> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Season[], error: null };
}

export async function getSeason(id: string): Promise<ServiceResult<Season>> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Season, error: null };
}

export async function createSeason(
  season: Pick<Season, 'name' | 'start_date' | 'end_date' | 'status'>
): Promise<ServiceResult<Season>> {
  const { data, error } = await supabase
    .from('seasons')
    .insert(season)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Season, error: null };
}

export async function updateSeason(
  id: string,
  updates: Partial<Pick<Season, 'name' | 'start_date' | 'end_date' | 'status'>>
): Promise<ServiceResult<Season>> {
  const { data, error } = await supabase
    .from('seasons')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Season, error: null };
}

export async function deleteSeason(id: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('seasons').delete().eq('id', id);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// -------------------------------------------------------------------
// Divisions
// -------------------------------------------------------------------

export async function getDivisionsBySeason(seasonId: string): Promise<ServiceResult<Division[]>> {
  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .eq('season_id', seasonId)
    .order('name');

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Division[], error: null };
}

export async function getDivision(id: string): Promise<ServiceResult<Division>> {
  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Division, error: null };
}

export async function createDivision(
  division: Pick<Division, 'name' | 'season_id'>
): Promise<ServiceResult<Division>> {
  const { data, error } = await supabase
    .from('divisions')
    .insert(division)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Division, error: null };
}

export async function updateDivision(
  id: string,
  updates: Partial<Pick<Division, 'name'>>
): Promise<ServiceResult<Division>> {
  const { data, error } = await supabase
    .from('divisions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Division, error: null };
}

export async function deleteDivision(id: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('divisions').delete().eq('id', id);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// -------------------------------------------------------------------
// Players
// -------------------------------------------------------------------

export async function getPlayers(search?: string): Promise<ServiceResult<Player[]>> {
  let query = supabase
    .from('players')
    .select('*')
    .order('full_name');

  if (search && search.trim()) {
    query = query.ilike('full_name', `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Player[], error: null };
}

export async function getPlayer(id: string): Promise<ServiceResult<Player>> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Player, error: null };
}

export async function getPlayerByProfileId(profileId: string): Promise<ServiceResult<Player>> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('profile_id', profileId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Player, error: null };
}

export async function createPlayer(
  player: Pick<Player, 'full_name' | 'profile_id' | 'phone' | 'handicap_index' | 'status' | 'join_date' | 'player_code'>
): Promise<ServiceResult<Player>> {
  const { data, error } = await supabase
    .from('players')
    .insert({
      full_name: player.full_name.trim(),
      profile_id: player.profile_id || null,
      phone: player.phone || null,
      handicap_index: player.handicap_index,
      status: player.status || 'active',
      join_date: player.join_date || null,
      player_code: player.player_code || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Player, error: null };
}

export async function updatePlayer(
  id: string,
  updates: Partial<Pick<Player, 'full_name' | 'phone' | 'handicap_index' | 'status' | 'player_code'>>
): Promise<ServiceResult<Player>> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.full_name !== undefined) payload.full_name = updates.full_name.trim();
  if (updates.phone !== undefined) payload.phone = updates.phone || null;
  if (updates.handicap_index !== undefined) payload.handicap_index = updates.handicap_index;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.player_code !== undefined) payload.player_code = updates.player_code || null;

  const { data, error } = await supabase
    .from('players')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Player, error: null };
}

export async function deletePlayer(id: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// -------------------------------------------------------------------
// Teams
// -------------------------------------------------------------------

export async function getTeamsBySeason(seasonId: string): Promise<ServiceResult<Team[]>> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('season_id', seasonId)
    .order('name');

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Team[], error: null };
}

export async function getAllTeams(): Promise<ServiceResult<Team[]>> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name');

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Team[], error: null };
}

export async function getTeam(id: string): Promise<ServiceResult<Team>> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Team, error: null };
}

export async function createTeam(
  team: Pick<Team, 'name' | 'season_id' | 'division_id' | 'captain_player_id' | 'vice_captain_player_id' | 'logo_url'>
): Promise<ServiceResult<Team>> {
  const { data, error } = await supabase
    .from('teams')
    .insert({
      name: team.name.trim(),
      season_id: team.season_id,
      division_id: team.division_id || null,
      captain_player_id: team.captain_player_id || null,
      vice_captain_player_id: team.vice_captain_player_id || null,
      logo_url: team.logo_url || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Team, error: null };
}

export async function updateTeam(
  id: string,
  updates: Partial<Pick<Team, 'name' | 'division_id' | 'captain_player_id' | 'vice_captain_player_id' | 'logo_url'>>
): Promise<ServiceResult<Team>> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.division_id !== undefined) payload.division_id = updates.division_id || null;
  if (updates.captain_player_id !== undefined) payload.captain_player_id = updates.captain_player_id || null;
  if (updates.vice_captain_player_id !== undefined) payload.vice_captain_player_id = updates.vice_captain_player_id || null;
  if (updates.logo_url !== undefined) payload.logo_url = updates.logo_url || null;

  const { data, error } = await supabase
    .from('teams')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Team, error: null };
}

export async function deleteTeam(id: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// -------------------------------------------------------------------
// Team Members
// -------------------------------------------------------------------

export async function getTeamMembers(teamId: string): Promise<ServiceResult<TeamMember[]>> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('joined_at');

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as TeamMember[], error: null };
}

export async function getTeamMembersBySeason(seasonId: string): Promise<ServiceResult<TeamMember[]>> {
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .eq('season_id', seasonId);

  if (!teams || teams.length === 0) return { data: [], error: null };

  const teamIds = teams.map((t) => t.id);
  const { data: members, error: membersError } = await supabase
    .from('team_members')
    .select('*')
    .in('team_id', teamIds);

  if (membersError) return { data: null, error: membersError.message };
  return { data: (members ?? []) as TeamMember[], error: null };
}

export async function addTeamMember(
  teamId: string,
  playerId: string
): Promise<ServiceResult<TeamMember>> {
  const { data, error } = await supabase
    .from('team_members')
    .insert({ team_id: teamId, player_id: playerId })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as TeamMember, error: null };
}

export async function removeTeamMember(
  teamId: string,
  playerId: string
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('player_id', playerId);

  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// -------------------------------------------------------------------
// Team Membership Queries
// -------------------------------------------------------------------

export async function getTeamsByPlayer(playerId: string): Promise<ServiceResult<TeamMember[]>> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('player_id', playerId)
    .order('joined_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as TeamMember[], error: null };
}

export async function getTeamsByIds(teamIds: string[]): Promise<ServiceResult<Team[]>> {
  if (teamIds.length === 0) return { data: [], error: null };
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .in('id', teamIds)
    .order('name');

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Team[], error: null };
}

// -------------------------------------------------------------------
// Aggregate counts (for dashboard)
// -------------------------------------------------------------------

export async function getLeagueStats(): Promise<
  ServiceResult<{ seasons: number; divisions: number; players: number; teams: number }>
> {
  const [seasonsRes, divisionsRes, playersRes, teamsRes] = await Promise.all([
    supabase.from('seasons').select('id', { count: 'exact', head: true }),
    supabase.from('divisions').select('id', { count: 'exact', head: true }),
    supabase.from('players').select('id', { count: 'exact', head: true }),
    supabase.from('teams').select('id', { count: 'exact', head: true }),
  ]);

  const firstError = seasonsRes.error || divisionsRes.error || playersRes.error || teamsRes.error;
  if (firstError) return { data: null, error: firstError.message };

  return {
    data: {
      seasons: seasonsRes.count ?? 0,
      divisions: divisionsRes.count ?? 0,
      players: playersRes.count ?? 0,
      teams: teamsRes.count ?? 0,
    },
    error: null,
  };
}
