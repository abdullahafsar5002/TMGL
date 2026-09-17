import { describe, it, expect } from 'vitest';
import { computeScorecardSummary, holeScoreToPar, calculateMatchPoints, holesToEntries } from './scoring';
import type { ScorecardHole } from '@/types/database';

function makeHole(scorecardId: string, holeNumber: number, par: number, strokes: number): ScorecardHole {
  return {
    id: `${scorecardId}-${holeNumber}`,
    scorecard_id: scorecardId,
    hole_number: holeNumber,
    par,
    strokes,
    score_to_par: strokes - par,
    created_at: '',
    updated_at: '',
  };
}

describe('Scoring Helpers', () => {
  describe('holeScoreToPar', () => {
    it('returns 0 for par', () => {
      expect(holeScoreToPar(4, 4)).toBe(0);
    });

    it('returns negative for birdie', () => {
      expect(holeScoreToPar(3, 4)).toBe(-1);
    });

    it('returns positive for bogey', () => {
      expect(holeScoreToPar(5, 4)).toBe(1);
    });
  });

  describe('holesToEntries', () => {
    it('converts ScorecardHole[] to HoleEntry[]', () => {
      const holes = [makeHole('sc1', 1, 4, 5), makeHole('sc1', 2, 3, 2)];
      const entries = holesToEntries(holes);
      expect(entries).toEqual([
        { holeNumber: 1, par: 4, strokes: 5 },
        { holeNumber: 2, par: 3, strokes: 2 },
      ]);
    });
  });

  describe('computeScorecardSummary', () => {
    it('computes totals for a full 18-hole round', () => {
      const holes = Array.from({ length: 18 }, (_, i) => makeHole('sc1', i + 1, 4, 4));
      const summary = computeScorecardSummary(holes);
      expect(summary.totalStrokes).toBe(72);
      expect(summary.totalPar).toBe(72);
      expect(summary.totalToPar).toBe(0);
      expect(summary.holesCompleted).toBe(18);
      expect(summary.front9Strokes).toBe(36);
      expect(summary.back9Strokes).toBe(36);
    });

    it('computes under par', () => {
      const holes = Array.from({ length: 18 }, (_, i) => makeHole('sc1', i + 1, 4, 3));
      const summary = computeScorecardSummary(holes);
      expect(summary.totalStrokes).toBe(54);
      expect(summary.totalToPar).toBe(-18);
    });

    it('computes over par', () => {
      const holes = Array.from({ length: 18 }, (_, i) => makeHole('sc1', i + 1, 4, 5));
      const summary = computeScorecardSummary(holes);
      expect(summary.totalStrokes).toBe(90);
      expect(summary.totalToPar).toBe(18);
    });

    it('handles empty holes', () => {
      const summary = computeScorecardSummary([]);
      expect(summary.totalStrokes).toBe(0);
      expect(summary.holesCompleted).toBe(0);
    });

    it('handles partial round', () => {
      const holes = [makeHole('sc1', 1, 4, 3), makeHole('sc1', 2, 3, 4)];
      const summary = computeScorecardSummary(holes);
      expect(summary.totalStrokes).toBe(7);
      expect(summary.totalToPar).toBe(0);
      expect(summary.holesCompleted).toBe(2);
    });
  });

  describe('calculateMatchPoints', () => {
    it('awards 2 points to winner', () => {
      const result = calculateMatchPoints(-2, 0);
      expect(result.winnerPoints).toBe(2);
      expect(result.loserPoints).toBe(0);
      expect(result.isTie).toBe(false);
    });

    it('awards 1 point each on tie', () => {
      const result = calculateMatchPoints(-2, -2);
      expect(result.winnerPoints).toBe(1);
      expect(result.loserPoints).toBe(1);
      expect(result.isTie).toBe(true);
    });
  });
});
