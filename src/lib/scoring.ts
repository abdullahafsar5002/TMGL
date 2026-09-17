/**
 * Scoring helpers for Phase 3.
 * Bridges golf.ts utilities with scorecard data structures.
 */

import type { ScorecardHole } from '@/types/database';

export interface HoleEntry {
  holeNumber: number;
  par: number;
  strokes: number;
}

export interface ScorecardSummary {
  totalStrokes: number;
  totalPar: number;
  totalToPar: number;
  front9Strokes: number;
  front9Par: number;
  front9ToPar: number;
  back9Strokes: number;
  back9Par: number;
  back9ToPar: number;
  holesCompleted: number;
}

/**
 * Converts ScorecardHole[] to HoleEntry[] for use with golf.ts utilities.
 */
export function holesToEntries(holes: ScorecardHole[]): HoleEntry[] {
  return holes.map((h) => ({
    holeNumber: h.hole_number,
    par: h.par,
    strokes: h.strokes,
  }));
}

/**
 * Computes full scorecard summary from scorecard holes.
 */
export function computeScorecardSummary(holes: ScorecardHole[]): ScorecardSummary {
  const entries = holesToEntries(holes);

  const totalStrokes = entries.reduce((sum, e) => sum + e.strokes, 0);
  const totalPar = entries.reduce((sum, e) => sum + e.par, 0);
  const totalToPar = totalStrokes - totalPar;

  const front9 = entries.filter((e) => e.holeNumber >= 1 && e.holeNumber <= 9);
  const back9 = entries.filter((e) => e.holeNumber >= 10 && e.holeNumber <= 18);

  const front9Strokes = front9.reduce((sum, e) => sum + e.strokes, 0);
  const front9Par = front9.reduce((sum, e) => sum + e.par, 0);
  const back9Strokes = back9.reduce((sum, e) => sum + e.strokes, 0);
  const back9Par = back9.reduce((sum, e) => sum + e.par, 0);

  return {
    totalStrokes,
    totalPar,
    totalToPar,
    front9Strokes,
    front9Par,
    front9ToPar: front9Strokes - front9Par,
    back9Strokes,
    back9Par,
    back9ToPar: back9Strokes - back9Par,
    holesCompleted: entries.length,
  };
}

/**
 * Computes score_to_par for a single hole.
 */
export function holeScoreToPar(strokes: number, par: number): number {
  return strokes - par;
}

/**
 * Default points calculation — isolated behind this function for future configurability.
 * Currently returns a simple mapping: lower score_to_par = more points.
 *
 * Rules (placeholder, configurable later):
 *   - Winner of a match gets 2 points
 *   - Loser gets 0 points
 *   - Tie gets 1 point each
 *
 * For aggregate/individual scoring, points are based on position.
 */
export function calculateMatchPoints(
  winnerScoreToPar: number,
  loserScoreToPar: number
): { winnerPoints: number; loserPoints: number; isTie: boolean } {
  if (winnerScoreToPar === loserScoreToPar) {
    return { winnerPoints: 1, loserPoints: 1, isTie: true };
  }
  return { winnerPoints: 2, loserPoints: 0, isTie: false };
}
