/**
 * Tournament Finalization
 *
 * Awards trophies, calculates final standings, and recalculates
 * handicaps when a tournament is completed.
 */

import { supabase } from '@/lib/supabase';
import { evaluateCut } from '@/lib/standingsRules';
import type { ServiceResult } from '@/types/service';

export interface FinalizeResult {
  tournament_id: string;
  trophy_winner_id: string | null;
  trophy_winner_name: string | null;
  total_scorecards: number;
  withdrawn_players: number;
  cut_players: number;
  handicaps_updated: number;
  message: string;
}

/**
 * Finalize a tournament:
 * 1. Read the verified scorecards for every round
 * 2. Determine the winner from each player's total across all rounds (net of handicap)
 * 3. Award the champion trophy
 * 4. Recalculate official handicap indexes from WHS differentials
 *
 * Verification is never bypassed: only verified cards are ranked, and a
 * tournament with unverified cards reports them instead of silently approving.
 */
export async function finalizeTournament(tournamentId: string): Promise<ServiceResult<FinalizeResult>> {
  const { data: rounds, error: roundError } = await supabase
    .from('rounds')
    .select('id, cut_after_hole, cut_line_score')
    .eq('tournament_id', tournamentId);

  if (roundError) return { data: null, error: roundError.message };
  const roundIds = (rounds ?? []).map((r) => r.id as string);
  if (roundIds.length === 0) {
    return { data: null, error: 'No rounds found for this tournament.' };
  }

  const { data: scorecards, error: scError } = await supabase
    .from('scorecards')
    .select('id, round_id, player_id, total_strokes, total_score_to_par, status, dnf, players(id, full_name, handicap_index)')
    .in('round_id', roundIds);

  if (scError) return { data: null, error: scError.message };
  if (!scorecards || scorecards.length === 0) {
    return { data: null, error: 'No scorecards found for this tournament.' };
  }

  const pending = scorecards.filter(card => card.status === 'submitted' || card.status === 'in_progress');
  if (pending.length > 0) {
    return {
      data: null,
      error: `${pending.length} scorecard${pending.length === 1 ? ' is' : 's are'} not verified yet. Verify them before finalizing.`,
    };
  }

  const withdrawn = scorecards.filter(card => card.dnf === true);
  const ranked = scorecards.filter(card => card.status === 'verified' || card.status === 'amended');
  const scored = ranked.filter(card => card.total_strokes != null && card.dnf !== true);

  const cutLines = new Map(
    (rounds ?? []).map((round) => [
      round.id as string,
      {
        cutAfterHole: (round.cut_after_hole as number | null) ?? null,
        cutLineScore: (round.cut_line_score as number | null) ?? null
      }
    ])
  );

  const cardRounds = new Map((scorecards ?? []).map((card) => [card.id as string, card.round_id as string]));

  let cutCount = 0;
  const cutCardIds = new Set<string>();
  const roundsWithCut = [...cutLines.values()].filter(
    (line) => line.cutAfterHole != null && line.cutLineScore != null
  );

  if (roundsWithCut.length > 0) {
    const { data: cutHoles } = await supabase
      .from('scorecard_holes')
      .select('scorecard_id, hole_number, strokes')
      .in('scorecard_id', scored.map((card) => card.id as string));

    const frontSums = new Map<string, number>();
    for (const hole of (cutHoles ?? []) as Array<{ scorecard_id: string; hole_number: number; strokes: number | null }>) {
      if (hole.strokes == null) continue;
      const line = cutLines.get(cardRounds.get(hole.scorecard_id) ?? '');
      if (!line || line.cutAfterHole == null) continue;
      if (hole.hole_number > line.cutAfterHole) continue;
      frontSums.set(hole.scorecard_id, (frontSums.get(hole.scorecard_id) ?? 0) + hole.strokes);
    }

    for (const card of scored) {
      const line = cutLines.get(cardRounds.get(card.id as string) ?? '');
      if (!line || line.cutAfterHole == null || line.cutLineScore == null) continue;
      const front = frontSums.get(card.id as string) ?? null;
      const evaluation = evaluateCut(front, false, line);
      if (evaluation.isCut) {
        cutCardIds.add(card.id as string);
      }
    }
    cutCount = cutCardIds.size;
  }

  const played = scored.filter(card => !cutCardIds.has(card.id as string));

  if (played.length === 0) {
    return { data: null, error: 'No verified scorecards with scores to finalize.' };
  }

  const totals = new Map<string, { gross: number; toPar: number; roundsPlayed: number; name: string; handicap: number }>();

  for (const card of played) {
    const player = card.players as unknown as { id: string; full_name: string; handicap_index: number | null } | null;
    const playerId = card.player_id as string;
    const gross = card.total_strokes ?? 0;
    const toPar = card.total_score_to_par ?? 0;
    const existing = totals.get(playerId);

    if (existing) {
      existing.gross += gross;
      existing.toPar += toPar;
      existing.roundsPlayed += 1;
    } else {
      totals.set(playerId, {
        gross,
        toPar,
        roundsPlayed: 1,
        name: player?.full_name ?? 'Unknown player',
        handicap: Number(player?.handicap_index ?? 0),
      });
    }
  }

  const standings = [...totals.entries()]
    .map(([playerId, value]) => ({
      playerId,
      name: value.name,
      gross: value.gross,
      roundsPlayed: value.roundsPlayed,
      net: value.gross - Math.max(0, Math.round(value.handicap * value.roundsPlayed)),
    }))
    .sort((a, b) => a.net - b.net || a.gross - b.gross);

  const top = standings[0];
  const winner = top && standings[1] && top.net === standings[1].net && top.gross === standings[1].gross ? null : top ?? null;

  if (winner) {
    const { error: trophyError } = await supabase
      .from('tournament_trophies')
      .upsert({
        tournament_id: tournamentId,
        player_id: winner.playerId,
        trophy_type: 'champion',
        awarded_at: new Date().toISOString(),
      }, { onConflict: 'tournament_id,trophy_type' });
    if (trophyError) return { data: null, error: trophyError.message };
  }

  const playerIds = [...totals.keys()];
  let handicapsUpdated = 0;

  for (const playerId of playerIds) {
    const { data: differentials, error: diffError } = await supabase
      .from('score_differentials')
      .select('differential')
      .eq('player_id', playerId)
      .order('calculated_at', { ascending: false })
      .limit(20);

    if (diffError) return { data: null, error: diffError.message };
    const values = (differentials ?? [])
      .map(row => Number(row.differential))
      .filter(value => Number.isFinite(value));
    if (values.length < 3) continue;

    const best = [...values].sort((a, b) => a - b).slice(0, 8);
    const average = best.reduce((sum, value) => sum + value, 0) / best.length;
    const index = Math.max(0, Math.min(54, Math.round(average * 0.96 * 10) / 10));

    const { error: updateError } = await supabase
      .from('players')
      .update({ handicap_index: index, updated_at: new Date().toISOString() })
      .eq('id', playerId);
    if (updateError) return { data: null, error: updateError.message };

    handicapsUpdated++;
  }

  const { error: statusError } = await supabase
    .from('tournaments')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', tournamentId);
  if (statusError) return { data: null, error: statusError.message };

  const tieNote = winner ? '' : ' The top two players are tied on net and gross, so no champion trophy was awarded.';

  return {
    data: {
      tournament_id: tournamentId,
      trophy_winner_id: winner?.playerId ?? null,
      trophy_winner_name: winner?.name ?? null,
      total_scorecards: scorecards.length,
      withdrawn_players: withdrawn.length,
      cut_players: cutCount,
      handicaps_updated: handicapsUpdated,
      message: winner
        ? `Tournament finalized. ${winner.name} wins with ${winner.gross} strokes (net ${winner.net}).${withdrawn.length > 0 ? ` ${withdrawn.length} withdrawn scorecard${withdrawn.length === 1 ? '' : 's'} excluded.` : ''} ${handicapsUpdated} handicaps updated.${tieNote}`
        : `Tournament finalized. No champion trophy awarded.${withdrawn.length > 0 ? ` ${withdrawn.length} withdrawn scorecard${withdrawn.length === 1 ? '' : 's'} excluded.` : ''}${tieNote}`,
    },
    error: null,
  };
}
