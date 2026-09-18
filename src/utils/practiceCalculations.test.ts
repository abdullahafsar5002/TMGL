import { describe, it, expect } from 'vitest';
import {
  calculateHoleToPar,
  calculateGrossScore,
  calculateTotalPar,
  calculateToPar,
  formatToPar,
  calculateNineHoleSplits,
  getScoreTerminology,
  calculatePracticeScoreSummary,
  type HoleScoreInput,
} from './practiceCalculations';

function makeHole(overrides: Partial<HoleScoreInput> = {}): HoleScoreInput {
  return {
    hole_number: 1,
    par: 4,
    score: 4,
    ...overrides,
  };
}

describe('calculateHoleToPar', () => {
  it('returns 0 for par', () => {
    expect(calculateHoleToPar(4, 4)).toBe(0);
  });

  it('returns negative for under par', () => {
    expect(calculateHoleToPar(3, 4)).toBe(-1);
    expect(calculateHoleToPar(2, 4)).toBe(-2);
  });

  it('returns positive for over par', () => {
    expect(calculateHoleToPar(5, 4)).toBe(1);
    expect(calculateHoleToPar(6, 4)).toBe(2);
  });
});

describe('calculateGrossScore', () => {
  it('sums all strokes', () => {
    const scores: HoleScoreInput[] = [
      makeHole({ hole_number: 1, score: 4 }),
      makeHole({ hole_number: 2, score: 5 }),
      makeHole({ hole_number: 3, score: 3 }),
    ];
    expect(calculateGrossScore(scores)).toBe(12);
  });

  it('returns 0 for empty array', () => {
    expect(calculateGrossScore([])).toBe(0);
  });
});

describe('calculateTotalPar', () => {
  it('sums all pars', () => {
    const scores: HoleScoreInput[] = [
      makeHole({ hole_number: 1, par: 4 }),
      makeHole({ hole_number: 2, par: 5 }),
      makeHole({ hole_number: 3, par: 3 }),
    ];
    expect(calculateTotalPar(scores)).toBe(12);
  });
});

describe('calculateToPar', () => {
  it('returns 0 for even par', () => {
    const scores: HoleScoreInput[] = [
      makeHole({ hole_number: 1, par: 4, score: 4 }),
      makeHole({ hole_number: 2, par: 4, score: 4 }),
    ];
    expect(calculateToPar(scores)).toBe(0);
  });

  it('returns negative for under par', () => {
    const scores: HoleScoreInput[] = [
      makeHole({ hole_number: 1, par: 4, score: 3 }),
      makeHole({ hole_number: 2, par: 4, score: 4 }),
    ];
    expect(calculateToPar(scores)).toBe(-1);
  });

  it('returns positive for over par', () => {
    const scores: HoleScoreInput[] = [
      makeHole({ hole_number: 1, par: 4, score: 5 }),
      makeHole({ hole_number: 2, par: 4, score: 5 }),
    ];
    expect(calculateToPar(scores)).toBe(2);
  });
});

describe('formatToPar', () => {
  it('returns E for 0', () => {
    expect(formatToPar(0)).toBe('E');
  });

  it('returns negative with minus sign', () => {
    expect(formatToPar(-2)).toBe('-2');
  });

  it('returns positive with plus sign', () => {
    expect(formatToPar(3)).toBe('+3');
  });
});

describe('calculateNineHoleSplits', () => {
  it('splits 9-hole and back-9 holes correctly', () => {
    const scores: HoleScoreInput[] = Array.from({ length: 18 }, (_, i) =>
      makeHole({ hole_number: i + 1, par: 4, score: i < 9 ? 4 : 5 })
    );
    const splits = calculateNineHoleSplits(scores);
    expect(splits.front9Gross).toBe(36);
    expect(splits.front9Par).toBe(36);
    expect(splits.back9Gross).toBe(45);
    expect(splits.back9Par).toBe(36);
  });

  it('handles 9-hole round', () => {
    const scores: HoleScoreInput[] = Array.from({ length: 9 }, (_, i) =>
      makeHole({ hole_number: i + 1, par: 4, score: 4 })
    );
    const splits = calculateNineHoleSplits(scores);
    expect(splits.front9Gross).toBe(36);
    expect(splits.back9Gross).toBe(0);
  });
});

describe('getScoreTerminology', () => {
  it('returns Hole in One for score of 1', () => {
    expect(getScoreTerminology(1, 4)).toBe('Hole in One');
  });

  it('returns Eagle for -2', () => {
    expect(getScoreTerminology(2, 4)).toBe('Eagle');
  });

  it('returns Birdie for -1', () => {
    expect(getScoreTerminology(3, 4)).toBe('Birdie');
  });

  it('returns Par for 0', () => {
    expect(getScoreTerminology(4, 4)).toBe('Par');
  });

  it('returns Bogey for +1', () => {
    expect(getScoreTerminology(5, 4)).toBe('Bogey');
  });

  it('returns Double Bogey for +2', () => {
    expect(getScoreTerminology(6, 4)).toBe('Double Bogey');
  });

  it('returns Triple Bogey for +3', () => {
    expect(getScoreTerminology(7, 4)).toBe('Triple Bogey');
  });

  it('returns +N for worse than triple', () => {
    expect(getScoreTerminology(9, 4)).toBe('+5');
  });

  it('returns Albatross for -3', () => {
    expect(getScoreTerminology(1, 4)).toBe('Hole in One');
    expect(getScoreTerminology(2, 5)).toBe('Albatross');
  });
});

describe('calculatePracticeScoreSummary', () => {
  it('returns empty summary for no scores', () => {
    const summary = calculatePracticeScoreSummary([]);
    expect(summary.holesCompleted).toBe(0);
    expect(summary.grossScore).toBe(0);
  });

  it('calculates correct totals for a 9-hole round', () => {
    const scores: HoleScoreInput[] = Array.from({ length: 9 }, (_, i) =>
      makeHole({ hole_number: i + 1, par: 4, score: 4 })
    );
    const summary = calculatePracticeScoreSummary(scores);
    expect(summary.grossScore).toBe(36);
    expect(summary.totalPar).toBe(36);
    expect(summary.toPar).toBe(0);
    expect(summary.holesCompleted).toBe(9);
    expect(summary.pars).toBe(9);
    expect(summary.birdies).toBe(0);
    expect(summary.bogeys).toBe(0);
  });

  it('counts birdies, pars, bogeys correctly', () => {
    const scores: HoleScoreInput[] = [
      makeHole({ hole_number: 1, par: 4, score: 3 }),
      makeHole({ hole_number: 2, par: 4, score: 4 }),
      makeHole({ hole_number: 3, par: 4, score: 5 }),
      makeHole({ hole_number: 4, par: 4, score: 6 }),
    ];
    const summary = calculatePracticeScoreSummary(scores);
    expect(summary.birdies).toBe(1);
    expect(summary.pars).toBe(1);
    expect(summary.bogeys).toBe(1);
    expect(summary.doubleBogeys).toBe(1);
  });

  it('does not count eagles as birdies', () => {
    const scores: HoleScoreInput[] = [
      makeHole({ hole_number: 1, par: 5, score: 3 }),
      makeHole({ hole_number: 2, par: 4, score: 3 }),
      makeHole({ hole_number: 3, par: 4, score: 4 }),
    ];
    const summary = calculatePracticeScoreSummary(scores);
    expect(summary.eagles).toBe(1);
    expect(summary.birdies).toBe(1);
    expect(summary.pars).toBe(1);
  });

  it('returns eagles: 0 for a round without eagles', () => {
    const scores: HoleScoreInput[] = [
      makeHole({ hole_number: 1, par: 4, score: 4 }),
      makeHole({ hole_number: 2, par: 4, score: 3 }),
    ];
    const summary = calculatePracticeScoreSummary(scores);
    expect(summary.eagles).toBe(0);
    expect(summary.birdies).toBe(1);
  });

  it('calculates putting average', () => {
    const scores: HoleScoreInput[] = [
      makeHole({ hole_number: 1, par: 4, score: 4, putts: 2 }),
      makeHole({ hole_number: 2, par: 4, score: 4, putts: 3 }),
      makeHole({ hole_number: 3, par: 4, score: 4, putts: 1 }),
    ];
    const summary = calculatePracticeScoreSummary(scores);
    expect(summary.totalPutts).toBe(6);
    expect(summary.averagePutts).toBe(2);
  });

  it('calculates fairway percentage', () => {
    const scores: HoleScoreInput[] = [
      makeHole({ hole_number: 1, par: 4, score: 4, fairway_hit: true }),
      makeHole({ hole_number: 2, par: 4, score: 4, fairway_hit: false }),
      makeHole({ hole_number: 3, par: 4, score: 4, fairway_hit: true }),
    ];
    const summary = calculatePracticeScoreSummary(scores);
    expect(summary.fairwaysHit).toBe(2);
    expect(summary.fairwaysAttempted).toBe(3);
    expect(summary.fairwayPercentage).toBeCloseTo(66.67, 0);
  });

  it('calculates GIR percentage', () => {
    const scores: HoleScoreInput[] = [
      makeHole({ hole_number: 1, par: 4, score: 4, green_in_regulation: true }),
      makeHole({ hole_number: 2, par: 4, score: 4, green_in_regulation: false }),
    ];
    const summary = calculatePracticeScoreSummary(scores);
    expect(summary.girHit).toBe(1);
    expect(summary.girAttempted).toBe(2);
    expect(summary.girPercentage).toBe(50);
  });

  it('calculates penalty strokes', () => {
    const scores: HoleScoreInput[] = [
      makeHole({ hole_number: 1, par: 4, score: 4, penalty_strokes: 0 }),
      makeHole({ hole_number: 2, par: 4, score: 5, penalty_strokes: 1 }),
    ];
    const summary = calculatePracticeScoreSummary(scores);
    expect(summary.totalPenalties).toBe(1);
  });

  it('splits front 9 and back 9 correctly', () => {
    const scores: HoleScoreInput[] = Array.from({ length: 18 }, (_, i) =>
      makeHole({ hole_number: i + 1, par: 4, score: i < 9 ? 3 : 5 })
    );
    const summary = calculatePracticeScoreSummary(scores);
    expect(summary.front9Gross).toBe(27);
    expect(summary.back9Gross).toBe(45);
    expect(summary.front9ToPar).toBe(-9);
    expect(summary.back9ToPar).toBe(9);
  });
});
