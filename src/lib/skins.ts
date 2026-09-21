/**
 * Live Skins Notification System
 *
 * Monitors scorecard submissions and sends push notifications
 * when a skin is won during tournament play.
 */

import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';
import type { ScorecardHole } from '@/types/database';

export interface SkinResult {
  holeNumber: number;
  winnerId: string;
  winnerName: string;
  score: number;
  par: number;
  amount: number;
}

/**
 * Calculate skins for a completed round's holes.
 * A skin is won by the player with the lowest unique score on a hole.
 */
export function calculateSkins(
  allPlayerHoles: Map<string, ScorecardHole[]>,
  stakeAmount: number = 1
): SkinResult[] {
  const maxHoles = Math.max(...[...allPlayerHoles.values()].map(h => h.length));
  const skins: SkinResult[] = [];

  for (let holeNum = 1; holeNum <= maxHoles; holeNum++) {
    const scoresOnHole: { playerId: string; holes: ScorecardHole[] }[] = [];

    allPlayerHoles.forEach((holes, playerId) => {
      const hole = holes.find(h => h.hole_number === holeNum);
      if (hole) scoresOnHole.push({ playerId, holes: [hole] });
    });

    if (scoresOnHole.length < 2) continue;

    const scoreValues = scoresOnHole.map(s => s.holes[0].strokes);
    const minScore = Math.min(...scoreValues);
    const countOfMin = scoreValues.filter(v => v === minScore).length;

    if (countOfMin === 1) {
      const winner = scoresOnHole.find(s => s.holes[0].strokes === minScore)!;
      const hole = winner.holes[0];
      skins.push({
        holeNumber: holeNum,
        winnerId: winner.playerId,
        winnerName: '',
        score: hole.strokes,
        par: hole.par,
        amount: stakeAmount,
      });
    }
  }

  return skins;
}

/**
 * Process a scorecard submission and send skin notifications.
 */
export async function processSkinsForScorecard(
  scorecardId: string,
  roundId: string,
  playerId: string,
  playerName: string
): Promise<void> {
  // Get all scorecards for this round
  const { data: scorecards } = await supabase
    .from('scorecards')
    .select('id, player_id')
    .eq('round_id', roundId)
    .in('status', ['submitted', 'verified']);

  if (!scorecards || scorecards.length < 2) return;

  // Get all holes for all scorecards
  const allPlayerHoles = new Map<string, ScorecardHole[]>();

  for (const sc of scorecards) {
    const { data: holes } = await supabase
      .from('scorecard_holes')
      .select('*')
      .eq('scorecard_id', sc.id);

    if (holes && holes.length > 0) {
      allPlayerHoles.set(sc.player_id, holes as ScorecardHole[]);
    }
  }

  // Get player names for the skin winners
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name');

  const nameMap = new Map<string, string>();
  (profiles ?? []).forEach((p: { id: string; full_name: string | null }) => {
    nameMap.set(p.id, p.full_name ?? 'Unknown');
  });

  const skins = calculateSkins(allPlayerHoles);

  // Send notifications for skins won by the submitting player
  for (const skin of skins) {
    if (skin.winnerId === playerId) {
      skin.winnerName = nameMap.get(skin.winnerId) ?? playerName;

      await createNotification({
        recipient_id: playerId,
        type: 'skin_won',
        title: `Hole ${skin.holeNumber} Skin Won!`,
        message: `You won the skin on Hole ${skin.holeNumber} with a ${skin.score} (${skin.score === skin.par ? 'Par' : skin.score < skin.par ? `${skin.score - skin.par} under` : `${skin.score - skin.par} over`})!`,
        related_entity: 'scorecard',
        related_id: scorecardId,
      });
    }
  }
}

/**
 * Listen for real-time scorecard changes and trigger skin notifications.
 * Call this once when the scoring page mounts.
 */
export function subscribeToSkins(
  roundId: string,
  _onSkinWon: (skin: SkinResult) => void
) {
  const channel = supabase
    .channel(`skins:${roundId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scorecards',
        filter: `round_id=eq.${roundId}`,
      },
      async (payload) => {
        const sc = payload.new as { id: string; player_id: string; status: string };
        if (sc.status === 'submitted' || sc.status === 'verified') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', sc.player_id)
            .maybeSingle();

          await processSkinsForScorecard(
            sc.id,
            roundId,
            sc.player_id,
            (profile as { full_name: string | null })?.full_name ?? 'Player'
          );
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
