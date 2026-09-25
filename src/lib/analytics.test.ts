import { describe, it, expect } from 'vitest';
import { calculateConsistency, analyzeParTypes, analyzeHoleDifficulty } from './analytics';

describe('calculateConsistency', () => {
  it('returns null for less than 3 scores', () => {
    expect(calculateConsistency([])).toBeNull();
    expect(calculateConsistency([72])).toBeNull();
    expect(calculateConsistency([72, 74])).toBeNull();
  });

  it('calculates basic consistency for identical scores', () => {
    const result = calculateConsistency([72, 72, 72]);
    expect(result).not.toBeNull();
    expect(result!.standardDeviation).toBe(0);
    expect(result!.coefficientOfVariation).toBe(0);
    expect(result!.roundsAnalyzed).toBe(3);
    expect(result!.scoreRange).toEqual({ min: 72, max: 72 });
  });

  it('labels Elite Consistency for very low CV', () => {
    const result = calculateConsistency([72, 72, 73, 72, 73]);
    expect(result!.stabilityLabel).toBe('Elite Consistency');
  });

  it('labels Rock Solid for low CV', () => {
    const result = calculateConsistency([64, 68, 71, 72, 73, 76, 80, 76]);
    expect(result!.stabilityLabel).toBe('Rock Solid');
  });

  it('labels Roller Coaster for very high CV', () => {
    const result = calculateConsistency([60, 95, 55, 100, 58]);
    expect(result!.stabilityLabel).toBe('Roller Coaster');
  });

  it('calculates correct score range', () => {
    const result = calculateConsistency([68, 72, 75, 80]);
    expect(result!.scoreRange).toEqual({ min: 68, max: 80 });
  });
});

describe('analyzeParTypes', () => {
  it('returns null for less than 5 scores', () => {
    expect(analyzeParTypes([])).toBeNull();
    expect(analyzeParTypes([
      { par: 3, score: 3, hole_number: 1 } as any,
      { par: 4, score: 4, hole_number: 2 } as any,
    ])).toBeNull();
  });

  it('analyzes par types correctly', () => {
    const scores = [
      { par: 3, score: 3, hole_number: 1 },
      { par: 3, score: 2, hole_number: 4 },
      { par: 4, score: 4, hole_number: 2 },
      { par: 4, score: 5, hole_number: 5 },
      { par: 5, score: 5, hole_number: 3 },
      { par: 5, score: 6, hole_number: 6 },
    ] as any[];

    const result = analyzeParTypes(scores);
    expect(result).not.toBeNull();
    expect(result!.par3.count).toBe(2);
    expect(result!.par4.count).toBe(2);
    expect(result!.par5.count).toBe(2);
    expect(result!.par3.avgScore).toBe(2.5);
    expect(result!.par4.avgScore).toBe(4.5);
    expect(result!.par5.avgScore).toBe(5.5);
  });

  it('identifies weakest and strongest par type', () => {
    const scores = [
      { par: 3, score: 2, hole_number: 1 },
      { par: 3, score: 2, hole_number: 4 },
      { par: 3, score: 2, hole_number: 7 },
      { par: 4, score: 4, hole_number: 2 },
      { par: 4, score: 4, hole_number: 5 },
      { par: 4, score: 4, hole_number: 8 },
      { par: 5, score: 6, hole_number: 3 },
      { par: 5, score: 7, hole_number: 6 },
      { par: 5, score: 6, hole_number: 9 },
    ] as any[];

    const result = analyzeParTypes(scores);
    expect(result!.weakestPar).toBe('par5');
    expect(result!.strongestPar).toBe('par3');
  });

  it('rates par performance correctly', () => {
    const scores = [
      { par: 3, score: 2, hole_number: 1 },
      { par: 3, score: 2, hole_number: 4 },
      { par: 3, score: 2, hole_number: 7 },
      { par: 3, score: 2, hole_number: 10 },
      { par: 3, score: 2, hole_number: 13 },
    ] as any[];

    const result = analyzeParTypes(scores);
    expect(result!.par3.rating).toBe('excellent');
  });
});

describe('analyzeHoleDifficulty', () => {
  it('returns empty array for empty input', () => {
    expect(analyzeHoleDifficulty([])).toEqual([]);
  });

  it('calculates average score per hole', () => {
    const scores = [
      { hole_number: 1, par: 4, score: 4 },
      { hole_number: 1, par: 4, score: 5 },
      { hole_number: 2, par: 3, score: 3 },
      { hole_number: 2, par: 3, score: 2 },
      { hole_number: 3, par: 5, score: 5 },
    ] as any[];

    const result = analyzeHoleDifficulty(scores);
    expect(result).toHaveLength(3);

    const hole1 = result.find(r => r.holeNumber === 1)!;
    expect(hole1.avgScore).toBe(4.5);
    expect(hole1.avgToPar).toBe(0.5);
    expect(hole1.playCount).toBe(2);

    const hole2 = result.find(r => r.holeNumber === 2)!;
    expect(hole2.avgScore).toBe(2.5);
    expect(hole2.avgToPar).toBe(-0.5);
  });

  it('sorts results by hole number', () => {
    const scores = [
      { hole_number: 5, par: 4, score: 4 },
      { hole_number: 1, par: 3, score: 3 },
      { hole_number: 3, par: 5, score: 5 },
    ] as any[];

    const result = analyzeHoleDifficulty(scores);
    expect(result[0].holeNumber).toBe(1);
    expect(result[1].holeNumber).toBe(3);
    expect(result[2].holeNumber).toBe(5);
  });

  it('assigns difficulty ratings for 10+ holes', () => {
    const scores = [
      { hole_number: 1, par: 4, score: 3 },   // easiest (idx 0)
      { hole_number: 2, par: 4, score: 3 },   // easy (idx 1)
      { hole_number: 3, par: 4, score: 4 },   // average (idx 2)
      { hole_number: 4, par: 4, score: 4 },   // average (idx 3)
      { hole_number: 5, par: 4, score: 4 },   // average (idx 4)
      { hole_number: 6, par: 4, score: 4 },   // average (idx 5)
      { hole_number: 7, par: 4, score: 5 },   // hard (idx 6)
      { hole_number: 8, par: 4, score: 5 },   // hard (idx 7)
      { hole_number: 9, par: 4, score: 5 },   // hard (idx 8)
      { hole_number: 10, par: 4, score: 6 },  // hardest (idx 9, bottom 15%)
    ] as any[];

    const result = analyzeHoleDifficulty(scores);
    expect(result.find(r => r.holeNumber === 1)!.rating).toBe('easiest');
    expect(result.find(r => r.holeNumber === 10)!.rating).toBe('hardest');
  });
});
