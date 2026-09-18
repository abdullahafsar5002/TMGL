import { describe, it, expect } from 'vitest';
import { calculatePracticeStatistics } from './statistics';
import type { PracticeScore } from '@/types/database';

function makeScore(overrides: Partial<PracticeScore> = {}): PracticeScore {
  return {
    id: 'test-id',
    practice_round_id: 'round-id',
    hole_number: 1,
    par: 4,
    stroke_index: null,
    score: 4,
    putts: null,
    fairway_hit: null,
    green_in_regulation: null,
    penalty_strokes: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('calculatePracticeStatistics', () => {
  it('counts eagles, birdies, pars, bogeys, double bogeys', () => {
    const scores = [
      makeScore({ par: 4, score: 2 }), // eagle (-2)
      makeScore({ par: 4, score: 3, hole_number: 2 }), // birdie (-1)
      makeScore({ par: 4, score: 4, hole_number: 3 }), // par
      makeScore({ par: 4, score: 5, hole_number: 4 }), // bogey
      makeScore({ par: 4, score: 6, hole_number: 5 }), // double bogey
    ];

    const result = calculatePracticeStatistics(scores, 20, 20);
    expect(result.eagles).toBe(1);
    expect(result.birdies).toBe(1);
    expect(result.pars).toBe(1);
    expect(result.bogeys).toBe(1);
    expect(result.doubleBogeys).toBe(1);
  });

  it('does not count eagles as birdies', () => {
    const scores = [
      makeScore({ par: 5, score: 3 }), // eagle (-2)
      makeScore({ par: 4, score: 3, hole_number: 2 }), // birdie (-1)
    ];
    const result = calculatePracticeStatistics(scores, 8, 9);
    expect(result.eagles).toBe(1);
    expect(result.birdies).toBe(1);
  });

  it('calculates average putts', () => {
    const scores = [
      makeScore({ putts: 2 }),
      makeScore({ putts: 3, hole_number: 2 }),
      makeScore({ putts: 1, hole_number: 3 }),
    ];

    const result = calculatePracticeStatistics(scores, 12, 12);
    expect(result.averagePutts).toBe(2);
  });

  it('returns null average putts when no putts recorded', () => {
    const scores = [
      makeScore({ putts: null }),
    ];

    const result = calculatePracticeStatistics(scores, 4, 4);
    expect(result.averagePutts).toBeNull();
  });

  it('calculates fairway percentage', () => {
    const scores = [
      makeScore({ fairway_hit: true }),
      makeScore({ fairway_hit: false, hole_number: 2 }),
      makeScore({ fairway_hit: true, hole_number: 3 }),
    ];

    const result = calculatePracticeStatistics(scores, 12, 12);
    expect(result.fairwaysHitPercentage).toBeCloseTo(66.67, 0);
  });

  it('calculates GIR percentage', () => {
    const scores = [
      makeScore({ green_in_regulation: true }),
      makeScore({ green_in_regulation: true, hole_number: 2 }),
      makeScore({ green_in_regulation: false, hole_number: 3 }),
      makeScore({ green_in_regulation: true, hole_number: 4 }),
    ];

    const result = calculatePracticeStatistics(scores, 16, 16);
    expect(result.girPercentage).toBe(75);
  });

  it('returns null percentages when no data', () => {
    const scores = [
      makeScore({ fairway_hit: null, green_in_regulation: null, putts: null }),
    ];

    const result = calculatePracticeStatistics(scores, 4, 4);
    expect(result.fairwaysHitPercentage).toBeNull();
    expect(result.girPercentage).toBeNull();
    expect(result.averagePutts).toBeNull();
  });
});
