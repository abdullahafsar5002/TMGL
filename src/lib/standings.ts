/**
 * Team Standings / Franchise Points
 *
 * Calculates league points for teams based on match results.
 * Win = 3pts, Draw = 1pt, Loss = 0pts.
 * Bonus points for margin of victory.
 */

import { supabase } from '@/lib/supabase';
import type { ServiceResult } from '@/types/service';

export interface TeamStanding {
  team_id: string;
  team_name: string;
  season_id: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  points_for: number;
  points_against: number;
  net_points: number;
  league_points: number;
  win_rate: number;
}

/**
 * Calculate and return league standings for a season.
 * Points system:
 *   Win = 3 pts
 *   Draw = 1 pt
 *   Loss = 0 pts
 *   Bonus: +1 pt per match won by 3+ strokes (max 1 bonus per match)
 */
export async function calculateStandings(
  seasonId: string
): Promise<ServiceResult<TeamStanding[]>> {
  // 1. Get all completed matches in this season's tournaments
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id')
    .eq('season_id', seasonId);

  if (!tournaments || tournaments.length === 0) {
    return { data: [] as TeamStanding[], error: null };
  }

  const tournamentIds = tournaments.map(t => t.id);

  const { data: matches, error: mErr } = await supabase
    .from('matches')
    .select(`
      id,
      team_a_id,
      team_b_id,
      team_a_score,
      team_b_score,
      status,
      round_id,
      rounds!inner(tournament_id)
    `)
    .in('rounds.tournament_id', tournamentIds)
    .eq('status', 'completed')
    .not('team_a_score', 'is', null)
    .not('team_b_score', 'is', null);

  if (mErr || !matches) return { data: null, error: mErr?.message ?? 'Failed to load matches' };

  // 2. Get all teams in this season
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('season_id', seasonId);

  if (!teams) return { data: null, error: 'Failed to load teams' };

  // 3. Initialize standings
  const standingsMap = new Map<string, TeamStanding>();
  for (const team of teams) {
    standingsMap.set(team.id, {
      team_id: team.id,
      team_name: team.name,
      season_id: seasonId,
      matches_played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points_for: 0,
      points_against: 0,
      net_points: 0,
      league_points: 0,
      win_rate: 0,
    });
  }

  // 4. Tally results
  for (const match of matches) {
    const aId = match.team_a_id;
    const bId = match.team_b_id;
    const aScore = match.team_a_score as number;
    const bScore = match.team_b_score as number;

    if (!aId || !bId) continue;

    const a = standingsMap.get(aId);
    const b = standingsMap.get(bId);
    if (!a || !b) continue;

    a.matches_played++;
    b.matches_played++;
    a.points_for += aScore;
    a.points_against += bScore;
    b.points_for += bScore;
    b.points_against += aScore;

    if (aScore > bScore) {
      a.wins++;
      a.league_points += 3;
      b.losses++;
      // Bonus for big win
      if (aScore - bScore >= 3) a.league_points += 1;
    } else if (bScore > aScore) {
      b.wins++;
      b.league_points += 3;
      a.losses++;
      if (bScore - aScore >= 3) b.league_points += 1;
    } else {
      a.draws++;
      b.draws++;
      a.league_points += 1;
      b.league_points += 1;
    }
  }

  // 5. Calculate derived fields and sort
  const standings = [...standingsMap.values()].map(s => ({
    ...s,
    net_points: s.points_for - s.points_against,
    win_rate: s.matches_played > 0 ? parseFloat(((s.wins / s.matches_played) * 100).toFixed(1)) : 0,
  }));

  standings.sort((a, b) => {
    if (b.league_points !== a.league_points) return b.league_points - a.league_points;
    if (b.net_points !== a.net_points) return b.net_points - a.net_points;
    return b.points_for - a.points_for;
  });

  return { data: standings, error: null };
}

/**
 * Get standings for display on the leaderboard page.
 */
export async function getLeaderboardStandings(
  seasonId: string
): Promise<ServiceResult<TeamStanding[]>> {
  return calculateStandings(seasonId);
}
