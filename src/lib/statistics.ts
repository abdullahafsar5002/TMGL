import { supabase } from '@/lib/supabase';
import { toUserFacingServiceError } from '@/lib/errors';
import type { PlayerStatistics, PracticeScore } from '@/types/database';
import type { ServiceResult } from '@/types/service';

export type PlayerStatisticsInput = Pick<PlayerStatistics, 'player_id'> & Partial<Omit<PlayerStatistics, 'id' | 'updated_at' | 'player_id'>>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeStatistics(value: unknown): PlayerStatistics | null {
  const outer = asRecord(value);
  const record = outer ? asRecord(outer.data) ?? outer : null;
  if (!record) return null;
  const playerId = typeof record.player_id === 'string' ? record.player_id : null;
  if (!playerId) return null;
  return {
    id: typeof record.id === 'string' ? record.id : playerId,
    player_id: playerId,
    rounds_played: numberOrNull(record.rounds_played ?? record.total_rounds) ?? 0,
    average_score: numberOrNull(record.average_score ?? record.avg_score),
    best_score: numberOrNull(record.best_score ?? record.best_round),
    average_to_par: numberOrNull(record.average_to_par ?? record.avg_to_par),
    birdies: numberOrNull(record.birdies) ?? 0,
    eagles: numberOrNull(record.eagles) ?? 0,
    pars: numberOrNull(record.pars) ?? 0,
    bogeys: numberOrNull(record.bogeys) ?? 0,
    double_bogeys: numberOrNull(record.double_bogeys ?? record.double_bogey) ?? 0,
    average_putts: numberOrNull(record.average_putts ?? record.putting_avg),
    fairways_hit_percentage: numberOrNull(record.fairways_hit_percentage ?? record.fairways_hit),
    greens_in_regulation_percentage: numberOrNull(record.greens_in_regulation_percentage ?? record.gir),
    last_round_at: typeof record.last_round_at === 'string' ? record.last_round_at : null,
    ...(typeof record.created_at === 'string' ? { created_at: record.created_at } : {}),
    updated_at: typeof record.updated_at === 'string' ? record.updated_at : new Date(0).toISOString(),
  };
}

export async function getPlayerStatistics(playerId: string): Promise<ServiceResult<PlayerStatistics | null>> {
  const { data, error } = await supabase
    .from('player_statistics')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle();
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to load player statistics.') };
  return { data: normalizeStatistics(data), error: null };
}

export async function upsertPlayerStatistics(stats: PlayerStatisticsInput): Promise<ServiceResult<PlayerStatistics>> {
  const { data, error } = await supabase.rpc('refresh_player_statistics', { p_player_id: stats.player_id });
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to refresh player statistics.') };
  const normalized = normalizeStatistics(data);
  if (!normalized) return { data: null, error: 'The statistics service returned an invalid record.' };
  return { data: normalized, error: null };
}

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

  for (const score of scores) {
    const toPar = score.score - score.par;
    if (toPar <= -2) eagles++;
    else if (toPar === -1) birdies++;
    else if (toPar === 0) pars++;
    else if (toPar === 1) bogeys++;
    else if (toPar >= 2) doubleBogeys++;

    if (score.putts !== null && score.putts !== undefined) {
      totalPutts += score.putts;
      puttsCount++;
    }
    if (score.fairway_hit !== null && score.fairway_hit !== undefined) {
      fairwaysAttempted++;
      if (score.fairway_hit) fairwaysHit++;
    }
    if (score.green_in_regulation !== null && score.green_in_regulation !== undefined) {
      girAttempted++;
      if (score.green_in_regulation) girHit++;
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

export async function computeAndSavePlayerStatistics(playerId: string): Promise<ServiceResult<PlayerStatistics>> {
  return upsertPlayerStatistics({ player_id: playerId });
}

export async function refreshPlayerStatistics(playerId: string): Promise<ServiceResult<PlayerStatistics>> {
  return computeAndSavePlayerStatistics(playerId);
}
