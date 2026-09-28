import { describe, it, expect } from 'vitest';
import {
  evaluateCut,
  cutLabel,
  compareLastDifferingHole,
  stablefordPoints,
  stablefordPointsForHole,
  matchPlayRecord
} from './standingsRules';

import { stablefordPoints as engineStablefordPoints } from './matchFormats';

describe('evaluateCut', () => {
  it('marks a player as DNF regardless of the cut line', () => {
    const result = evaluateCut(30, true, { cutAfterHole: 9, cutLineScore: 36 });
    expect(result).toEqual({ isCut: true, reason: 'dnf' });
    expect(cutLabel(result)).toBe('DNF');
  });

  it('cuts a player above the cut line', () => {
    expect(evaluateCut(37, false, { cutAfterHole: 9, cutLineScore: 36 })).toEqual({
      isCut: true,
      reason: 'cut_line'
    });
  });

  it('keeps a player exactly on the cut line', () => {
    expect(evaluateCut(36, false, { cutAfterHole: 9, cutLineScore: 36 }).isCut).toBe(false);
  });

  it('does not cut anyone when no cut line is configured', () => {
    expect(evaluateCut(200, false, { cutAfterHole: null, cutLineScore: null })).toEqual({
      isCut: false,
      reason: null
    });
  });

  it('does not cut a player who has not reached the cut hole yet', () => {
    expect(evaluateCut(null, false, { cutAfterHole: 9, cutLineScore: 36 }).isCut).toBe(false);
  });

  it('labels a cut-line player as Cut', () => {
    expect(cutLabel({ isCut: true, reason: 'cut_line' })).toBe('Cut');
    expect(cutLabel({ isCut: false, reason: null })).toBeNull();
  });
});

describe('compareLastDifferingHole', () => {
  it('returns null for fully tied cards', () => {
    expect(compareLastDifferingHole([4, 5], [4, 5])).toBeNull();
  });

  it('breaks a tie on the last differing hole', () => {
    expect(compareLastDifferingHole([4, 4, 5], [4, 5, 6])).toBe(-1);
    expect(compareLastDifferingHole([4, 5, 6], [4, 4, 5])).toBe(1);
  });

  it('ignores holes before the last difference', () => {
    expect(compareLastDifferingHole([3, 5, 5, 4], [4, 5, 5, 4])).toBe(-1);
  });

  it('treats an unplayed hole as worse than a played one', () => {
    expect(compareLastDifferingHole([4, null], [4, 5])).toBe(1);
    expect(compareLastDifferingHole([4, 5], [4, null])).toBe(-1);
  });

  it('handles an 18 hole card padded with nulls', () => {
    const card = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5];
    const other = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6];
    expect(compareLastDifferingHole(card, other)).toBe(-1);
  });
});

describe('stablefordPointsForHole', () => {
  it('matches the modified Stableford table used across the app', () => {
    expect(stablefordPointsForHole(2, 5)).toBe(5);
    expect(stablefordPointsForHole(3, 5)).toBe(4);
    expect(stablefordPointsForHole(4, 5)).toBe(3);
    expect(stablefordPointsForHole(5, 5)).toBe(2);
    expect(stablefordPointsForHole(6, 5)).toBe(1);
    expect(stablefordPointsForHole(7, 5)).toBe(0);
    expect(stablefordPointsForHole(10, 5)).toBe(0);
  });

  it('agrees with the shared format engine', () => {
    for (const [strokes, par] of [[2, 5], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [9, 4]] as const) {
      expect(stablefordPointsForHole(strokes, par)).toBe(engineStablefordPoints(strokes, par));
    }
  });
});

describe('stablefordPoints', () => {
  it('totals points across played holes and skips unplayed holes', () => {
    const total = stablefordPoints([
      { strokes: 3, par: 5 },
      { strokes: 5, par: 5 },
      { strokes: 7, par: 5 },
      { strokes: null, par: 4 }
    ]);
    expect(total).toBe(6);
  });

  it('returns zero for an empty card', () => {
    expect(stablefordPoints([])).toBe(0);
  });
});

describe('matchPlayRecord', () => {
  it('counts holes won, lost and tied', () => {
    const record = matchPlayRecord([4, 5, 6], [5, 4, 6]);
    expect(record).toEqual({ holesWon: 1, holesLost: 1, holesTied: 1, margin: 0 });
  });

  it('reports a positive margin for the leader', () => {
    expect(matchPlayRecord([3, 4, 4], [5, 4, 5])).toEqual({
      holesWon: 2,
      holesLost: 0,
      holesTied: 1,
      margin: 2
    });
  });

  it('ignores a hole either player has not played', () => {
    const record = matchPlayRecord([4, null], [null, 4]);
    expect(record).toEqual({ holesWon: 0, holesLost: 0, holesTied: 0, margin: 0 });
  });

  it('still counts holes both players have played', () => {
    expect(matchPlayRecord([4, null], [5, 4]).margin).toBe(1);
  });
});
