import type { ScorecardStatus } from '@/types/database';

export const LEADERBOARD_ELIGIBLE_STATUSES: ScorecardStatus[] = ['submitted', 'verified', 'amended'];

export function isLeaderboardEligibleStatus(
  status: ScorecardStatus | string | null | undefined
): boolean {
  if (typeof status !== 'string') return false;
  return (LEADERBOARD_ELIGIBLE_STATUSES as string[]).includes(status);
}

export function filterLeaderboardEligibleScorecards<
  T extends { status?: ScorecardStatus | string | null }
>(scorecards: T[]): T[] {
  return scorecards.filter((sc) => isLeaderboardEligibleStatus(sc.status));
}

export function isScorecardComplete(completion: {
  holes_completed: number;
  total_holes: number;
}): boolean {
  return completion.total_holes > 0 && completion.holes_completed >= completion.total_holes;
}

export interface ChampionScorecard {
  id?: string | null;
  round_id?: string | null;
  player_id: string;
  total_strokes?: number | null;
  total_score_to_par?: number | null;
  status?: ScorecardStatus | string | null;
}

export interface PlayerAggregateStanding {
  player_id: string;
  rounds_played: number;
  total_strokes: number;
  total_score_to_par: number;
}

export function aggregateStandingsByPlayer(
  scorecards: ChampionScorecard[],
  options: { requiredRounds?: number } = {}
): PlayerAggregateStanding[] {
  const requiredRounds = Math.max(1, options.requiredRounds ?? 1);
  const roundsByPlayer = new Map<string, Set<string>>();

  for (const sc of filterLeaderboardEligibleScorecards(scorecards)) {
    if (sc.total_strokes == null) continue;
    if (!roundsByPlayer.has(sc.player_id)) roundsByPlayer.set(sc.player_id, new Set<string>());
    roundsByPlayer.get(sc.player_id)!.add(sc.round_id ?? '__unknown__');
  }

  const standings: PlayerAggregateStanding[] = [];

  for (const sc of filterLeaderboardEligibleScorecards(scorecards)) {
    if (sc.total_strokes == null) continue;
    const rounds = roundsByPlayer.get(sc.player_id)!;
    if (rounds.size < requiredRounds) continue;

    const existing = standings.find((s) => s.player_id === sc.player_id);
    if (existing) {
      existing.rounds_played = rounds.size;
      existing.total_strokes += sc.total_strokes;
      existing.total_score_to_par += sc.total_score_to_par ?? 0;
    } else {
      standings.push({
        player_id: sc.player_id,
        rounds_played: rounds.size,
        total_strokes: sc.total_strokes,
        total_score_to_par: sc.total_score_to_par ?? 0,
      });
    }
  }

  return sortAggregateStandings(standings);
}

export function sortAggregateStandings(
  standings: PlayerAggregateStanding[]
): PlayerAggregateStanding[] {
  return [...standings].sort(
    (a, b) =>
      a.total_score_to_par - b.total_score_to_par ||
      a.total_strokes - b.total_strokes ||
      a.player_id.localeCompare(b.player_id)
  );
}

export function selectChampion(
  standings: PlayerAggregateStanding[]
): PlayerAggregateStanding | null {
  const ranked = sortAggregateStandings(standings);
  return ranked.length > 0 ? ranked[0] : null;
}

export function countCompletedHoles(holeNumbers: Array<number | null | undefined>): number {
  const unique = new Set<number>();
  for (const holeNumber of holeNumbers) {
    if (typeof holeNumber === 'number' && Number.isInteger(holeNumber) && holeNumber > 0) {
      unique.add(holeNumber);
    }
  }
  return unique.size;
}
