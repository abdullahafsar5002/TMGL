/**
 * Official Toruk Makto League Records — Service Layer
 *
 * Reads the official record tables (official_team_standings,
 * notable_round_performances, league_partners).
 *
 * Related rows are resolved with separate flat queries and joined in
 * memory so that public RLS policies on teams/players apply to each
 * table independently. Nested PostgREST embeds are deliberately avoided
 * because they collapse to an empty result whenever any joined table
 * denies the row to the caller.
 */

import { supabase } from '@/lib/supabase';
import type {
  LeaguePartner,
  LeaguePartnerCategory,
  NotableRoundPerformance,
  OfficialTeamStanding,
} from '@/types/database';
import type { ServiceResult } from '@/types/service';

const UNKNOWN_TEAM_NAME = 'Unknown team';
const UNKNOWN_PLAYER_NAME = 'Unknown player';

const TEAM_COLUMNS = 'id, name, sponsor_name, franchise_type';
const PLAYER_COLUMNS = 'id, full_name, player_code, handicap_index';

export interface OfficialTeamStandingView extends OfficialTeamStanding {
  team_name: string;
  sponsor_name: string | null;
  franchise_type: 'official' | 'additional' | null;
  tied: boolean;
}

export interface NotableRoundPerformanceView extends NotableRoundPerformance {
  player_name: string;
  player_code: string | null;
  profile_handicap_index: number | null;
  team_name: string | null;
  team_sponsor_name: string | null;
}

export interface OfficialLeagueOverview {
  standings: OfficialTeamStandingView[];
  performances: NotableRoundPerformanceView[];
  partners: LeaguePartner[];
  hasOfficialData: boolean;
}

interface TeamLookupRow {
  id: string;
  name: string;
  sponsor_name: string | null;
  franchise_type: 'official' | 'additional' | null;
}

interface PlayerLookupRow {
  id: string;
  full_name: string;
  player_code: string | null;
  handicap_index: number | null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  return null;
}

function uniqueIds(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value === 'string' && value) seen.add(value);
  }
  return [...seen];
}

function readError(error: { message?: string } | null | undefined): string | null {
  return error ? error.message ?? 'Request failed' : null;
}

async function fetchTeamLookups(teamIds: string[]): Promise<ServiceResult<Map<string, TeamLookupRow>>> {
  if (teamIds.length === 0) return { data: new Map(), error: null };

  const { data, error } = await supabase
    .from('teams')
    .select(TEAM_COLUMNS)
    .in('id', teamIds);

  const failure = readError(error);
  if (failure) return { data: null, error: failure };

  const map = new Map<string, TeamLookupRow>();
  for (const row of (data ?? []) as TeamLookupRow[]) {
    map.set(row.id, row);
  }
  return { data: map, error: null };
}

async function fetchPlayerLookups(playerIds: string[]): Promise<ServiceResult<Map<string, PlayerLookupRow>>> {
  if (playerIds.length === 0) return { data: new Map(), error: null };

  const { data, error } = await supabase
    .from('players')
    .select(PLAYER_COLUMNS)
    .in('id', playerIds);

  const failure = readError(error);
  if (failure) return { data: null, error: failure };

  const map = new Map<string, PlayerLookupRow>();
  for (const row of (data ?? []) as PlayerLookupRow[]) {
    map.set(row.id, row);
  }
  return { data: map, error: null };
}

export async function getOfficialTeamStandings(
  tournamentId: string
): Promise<ServiceResult<OfficialTeamStandingView[]>> {
  const { data, error } = await supabase
    .from('official_team_standings')
    .select(
      'id, tournament_id, team_id, position, combined_gross, combined_net, accumulated_score, source_url, created_at, updated_at'
    )
    .eq('tournament_id', tournamentId)
    .order('position', { ascending: true })
    .order('team_id', { ascending: true });

  const failure = readError(error);
  if (failure) return { data: null, error: failure };

  const rows = (data ?? []) as OfficialTeamStanding[];
  if (rows.length === 0) return { data: [], error: null };

  const teamsResult = await fetchTeamLookups(uniqueIds(rows.map((r) => r.team_id)));
  if (teamsResult.error) return { data: null, error: teamsResult.error };
  const teams = teamsResult.data ?? new Map<string, TeamLookupRow>();

  const positionCounts = new Map<number, number>();
  for (const row of rows) {
    const position = toNumber(row.position) ?? 0;
    positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
  }

  const standings = rows.map((row) => {
    const team = teams.get(row.team_id);
    const position = toNumber(row.position) ?? 0;
    return {
      ...row,
      position,
      combined_gross: toNumber(row.combined_gross) ?? 0,
      combined_net: toNumber(row.combined_net) ?? 0,
      accumulated_score: toNumber(row.accumulated_score) ?? 0,
      team_name: toText(team?.name) ?? UNKNOWN_TEAM_NAME,
      sponsor_name: toText(team?.sponsor_name) ?? null,
      franchise_type: team?.franchise_type ?? null,
      tied: (positionCounts.get(position) ?? 0) > 1,
    } satisfies OfficialTeamStandingView;
  });

  return { data: standings, error: null };
}

export async function getNotableRoundPerformances(
  tournamentId: string
): Promise<ServiceResult<NotableRoundPerformanceView[]>> {
  const { data, error } = await supabase
    .from('notable_round_performances')
    .select(
      'id, tournament_id, player_id, team_id, gross_score, handicap_index, net_score, note, source_url, created_at'
    )
    .eq('tournament_id', tournamentId)
    .order('gross_score', { ascending: true });

  const failure = readError(error);
  if (failure) return { data: null, error: failure };

  const rows = (data ?? []) as NotableRoundPerformance[];
  if (rows.length === 0) return { data: [], error: null };

  const [playersResult, teamsResult] = await Promise.all([
    fetchPlayerLookups(uniqueIds(rows.map((r) => r.player_id))),
    fetchTeamLookups(uniqueIds(rows.map((r) => r.team_id))),
  ]);

  if (playersResult.error) return { data: null, error: playersResult.error };
  if (teamsResult.error) return { data: null, error: teamsResult.error };

  const players = playersResult.data ?? new Map<string, PlayerLookupRow>();
  const teams = teamsResult.data ?? new Map<string, TeamLookupRow>();

  const performances = rows.map((row) => {
    const player = players.get(row.player_id);
    const team = row.team_id ? teams.get(row.team_id) : undefined;
    return {
      ...row,
      gross_score: toNumber(row.gross_score) ?? 0,
      handicap_index: toNumber(row.handicap_index),
      net_score: toNumber(row.net_score),
      note: toText(row.note),
      player_name: toText(player?.full_name) ?? UNKNOWN_PLAYER_NAME,
      player_code: toText(player?.player_code) ?? null,
      profile_handicap_index: toNumber(player?.handicap_index),
      team_name: toText(team?.name) ?? null,
      team_sponsor_name: toText(team?.sponsor_name) ?? null,
    } satisfies NotableRoundPerformanceView;
  });

  performances.sort((a, b) => {
    if (a.gross_score !== b.gross_score) return a.gross_score - b.gross_score;
    if (a.net_score === null) return b.net_score === null ? 0 : 1;
    if (b.net_score === null) return -1;
    if (a.net_score !== b.net_score) return a.net_score - b.net_score;
    return a.player_name.localeCompare(b.player_name);
  });

  return { data: performances, error: null };
}

export async function getLeaguePartners(
  category?: LeaguePartnerCategory
): Promise<ServiceResult<LeaguePartner[]>> {
  let query = supabase.from('league_partners').select('id, name, category, source_url, sort_order, created_at');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  const failure = readError(error);
  if (failure) return { data: null, error: failure };

  const partners = ((data ?? []) as LeaguePartner[])
    .filter((p) => Boolean(toText(p.name)))
    .map((p) => ({
      ...p,
      category: p.category,
      sort_order: toNumber(p.sort_order) ?? 0,
    }));

  return { data: partners, error: null };
}

export async function getOfficialLeagueOverview(
  tournamentId: string
): Promise<ServiceResult<OfficialLeagueOverview>> {
  const [standingsResult, performancesResult, partnersResult] = await Promise.all([
    getOfficialTeamStandings(tournamentId),
    getNotableRoundPerformances(tournamentId),
    getLeaguePartners(),
  ]);

  if (standingsResult.error) return { data: null, error: standingsResult.error };
  if (performancesResult.error) return { data: null, error: performancesResult.error };
  if (partnersResult.error) return { data: null, error: partnersResult.error };

  const standings = standingsResult.data ?? [];
  const performances = performancesResult.data ?? [];

  return {
    data: {
      standings,
      performances,
      partners: partnersResult.data ?? [],
      hasOfficialData: standings.length > 0 || performances.length > 0,
    },
    error: null,
  };
}
