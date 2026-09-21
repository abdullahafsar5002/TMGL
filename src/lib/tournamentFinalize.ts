/**
 * Tournament Finalization
 *
 * Awards trophies, calculates final standings, and recalculates
 * handicaps when a tournament is completed.
 */

import { supabase } from '@/lib/supabase';
import type { ServiceResult } from '@/types/service';

export interface FinalizeResult {
  tournament_id: string;
  trophy_winner_id: string | null;
  trophy_winner_name: string | null;
  total_scorecards: number;
  handicaps_updated: number;
  message: string;
}

/**
 * Finalize a tournament:
 * 1. Lock all scorecards (set status to 'verified' if still 'submitted')
 * 2. Determine the winner (lowest total strokes)
 * 3. Award trophy
 * 4. Recalculate handicaps for all participants
 */
export async function finalizeTournament(tournamentId: string): Promise<ServiceResult<FinalizeResult>> {
  // 1. Get round IDs for this tournament
  const { data: rounds, error: roundError } = await supabase
    .from('rounds')
    .select('id')
    .eq('tournament_id', tournamentId);

  if (roundError) return { data: null, error: roundError.message };
  const roundIds = (rounds ?? []).map(r => r.id);
  if (roundIds.length === 0) {
    return { data: null, error: 'No rounds found for this tournament.' };
  }

  // 2. Get all scorecards for these rounds
  const { data: scorecards, error: scError } = await supabase
    .from('scorecards')
    .select('id, player_id, total_strokes, status')
    .in('round_id', roundIds)
    .order('total_strokes', { ascending: true });

  if (scError) return { data: null, error: scError.message };
  if (!scorecards || scorecards.length === 0) {
    return { data: null, error: 'No scorecards found for this tournament.' };
  }

  // 3. Auto-verify any submitted scorecards
  const submittedIds = scorecards
    .filter(sc => sc.status === 'submitted' || sc.status === 'in_progress')
    .map(sc => sc.id);

  if (submittedIds.length > 0) {
    await supabase
      .from('scorecards')
      .update({ status: 'verified', updated_at: new Date().toISOString() })
      .in('id', submittedIds);
  }

  // 4. Determine winner (lowest strokes, skip nulls)
  const validScorecards = scorecards
    .filter(sc => sc.total_strokes != null)
    .sort((a, b) => (a.total_strokes ?? Infinity) - (b.total_strokes ?? Infinity));

  const winner = validScorecards[0] ?? null;

  // 5. Award trophy if winner exists
  if (winner) {
    // Upsert a trophy record
    await supabase
      .from('tournament_trophies')
      .upsert({
        tournament_id: tournamentId,
        player_id: winner.player_id,
        trophy_type: 'champion',
        awarded_at: new Date().toISOString(),
      }, { onConflict: 'tournament_id,trophy_type' });
  }

  // 6. Get winner name
  let winnerName: string | null = null;
  if (winner) {
    const { data: player } = await supabase
      .from('players')
      .select('full_name')
      .eq('id', winner.player_id)
      .single();
    winnerName = player?.full_name ?? null;
  }

  // 7. Recalculate handicaps for all participants
  const playerIds = [...new Set(scorecards.map(sc => sc.player_id))];
  let handicapsUpdated = 0;

  for (const playerId of playerIds) {
    const { data: allCards } = await supabase
      .from('scorecards')
      .select('total_strokes, total_score_to_par')
      .eq('player_id', playerId)
      .eq('status', 'verified')
      .not('total_strokes', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (!allCards || allCards.length < 3) continue;

    // Simple handicap: average of best 8 differentials (or fewer)
    const differentials = allCards
      .map(c => c.total_score_to_par)
      .filter((d): d is number => d != null)
      .sort((a, b) => a - b);

    const count = Math.min(differentials.length, 8);
    if (count === 0) continue;

    const avg = differentials.slice(0, count).reduce((a, b) => a + b, 0) / count;
    const newHandicap = parseFloat(avg.toFixed(1));

    await supabase
      .from('players')
      .update({ handicap_index: newHandicap, updated_at: new Date().toISOString() })
      .eq('id', playerId);

    handicapsUpdated++;
  }

  // 8. Mark tournament as completed
  await supabase
    .from('tournaments')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', tournamentId);

  return {
    data: {
      tournament_id: tournamentId,
      trophy_winner_id: winner?.player_id ?? null,
      trophy_winner_name: winnerName,
      total_scorecards: scorecards.length,
      handicaps_updated: handicapsUpdated,
      message: winner
        ? `Tournament finalized. ${winnerName} wins with ${winner.total_strokes} strokes. ${handicapsUpdated} handicaps updated.`
        : 'Tournament finalized. No valid scorecards to determine a winner.',
    },
    error: null,
  };
}
