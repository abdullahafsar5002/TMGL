import { describe, it, expect } from 'vitest';
import {
  calculateGrossScore,
  calculateTotalPar,
  calculateToPar,
  formatToPar,
  calculateNineHoleSplits,
  getScoreTerminology,
  validateHoleScore,
  type HoleScoreInput
} from './golf';

describe('TMGL Golf Pure Utilities', () => {
  const sampleScores: HoleScoreInput[] = [
    { holeNumber: 1, par: 4, strokes: 3 }, // -1 Birdie
    { holeNumber: 2, par: 3, strokes: 3 }, // E Par
    { holeNumber: 3, par: 5, strokes: 5 }, // E Par
    { holeNumber: 4, par: 4, strokes: 5 }, // +1 Bogey
    { holeNumber: 5, par: 4, strokes: 4 }, // E Par
    { holeNumber: 6, par: 3, strokes: 2 }, // -1 Birdie
    { holeNumber: 7, par: 5, strokes: 6 }, // +1 Bogey
    { holeNumber: 8, par: 4, strokes: 4 }, // E Par
    { holeNumber: 9, par: 4, strokes: 4 }, // E Par
    // Front 9: par 36, strokes 36 (E)
    { holeNumber: 10, par: 4, strokes: 4 }, // E Par
    { holeNumber: 11, par: 4, strokes: 3 }, // -1 Birdie
    { holeNumber: 12, par: 3, strokes: 3 }, // E Par
    { holeNumber: 13, par: 5, strokes: 5 }, // E Par
    { holeNumber: 14, par: 4, strokes: 4 }, // E Par
    { holeNumber: 15, par: 4, strokes: 4 }, // E Par
    { holeNumber: 16, par: 3, strokes: 3 }, // E Par
    { holeNumber: 17, par: 4, strokes: 4 }, // E Par
    { holeNumber: 18, par: 5, strokes: 4 }  // -1 Birdie
    // Back 9: par 36, strokes 34 (-2)
  ];

  it('calculates gross score correctly', () => {
    expect(calculateGrossScore(sampleScores)).toBe(70);
  });

  it('calculates total par correctly', () => {
    expect(calculateTotalPar(sampleScores)).toBe(72);
  });

  it('calculates to-par accurately', () => {
    expect(calculateToPar(sampleScores)).toBe(-2);
  });

  it('formats to-par notation correctly', () => {
    expect(formatToPar(0)).toBe('E');
    expect(formatToPar(-2)).toBe('-2');
    expect(formatToPar(3)).toBe('+3');
  });

  it('calculates front 9 and back 9 splits correctly', () => {
    const splits = calculateNineHoleSplits(sampleScores);
    expect(splits.front9Gross).toBe(36);
    expect(splits.front9Par).toBe(36);
    expect(splits.back9Gross).toBe(34);
    expect(splits.back9Par).toBe(36);
  });

  it('assigns correct golf scoring terminology', () => {
    expect(getScoreTerminology(1, 4)).toBe('Hole in One');
    expect(getScoreTerminology(2, 5)).toBe('Albatross');
    expect(getScoreTerminology(3, 5)).toBe('Eagle');
    expect(getScoreTerminology(3, 4)).toBe('Birdie');
    expect(getScoreTerminology(4, 4)).toBe('Par');
    expect(getScoreTerminology(5, 4)).toBe('Bogey');
    expect(getScoreTerminology(6, 4)).toBe('Double Bogey');
    expect(getScoreTerminology(7, 4)).toBe('Triple Bogey');
    expect(getScoreTerminology(8, 4)).toBe('+4');
  });

  it('validates hole scores appropriately', () => {
    expect(validateHoleScore(4).isValid).toBe(true);
    expect(validateHoleScore(0).isValid).toBe(false);
    expect(validateHoleScore(-1).isValid).toBe(false);
    expect(validateHoleScore(25).isValid).toBe(false);
    expect(validateHoleScore(4.5).isValid).toBe(false);
  });
});
