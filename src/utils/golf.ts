/**
 * Pure Golf Scoring & Math Utilities
 * 
 * Rules:
 * - All calculations are pure, deterministic, and testable without side effects.
 * - Never compute fake totals.
 * - Adhere to standard golf scoring terminology.
 */

export interface HoleScoreInput {
  holeNumber: number;
  par: number;
  strokes: number;
}

export interface ScoreDifferential {
  differential: number;
  date: string | Date;
}

/**
 * Calculates gross score (total strokes) from an array of hole scores.
 */
export function calculateGrossScore(scores: HoleScoreInput[]): number {
  return scores.reduce((total, score) => total + score.strokes, 0);
}

/**
 * Calculates total par for the holes played.
 */
export function calculateTotalPar(scores: HoleScoreInput[]): number {
  return scores.reduce((total, score) => total + score.par, 0);
}

/**
 * Calculates to-par score (strokes - par).
 * Returns number: 0 is Even (E), negative is under par, positive is over par.
 */
export function calculateToPar(scores: HoleScoreInput[]): number {
  const gross = calculateGrossScore(scores);
  const par = calculateTotalPar(scores);
  return gross - par;
}

/**
 * Formats a to-par numeric differential into standard golf notation.
 * e.g., 0 => "E", -2 => "-2", +3 => "+3"
 */
export function formatToPar(toPar: number): string {
  if (toPar === 0) return 'E';
  if (toPar > 0) return `+${toPar}`;
  return `${toPar}`;
}

/**
 * Splits scores into Front 9 (holes 1-9) and Back 9 (holes 10-18).
 */
export function calculateNineHoleSplits(scores: HoleScoreInput[]): {
  front9Gross: number;
  front9Par: number;
  back9Gross: number;
  back9Par: number;
} {
  const front9 = scores.filter((s) => s.holeNumber >= 1 && s.holeNumber <= 9);
  const back9 = scores.filter((s) => s.holeNumber >= 10 && s.holeNumber <= 18);

  return {
    front9Gross: calculateGrossScore(front9),
    front9Par: calculateTotalPar(front9),
    back9Gross: calculateGrossScore(back9),
    back9Par: calculateTotalPar(back9),
  };
}

/**
 * Returns standard golf terminology for a hole result (e.g. "Birdie", "Par", "Bogey").
 */
export function getScoreTerminology(strokes: number, par: number): string {
  if (strokes <= 0 || par <= 0) return 'Unknown';
  if (strokes === 1 && par > 2) return 'Hole in One';

  const diff = strokes - par;
  switch (diff) {
    case -3:
      return 'Albatross';
    case -2:
      return 'Eagle';
    case -1:
      return 'Birdie';
    case 0:
      return 'Par';
    case 1:
      return 'Bogey';
    case 2:
      return 'Double Bogey';
    case 3:
      return 'Triple Bogey';
    default:
      return diff > 3 ? `+${diff}` : `${diff}`;
  }
}

/**
 * Validates a single hole score input.
 * Golf strokes must be positive integers between 1 and 20.
 */
export function validateHoleScore(strokes: number): { isValid: boolean; error?: string } {
  if (!Number.isInteger(strokes)) {
    return { isValid: false, error: 'Strokes must be a whole number.' };
  }
  if (strokes < 1) {
    return { isValid: false, error: 'Strokes must be at least 1.' };
  }
  if (strokes > 20) {
    return { isValid: false, error: 'Score exceeds maximum allowed strokes per hole (20).' };
  }
  return { isValid: true };
}

/**
 * Calculates the official WHS Handicap Index.
 * WHS Rule: Average of the best 8 of the last 20 score differentials.
 */
export function calculateHandicapIndex(differentials: ScoreDifferential[]): number | null {
  if (!differentials || differentials.length === 0) return null;

  // 1. Sort differentials (ascending - lower is better)
  const sorted = [...differentials]
    .filter(d => typeof d.differential === 'number' && !isNaN(d.differential))
    .sort((a, b) => a.differential - b.differential);

  if (sorted.length === 0) return null;

  const countToAverage = Math.min(sorted.length, 8);
  const bestDifferentials = sorted.slice(0, countToAverage);
  
  const sum = bestDifferentials.reduce((acc, curr) => acc + curr.differential, 0);
  const average = sum / countToAverage;

  return isNaN(average) ? null : parseFloat(average.toFixed(1));
}

/**
 * Calculates the Course Handicap based on the Index and Course Slope/Rating.
 * Formula: Handicap Index * (Slope / 113) + (Course Rating - Par)
 */
export function calculateCourseHandicap(index: number | null, slope: number, rating: number, par: number): number {
  if (index === null || isNaN(index)) return 0;
  const adjusted = index * (slope / 113);
  const courseAdjustment = rating - par;
  return Math.round(adjusted + courseAdjustment);
}
