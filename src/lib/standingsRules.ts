import { stablefordPoints as formatStablefordPoints } from './matchFormats';

export interface CutConfig {
  cutAfterHole: number | null;
  cutLineScore: number | null;
}

export type CutReason = 'dnf' | 'cut_line' | null;

export interface CutEvaluation {
  isCut: boolean;
  reason: CutReason;
}

const NO_CUT: CutEvaluation = { isCut: false, reason: null };

export function evaluateCut(
  strokesThroughCut: number | null,
  isDnf: boolean,
  config: CutConfig
): CutEvaluation {
  if (isDnf) return { isCut: true, reason: 'dnf' };
  if (config.cutAfterHole == null || config.cutLineScore == null) return NO_CUT;
  if (strokesThroughCut == null) return NO_CUT;
  if (strokesThroughCut > config.cutLineScore) return { isCut: true, reason: 'cut_line' };
  return NO_CUT;
}

export function cutLabel(evaluation: CutEvaluation): string | null {
  if (evaluation.reason === 'dnf') return 'DNF';
  if (evaluation.reason === 'cut_line') return 'Cut';
  return null;
}

export function compareLastDifferingHole(
  aScores: ReadonlyArray<number | null | undefined>,
  bScores: ReadonlyArray<number | null | undefined>,
  fullRoundHoles = 18
): number | null {
  const length = Math.max(fullRoundHoles, aScores.length, bScores.length);
  for (let index = length - 1; index >= 0; index -= 1) {
    const a = aScores[index];
    const b = bScores[index];
    const aValue = a == null ? Number.POSITIVE_INFINITY : a;
    const bValue = b == null ? Number.POSITIVE_INFINITY : b;
    if (aValue !== bValue) return aValue < bValue ? -1 : 1;
  }
  return null;
}

export function stablefordPointsForHole(strokes: number, par: number): number {
  return formatStablefordPoints(strokes, par);
}

export function stablefordPoints(
  holes: ReadonlyArray<{ strokes: number | null; par: number | null }>
): number {
  let total = 0;
  for (const hole of holes) {
    if (hole.strokes == null || hole.par == null) continue;
    total += stablefordPointsForHole(hole.strokes, hole.par);
  }
  return total;
}

export function matchPlayRecord(
  aScores: ReadonlyArray<number | null | undefined>,
  bScores: ReadonlyArray<number | null | undefined>
): { holesWon: number; holesLost: number; holesTied: number; margin: number } {
  const length = Math.min(aScores.length, bScores.length);
  let holesWon = 0;
  let holesLost = 0;
  let holesTied = 0;
  for (let index = 0; index < length; index += 1) {
    const a = aScores[index];
    const b = bScores[index];
    if (a == null || b == null) continue;
    if (a < b) holesWon += 1;
    else if (a > b) holesLost += 1;
    else holesTied += 1;
  }
  return { holesWon, holesLost, holesTied, margin: holesWon - holesLost };
}
