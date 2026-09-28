import { describe, it, expect } from 'vitest';
import { calculateSkins } from './skins';
import type { ScorecardHole } from '@/types/database';

function hole(holeNumber: number, strokes: number, par: number = 4): ScorecardHole {
  return {
    id: `hole-${holeNumber}`,
    scorecard_id: 'sc-1',
    hole_number: holeNumber,
    par,
    strokes,
    score_to_par: strokes - par,
    created_at: '',
    updated_at: '',
  };
}

describe('calculateSkins', () => {
  it('returns empty array for single player', () => {
    const playerHoles = new Map<string, ScorecardHole[]>();
    playerHoles.set('p1', [hole(1, 4), hole(2, 3)]);

    const result = calculateSkins(playerHoles);
    expect(result).toEqual([]);
  });

  it('awards skin to lowest unique score on a hole', () => {
    const playerHoles = new Map<string, ScorecardHole[]>();
    playerHoles.set('p1', [hole(1, 4)]);
    playerHoles.set('p2', [hole(1, 5)]);
    playerHoles.set('p3', [hole(1, 6)]);

    const result = calculateSkins(playerHoles);
    expect(result).toHaveLength(1);
    expect(result[0].holeNumber).toBe(1);
    expect(result[0].winnerId).toBe('p1');
    expect(result[0].score).toBe(4);
  });

  it('returns no skin for tied lowest score', () => {
    const playerHoles = new Map<string, ScorecardHole[]>();
    playerHoles.set('p1', [hole(1, 4)]);
    playerHoles.set('p2', [hole(1, 4)]);
    playerHoles.set('p3', [hole(1, 5)]);

    const result = calculateSkins(playerHoles);
    expect(result).toHaveLength(0);
  });

  it('handles multiple holes', () => {
    const playerHoles = new Map<string, ScorecardHole[]>();
    playerHoles.set('p1', [hole(1, 4), hole(2, 3)]);
    playerHoles.set('p2', [hole(1, 5), hole(2, 4)]);
    playerHoles.set('p3', [hole(1, 6), hole(2, 5)]);

    const result = calculateSkins(playerHoles);
    expect(result).toHaveLength(2);
    expect(result[0].holeNumber).toBe(1);
    expect(result[0].winnerId).toBe('p1');
    expect(result[1].holeNumber).toBe(2);
    expect(result[1].winnerId).toBe('p1');
  });

  it('applies stake amount correctly', () => {
    const playerHoles = new Map<string, ScorecardHole[]>();
    playerHoles.set('p1', [hole(1, 3)]);
    playerHoles.set('p2', [hole(1, 4)]);

    const result = calculateSkins(playerHoles, 10);
    expect(result[0].amount).toBe(10);
  });

  it('handles different pars', () => {
    const playerHoles = new Map<string, ScorecardHole[]>();
    playerHoles.set('p1', [hole(1, 3, 3)]);  // birdie on par 3
    playerHoles.set('p2', [hole(1, 4, 3)]);

    const result = calculateSkins(playerHoles);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(3);
    expect(result[0].par).toBe(3);
  });

  it('skips holes where player has no score', () => {
    const playerHoles = new Map<string, ScorecardHole[]>();
    playerHoles.set('p1', [hole(1, 4)]);
    playerHoles.set('p2', [hole(1, 5), hole(2, 4)]);

    const result = calculateSkins(playerHoles);
    expect(result).toHaveLength(1);
    expect(result[0].holeNumber).toBe(1);
  });
});
