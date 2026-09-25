/**
 * Tournament Finalization
 *
 * Awards trophies, calculates final standings, and recalculates
 * handicaps when a tournament is completed.
 */

import { supabase } from '@/lib/supabase';
import { aggregateStandingsByPlayer, selectChampion } from '@/lib/scorecardEligibility';
import type { ServiceResult } from '@/types/service';

export interface FinalizeResult {
  tournament_id: string;
  trophy_winner_id: string | null;
  trophy_winner_name: string | null;
  total_scorecards: number;
  handicaps_updated: number;
  message: string;
}

export async function finalizeTournament(tournamentId: string): Promise<ServiceResult<FinalizeResult>> {
  const { data: rounds, error: roundError } = await supabase
    .from('rounds')
    .select('id')
    .eq('tournament_id', tournamentId);

  if (roundError) return { data: null, error: roundError.message };
  const roundIds = (rounds ?? []).map((r) => r.id as string);
  if (roundIds.length === 0) {
    return { data: null, error: 'No rounds found for this tournament.' };
  }

  const { data: scorecards, error: scError } = await supabase
    .from('scorecards')
    .select('id, round_id, player_id, total_strokes, total_score_to_par, status')
    .in('round_id', roundIds);

  if (scError) return { data: null, error: scError.message };
  if (!scorecards || scorecards.length === 0) {
    return { data: null, error: 'No scorecards found for this tournament.' };
  }

  const pendingIds = scorecards
    .filter((sc) => sc.status === 'submitted')
    .map((sc) => sc.id as string);

  if (pendingIds.length > 0) {
    const { error: verifyError } = await supabase
      .from('scorecards')
      .update({ status: 'verified', updated_at: new Date().toISOString() })
      .in('id', pendingIds)
      .select('id');

    if (verifyError) {
      return { data: null, error: `Scorecard verification failed: ${verifyError.message}` };
    }

    for (const sc of scorecards) {
      if (sc.status === 'submitted') sc.status = 'verified';
    }
  }

  const standings = aggregateStandingsByPlayer(scorecards, { requiredRounds: roundIds.length });
  const champion = selectChampion(standings);

  if (champion) {
    const { error: trophyError } = await supabase
      .from('tournament_trophies')
      .upsert(
        {
          tournament_id: tournamentId,
          player_id: champion.player_id,
          trophy_type: 'champion',
          awarded_at: new Date().toISOString(),
        },
        { onConflict: 'tournament_id,trophy_type' }
      );

    if (trophyError) {
      return { data: null, error: `Trophy award failed: ${trophyError.message}` };
    }
  }

  let winnerName: string | null = null;
  if (champion) {
    const { data: player } = await supabase
      .from('players')
      .select('full_name')
      .eq('id', champion.player_id)
      .single();
    winnerName = player?.full_name ?? null;
  }

  const playerIds = [...new Set(standings.map((s) => s.player_id))];
  let handicapsUpdated = 0;

  for (const playerId of playerIds) {
    const { data: allCards, error: cardsError } = await supabase
      .from('scorecards')
      .select('total_strokes, total_score_to_par')
      .eq('player_id', playerId)
      .eq('status', 'verified')
      .not('total_strokes', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (cardsError) return { data: null, error: cardsError.message };
    if (!allCards || allCards.length < 3) continue;

    const differentials = allCards
      .map((c) => c.total_score_to_par)
      .filter((d): d is number => d != null)
      .sort((a, b) => a - b);

    const count = Math.min(differentials.length, 8);
    if (count === 0) continue;

    const avg = differentials.slice(0, count).reduce((a, b) => a + b, 0) / count;
    const newHandicap = parseFloat(avg.toFixed(1));

    const { error: playerUpdateError } = await supabase
      .from('players')
      .update({ handicap_index: newHandicap, updated_at: new Date().toISOString() })
      .eq('id', playerId);

    if (playerUpdateError) {
      return { data: null, error: `Handicap update failed: ${playerUpdateError.message}` };
    }

    handicapsUpdated++;
  }

  const { error: tournamentUpdateError } = await supabase
    .from('tournaments')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', tournamentId);

  if (tournamentUpdateError) {
    return { data: null, error: tournamentUpdateError.message };
  }

  return {
    data: {
      tournament_id: tournamentId,
      trophy_winner_id: champion?.player_id ?? null,
      trophy_winner_name: winnerName,
      total_scorecards: scorecards.length,
      handicaps_updated: handicapsUpdated,
      message: champion
        ? `Tournament finalized. ${winnerName ?? champion.player_id} wins with ${champion.total_strokes} strokes across ${champion.rounds_played} round(s). ${handicapsUpdated} handicaps updated.`
        : 'Tournament finalized. No eligible scorecards to determine a winner.',
    },
    error: null,
  };
}
