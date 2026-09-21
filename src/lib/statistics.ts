/**
 * Player Statistics Service Layer
 *
 * Statistics are computed from practice_scores and scorecard_holes.
 * The player_statistics table stores cached/aggregated values.
 */

import { supabase } from '@/lib/supabase';
import type { PlayerStatistics, PracticeScore } from '@/types/database';
import type { ServiceResult } from '@/types/service';

// -------------------------------------------------------------------
// Statistics CRUD
// -------------------------------------------------------------------

export async function getPlayerStatistics(
  playerId: string
): Promise<ServiceResult<PlayerStatistics | null>> {
  const { data, error } = await supabase
    .from('player_statistics')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: (data as PlayerStatistics) ?? null, error: null };
}

export async function upsertPlayerStatistics(
  stats: Omit<PlayerStatistics, 'id' | 'updated_at'>
): Promise<ServiceResult<PlayerStatistics>> {
  const { data, error } = await supabase
    .from('player_statistics')
    .upsert(stats, { onConflict: 'player_id' })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as PlayerStatistics, error: null };
}

// -------------------------------------------------------------------
// Statistics Calculation from Practice Scores
// -------------------------------------------------------------------

export interface PracticeStatsInput {
  scores: PracticeScore[];
  grossScore: number;
  totalPar: number;
}

export function calculatePracticeStatistics(
  scores: PracticeScore[],
  _grossScore: number,
  _totalPar: number
): {
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubleBogeys: number;
  averagePutts: number | null;
  fairwaysHitPercentage: number | null;
  girPercentage: number | null;
} {
  let eagles = 0;
  let birdies = 0;
  let pars = 0;
  let bogeys = 0;
  let doubleBogeys = 0;
  let totalPutts = 0;
  let puttsCount = 0;
  let fairwaysAttempted = 0;
  let fairwaysHit = 0;
  let girAttempted = 0;
  let girHit = 0;

  for (const s of scores) {
    const toPar = s.score - s.par;
    if (toPar === -2) eagles++;
    else if (toPar === -1) birdies++;
    else if (toPar === 0) pars++;
    else if (toPar === 1) bogeys++;
    else if (toPar >= 2) doubleBogeys++;

    if (s.putts !== null && s.putts !== undefined) {
      totalPutts += s.putts;
      puttsCount++;
    }
    if (s.fairway_hit !== null && s.fairway_hit !== undefined) {
      fairwaysAttempted++;
      if (s.fairway_hit) fairwaysHit++;
    }
    if (s.green_in_regulation !== null && s.green_in_regulation !== undefined) {
      girAttempted++;
      if (s.green_in_regulation) girHit++;
    }
  }

  return {
    eagles,
    birdies,
    pars,
    bogeys,
    doubleBogeys,
    averagePutts: puttsCount > 0 ? Math.round((totalPutts / puttsCount) * 100) / 100 : null,
    fairwaysHitPercentage: fairwaysAttempted > 0 ? Math.round((fairwaysHit / fairwaysAttempted) * 10000) / 100 : null,
    girPercentage: girAttempted > 0 ? Math.round((girHit / girAttempted) * 10000) / 100 : null,
  };
}

// -------------------------------------------------------------------
// Aggregate Statistics from All Player Rounds
// -------------------------------------------------------------------

export async function computeAndSavePlayerStatistics(
  playerId: string
): Promise<ServiceResult<PlayerStatistics>> {
  const { data: completedRounds, error: roundError } = await supabase
    .from('practice_rounds')
    .select('id, gross_score, total_to_par, completed_at')
    .eq('player_id', playerId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  if (roundError) return { data: null, error: roundError.message };

  const rounds = (completedRounds ?? []) as { id: string; gross_score: number | null; total_to_par: number | null; completed_at: string | null }[];
  const roundIds = rounds.map(r => r.id);

  let allScores: PracticeScore[] = [];
  if (roundIds.length > 0) {
    const { data: practiceScores, error: scoreError } = await supabase
      .from('practice_scores')
      .select('*')
      .in('practice_round_id', roundIds);

    if (scoreError) return { data: null, error: scoreError.message };
    allScores = (practiceScores ?? []) as PracticeScore[];
  }

  if (rounds.length === 0) {
    const emptyStats: Omit<PlayerStatistics, 'id' | 'updated_at'> = {
      player_id: playerId,
      rounds_played: 0,
      average_score: null,
      best_score: null,
      average_to_par: null,
      birdies: 0,
      eagles: 0,
      pars: 0,
      bogeys: 0,
      double_bogeys: 0,
      average_putts: null,
      fairways_hit_percentage: null,
      greens_in_regulation_percentage: null,
      last_round_at: null,
    };
    return upsertPlayerStatistics(emptyStats);
  }

  const grossScores = rounds.map(r => r.gross_score).filter((s): s is number => s !== null);
  const toPars = rounds.map(r => r.total_to_par).filter((t): t is number => t !== null);

  const agg = calculatePracticeStatistics(allScores, grossScores.reduce((a, b) => a + b, 0), toPars.length > 0 ? toPars.reduce((a, b) => a + b, 0) : 0);

  const stats: Omit<PlayerStatistics, 'id' | 'updated_at'> = {
    player_id: playerId,
    rounds_played: rounds.length,
    average_score: grossScores.length > 0 ? Math.round(grossScores.reduce((a, b) => a + b, 0) / grossScores.length * 100) / 100 : null,
    best_score: grossScores.length > 0 ? Math.min(...grossScores) : null,
    average_to_par: toPars.length > 0 ? Math.round(toPars.reduce((a, b) => a + b, 0) / toPars.length * 100) / 100 : null,
    birdies: agg.birdies,
    eagles: agg.eagles,
    pars: agg.pars,
    bogeys: agg.bogeys,
    double_bogeys: agg.doubleBogeys,
    average_putts: agg.averagePutts,
    fairways_hit_percentage: agg.fairwaysHitPercentage,
    greens_in_regulation_percentage: agg.girPercentage,
    last_round_at: rounds[0]?.completed_at ?? null,
  };

  return upsertPlayerStatistics(stats);
}
