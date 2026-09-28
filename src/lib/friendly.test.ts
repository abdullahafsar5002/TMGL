import { describe, expect, it } from 'vitest';
import { calculateFriendlyScore, calculateHandicapAdjustedScore, calculateStablefordPoints, isFriendlyStatus } from './friendly';

describe('friendly scoring helpers', () => {
  it('calculates stableford points from score to par', () => {
    expect(calculateStablefordPoints(3, 4)).toBe(3);
    expect(calculateStablefordPoints(4, 4)).toBe(2);
    expect(calculateStablefordPoints(6, 4)).toBe(0);
  });

  it('applies handicap index to stroke-play scoring', () => {
    expect(calculateHandicapAdjustedScore(82, 10)).toBe(72);
    expect(calculateFriendlyScore(82, 72, 10, 'stroke_play')).toBe(72);
  });

  it('keeps stableford scoring on the points scale', () => {
    expect(calculateFriendlyScore(3, 4, 10, 'stableford')).toBe(3);
  });

  it('applies the handicap once to a round total, not once per hole', () => {
    const holes = [
      { score: 4, par: 4 },
      { score: 5, par: 4 },
      { score: 4, par: 4 },
      { score: 6, par: 4 }
    ];
    const total = holes.reduce((sum, hole) => sum + hole.score, 0);
    const totalPar = holes.reduce((sum, hole) => sum + hole.par, 0);
    const handicap = 10;
    const perHole = holes.reduce(
      (sum, hole) => sum + calculateFriendlyScore(hole.score, hole.par, handicap, 'stroke_play'),
      0
    );
    const roundLevel = calculateFriendlyScore(total, totalPar, handicap, 'stroke_play');
    expect(perHole).not.toBe(roundLevel);
    expect(perHole).toBe(0);
    expect(roundLevel).toBe(9);
  });

  it('sums stableford points per hole', () => {
    const holes = [
      { score: 3, par: 4 },
      { score: 4, par: 4 },
      { score: 6, par: 4 }
    ];
    const total = holes.reduce(
      (sum, hole) => sum + calculateFriendlyScore(hole.score, hole.par, 10, 'stableford'),
      0
    );
    expect(total).toBe(5);
  });

  it('accepts only backend friendly statuses', () => {
    expect(isFriendlyStatus('active')).toBe(true);
    expect(isFriendlyStatus('in_progress')).toBe(true);
    expect(isFriendlyStatus('completed')).toBe(true);
    expect(isFriendlyStatus('rejected')).toBe(true);
    expect(isFriendlyStatus('pending')).toBe(false);
  });
});
