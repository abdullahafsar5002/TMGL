import { describe, it, expect } from 'vitest';
import {
  buildPairsFromPairings,
  buildScrambleGroups,
  bestScoreForHole,
  computeBestBall,
  computeMatchPlay,
  computeNassau,
  rankBestBall,
  rankMatchPlay,
  rankNassau,
  resolveFormatUnits,
  summarisePair,
  type FormatPlayerScore,
  type FormatUnit
} from './tournamentFormats';

const pars: Record<number, number> = Object.fromEntries(
  Array.from({ length: 18 }, (_, i) => [i + 1, 4])
);

function unit(id: string, ...playerIds: string[]): FormatUnit {
  return {
    id,
    label: playerIds.join(' / '),
    playerIds,
    playerNames: playerIds.map((p) => p.toUpperCase()),
    handicapAllowance: 0
  };
}

function score(playerId: string, holeNumber: number, strokes: number): FormatPlayerScore {
  return { playerId, playerName: playerId, handicapIndex: 0, holeNumber, strokes, par: 4 };
}

function fullRound(playerId: string, strokesFor: (hole: number) => number): FormatPlayerScore[] {
  return Array.from({ length: 18 }, (_, i) => score(playerId, i + 1, strokesFor(i + 1)));
}

describe('bestScoreForHole', () => {
  const team = unit('pair-1', 'a', 'b');

  it('takes the lowest score inside the unit', () => {
    expect(bestScoreForHole([{ playerId: 'a', strokes: 5 }, { playerId: 'b', strokes: 4 }], team)).toBe(4);
  });

  it('ignores players outside the unit', () => {
    expect(bestScoreForHole([{ playerId: 'c', strokes: 3 }, { playerId: 'a', strokes: 5 }], team)).toBe(5);
  });

  it('returns null when nobody in the unit has played', () => {
    expect(bestScoreForHole([{ playerId: 'c', strokes: 3 }], team)).toBeNull();
  });
});

describe('summarisePair', () => {
  it('counts one hole per unit, using the best score', () => {
    const team = unit('pair-1', 'a', 'b');
    const scores = [...fullRound('a', () => 5), ...fullRound('b', () => 4)];
    const summary = summarisePair(team, scores, pars);
    expect(summary.holesPlayed).toBe(18);
    expect(summary.strokesToPar).toBe(0);
    expect(summary.holes[0].bestScore).toBe(4);
  });

  it('marks holes nobody played as unplayed', () => {
    const team = unit('pair-1', 'a', 'b');
    const summary = summarisePair(team, [score('a', 1, 4), score('b', 2, 3)], pars);
    expect(summary.holesPlayed).toBe(2);
    expect(summary.holes[1].bestScore).toBe(3);
    expect(summary.holes[2].bestScore).toBeNull();
    expect(summary.holes[2].toPar).toBeNull();
  });

  it('subtracts the handicap allowance proportionally before the cut', () => {
    const team = { ...unit('pair-1', 'a', 'b'), handicapAllowance: 18 };
    const scores = [...fullRound('a', () => 4), ...fullRound('b', () => 4)];
    expect(summarisePair(team, scores, pars).netToPar).toBe(-18);
  });

  it('prorates the allowance for a partial round', () => {
    const team = { ...unit('pair-1', 'a', 'b'), handicapAllowance: 18 };
    const scores = Array.from({ length: 9 }, (_, i) => score('a', i + 1, 4));
    expect(summarisePair(team, scores, pars).netToPar).toBe(-9);
  });
});

describe('computeMatchPlay', () => {
  it('wins a hole on the lower pair score', () => {
    const a = unit('pair-1', 'a1', 'a2');
    const b = unit('pair-2', 'b1', 'b2');
    const scores = [
      ...fullRound('a1', () => 3),
      ...fullRound('a2', () => 3),
      ...fullRound('b1', () => 4),
      ...fullRound('b2', () => 4)
    ];
    const results = computeMatchPlay([a, b], scores, pars);
    expect(results[0].holesWon).toBe(18);
    expect(results[0].holesLost).toBe(0);
    expect(results[0].margin).toBe(18);
    expect(results[1].holesLost).toBe(18);
  });

  it('pairs pairs one and two, never across matches', () => {
    const a = unit('pair-1', 'a1', 'a2');
    const b = unit('pair-2', 'b1', 'b2');
    const c = unit('pair-3', 'c1', 'c2');
    const results = computeMatchPlay([a, b, c], fullRound('c1', () => 2), pars);
    const c1 = results.find((r) => r.unit.id === 'pair-3')!;
    expect(c1.holesWon + c1.holesLost + c1.holesTied).toBe(0);
  });

  it('splits holes that neither pair can compare', () => {
    const a = unit('pair-1', 'a1', 'a2');
    const b = unit('pair-2', 'b1', 'b2');
    const results = computeMatchPlay([a, b], [score('a1', 1, 4)], pars);
    const a1 = results.find((r) => r.unit.id === 'pair-1')!;
    expect(a1.holesWon).toBe(0);
    expect(a1.holesLost).toBe(0);
  });
});

describe('computeNassau', () => {
  it('splits front nine, back nine and total', () => {
    const a = unit('pair-1', 'a1', 'a2');
    const scores = [
      ...Array.from({ length: 9 }, (_, i) => score('a1', i + 1, 4)),
      ...Array.from({ length: 9 }, (_, i) => score('a1', i + 10, 5))
    ];
    const result = computeNassau([a], scores, pars)[0];
    expect(result.frontNine).toBe(0);
    expect(result.backNine).toBe(9);
    expect(result.total).toBe(9);
  });

  it('returns null segments when a nine has not been played', () => {
    const a = unit('pair-1', 'a1', 'a2');
    const result = computeNassau([a], Array.from({ length: 9 }, (_, i) => score('a1', i + 1, 4)), pars)[0];
    expect(result.frontNine).toBe(0);
    expect(result.backNine).toBeNull();
    expect(result.total).toBeNull();
  });
});

describe('computeBestBall', () => {
  it('counts only the best score on each hole', () => {
    const team = unit('group-1', 'a', 'b');
    const scores = [
      ...fullRound('a', (h) => (h <= 9 ? 4 : 6)),
      ...fullRound('b', (h) => (h <= 9 ? 3 : 4))
    ];
    const result = computeBestBall([team], scores, pars)[0];
    expect(result.eachHoleCounted).toBe(18);
    expect(result.totalStrokes).toBe(9 * 3 + 9 * 4);
    expect(result.totalToPar).toBe(-9);
  });

  it('uses the group average handicap as the allowance', () => {
    const team = { ...unit('group-1', 'a', 'b'), handicapAllowance: 15 };
    const scores = [...fullRound('a', () => 4), ...fullRound('b', () => 4)];
    expect(computeBestBall([team], scores, pars)[0].netToPar).toBe(-15);
  });
});

describe('buildPairsFromPairings', () => {
  const members = [
    { playerId: 'a', playerName: 'A', handicapIndex: 2, pairingNo: 1, flightId: 'f1' },
    { playerId: 'b', playerName: 'B', handicapIndex: 6, pairingNo: 2, flightId: 'f1' },
    { playerId: 'c', playerName: 'C', handicapIndex: 8, pairingNo: 3, flightId: 'f1' },
    { playerId: 'd', playerName: 'D', handicapIndex: 10, pairingNo: 4, flightId: 'f1' }
  ];

  it('groups consecutive pairing numbers into pairs', () => {
    const pairs = buildPairsFromPairings(members);
    expect(pairs.length).toBe(2);
    expect(pairs[0].playerIds).toEqual(['a', 'b']);
    expect(pairs[1].playerIds).toEqual(['c', 'd']);
  });

  it('keeps separate flights apart', () => {
    const pairs = buildPairsFromPairings([
      ...members,
      { playerId: 'e', playerName: 'E', handicapIndex: 12, pairingNo: 1, flightId: 'f2' },
      { playerId: 'f', playerName: 'F', handicapIndex: 14, pairingNo: 2, flightId: 'f2' }
    ]);
    expect(pairs.length).toBe(3);
    expect(pairs[2].playerIds).toEqual(['e', 'f']);
  });

  it('drops a lone pairing number with no partner', () => {
    const pairs = buildPairsFromPairings([members[0]]);
    expect(pairs.length).toBe(0);
  });

  it('numbers pairs in sequence so neighbouring pairs form a match', () => {
    const pairs = buildPairsFromPairings(members);
    expect(pairs.map((p) => p.id)).toEqual(['pair-1', 'pair-2']);
  });

  it('lets the first two derived pairs play each other in match play', () => {
    const eight = Array.from({ length: 8 }, (_, i) => ({
      playerId: `p${i + 1}`,
      playerName: `P${i + 1}`,
      handicapIndex: 8,
      pairingNo: i + 1,
      flightId: 'f1'
    }));
    const pairs = buildPairsFromPairings(eight);
    expect(pairs.map((p) => p.id)).toEqual(['pair-1', 'pair-2', 'pair-3', 'pair-4']);

    const scores = [
      ...fullRound('p1', () => 3),
      ...fullRound('p3', () => 4),
      ...fullRound('p5', () => 3),
      ...fullRound('p7', () => 4)
    ];
    const results = computeMatchPlay(pairs, scores, pars);
    const first = results.find((r) => r.unit.id === 'pair-1')!;
    const second = results.find((r) => r.unit.id === 'pair-2')!;
    expect(first.holesWon).toBe(18);
    expect(second.holesLost).toBe(18);
    expect(rankMatchPlay(results).rows[0].unitId).toBe('pair-1');
  });

  it('averages the two handicaps as the pair allowance', () => {
    expect(buildPairsFromPairings(members)[0].handicapAllowance).toBe(4);
  });
});

describe('buildScrambleGroups', () => {
  const members = Array.from({ length: 9 }, (_, i) => ({
    playerId: `p${i}`,
    playerName: `P${i}`,
    handicapIndex: i * 2
  }));

  it('splits the field into groups of four', () => {
    const groups = buildScrambleGroups(members);
    expect(groups.length).toBe(2);
    expect(groups[0].playerIds.length).toBe(4);
    expect(groups[1].playerIds.length).toBe(4);
  });

  it('ignores a trailing player who cannot form a group', () => {
    expect(buildScrambleGroups(members)[1].playerIds).not.toContain('p8');
  });

  it('builds two player teams for best ball', () => {
    const teams = buildScrambleGroups(members, 2);
    expect(teams.length).toBe(4);
    expect(teams[0].playerIds).toEqual(['p0', 'p1']);
  });
});

describe('resolveFormatUnits', () => {
  const members = [
    { playerId: 'a', playerName: 'A', handicapIndex: 2, pairingNo: 1 },
    { playerId: 'b', playerName: 'B', handicapIndex: 6, pairingNo: 2 },
    { playerId: 'c', playerName: 'C', handicapIndex: 8, pairingNo: 3 },
    { playerId: 'd', playerName: 'D', handicapIndex: 10, pairingNo: 4 }
  ];

  it('uses pairs for match play and nassau', () => {
    expect(resolveFormatUnits('match_play', members).length).toBe(2);
    expect(resolveFormatUnits('nassau', members).length).toBe(2);
  });

  it('uses groups for best ball and scramble', () => {
    expect(resolveFormatUnits('best_ball', members).length).toBe(2);
    expect(resolveFormatUnits('scramble', members).length).toBe(1);
  });
});

describe('ranking', () => {
  it('ranks match play by holes up and shares ties', () => {
    const a = unit('pair-1', 'a1', 'a2');
    const b = unit('pair-2', 'b1', 'b2');
    const c = unit('pair-3', 'c1', 'c2');
    const d = unit('pair-4', 'd1', 'd2');
    const scores = [
      ...fullRound('a1', () => 4),
      ...fullRound('b1', () => 4),
      ...fullRound('c1', () => 5),
      ...fullRound('d1', () => 3)
    ];
    const ranked = rankMatchPlay(computeMatchPlay([a, b, c, d], scores, pars));
    const byId = new Map(ranked.rows.map((r) => [r.unitId, r]));
    expect(byId.get('pair-4')!.position).toBe(1);
    expect(byId.get('pair-1')!.position).toBe(2);
    expect(byId.get('pair-2')!.position).toBe(2);
    expect(byId.get('pair-3')!.position).toBe(4);
    expect(byId.get('pair-1')!.displayValue).toBe('All square');
    expect(byId.get('pair-4')!.displayValue).toBe('18 up');
  });

  it('ranks nassau with the lower value winning', () => {
    const a = { ...unit('pair-1', 'a1', 'a2'), handicapAllowance: 0 };
    const b = { ...unit('pair-2', 'b1', 'b2'), handicapAllowance: 0 };
    const scores = [...fullRound('a1', () => 3), ...fullRound('b1', () => 6)];
    const ranked = rankNassau(computeNassau([a, b], scores, pars));
    expect(ranked.rows[0].unitId).toBe('pair-1');
    expect(ranked.rows[0].netToPar).toBeLessThan(ranked.rows[1].netToPar!);
  });

  it('removes cut units from best ball standings and reports the skip', () => {
    const a = unit('group-1', 'a', 'b');
    const b = unit('group-2', 'c', 'd');
    const scores = [...fullRound('a', () => 4), ...fullRound('c', () => 6)];
    const ranked = rankBestBall(computeBestBall([a, b], scores, pars), new Set(['group-1']));
    expect(ranked.skipped).toBe(1);
    expect(ranked.rows.length).toBe(1);
    expect(ranked.rows[0].unitId).toBe('group-2');
  });

  it('numbers best ball positions by competition ranking', () => {
    const results = [
      { unit: unit('group-1', 'a'), totalStrokes: 70, totalToPar: -2, netToPar: -2, holesPlayed: 18, eachHoleCounted: 18 },
      { unit: unit('group-2', 'b'), totalStrokes: 72, totalToPar: 0, netToPar: 0, holesPlayed: 18, eachHoleCounted: 18 },
      { unit: unit('group-3', 'c'), totalStrokes: 72, totalToPar: 0, netToPar: 0, holesPlayed: 18, eachHoleCounted: 18 }
    ];
    const ranked = rankBestBall(results);
    expect(ranked.rows.map((r) => r.position)).toEqual([1, 2, 2]);
  });
});