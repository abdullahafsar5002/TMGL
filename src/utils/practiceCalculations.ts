/**
 * Practice Score Calculation Utilities
 *
 * Pure functions for golf score calculations.
 * All functions are side-effect free and fully testable.
 *
 * Core scoring functions are shared from @/utils/golf.
 * This module adds practice-specific summary calculations.
 */

import {
  calculateGrossScore as calcGross,
  calculateTotalPar as calcTotalPar,
  calculateToPar as calcToPar,
  formatToPar as fmtToPar,
  calculateNineHoleSplits as calcSplits,
  getScoreTerminology as getTerminology,
} from '@/utils/golf';

export interface HoleScoreInput {
  hole_number: number;
  par: number;
  score: number;
  putts?: number | null;
  fairway_hit?: boolean | null;
  green_in_regulation?: boolean | null;
  penalty_strokes?: number | null;
}

export interface PracticeScoreSummary {
  grossScore: number;
  totalPar: number;
  toPar: number;
  front9Gross: number;
  front9Par: number;
  back9Gross: number;
  back9Par: number;
  front9ToPar: number;
  back9ToPar: number;
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubleBogeys: number;
  totalPutts: number | null;
  averagePutts: number | null;
  fairwaysHit: number;
  fairwaysAttempted: number;
  fairwayPercentage: number | null;
  girHit: number;
  girAttempted: number;
  girPercentage: number | null;
  totalPenalties: number;
  holesCompleted: number;
}

// Re-export core functions with practice-compatible interface
function toGolfInput(scores: HoleScoreInput[]) {
  return scores.map(s => ({ holeNumber: s.hole_number, par: s.par, strokes: s.score }));
}

export function calculateHoleToPar(score: number, par: number): number {
  return score - par;
}

export function calculateGrossScore(scores: HoleScoreInput[]): number {
  return calcGross(toGolfInput(scores));
}

export function calculateTotalPar(scores: HoleScoreInput[]): number {
  return calcTotalPar(toGolfInput(scores));
}

export function calculateToPar(scores: HoleScoreInput[]): number {
  return calcToPar(toGolfInput(scores));
}

export function formatToPar(toPar: number): string {
  return fmtToPar(toPar);
}

export function calculateNineHoleSplits(scores: HoleScoreInput[]) {
  return calcSplits(toGolfInput(scores));
}

export function getScoreTerminology(strokes: number, par: number): string {
  return getTerminology(strokes, par);
}

export function calculatePracticeScoreSummary(scores: HoleScoreInput[]): PracticeScoreSummary {
  if (scores.length === 0) {
    return {
      grossScore: 0,
      totalPar: 0,
      toPar: 0,
      front9Gross: 0,
      front9Par: 0,
      back9Gross: 0,
      back9Par: 0,
      front9ToPar: 0,
      back9ToPar: 0,
      eagles: 0,
      birdies: 0,
      pars: 0,
      bogeys: 0,
      doubleBogeys: 0,
      totalPutts: null,
      averagePutts: null,
      fairwaysHit: 0,
      fairwaysAttempted: 0,
      fairwayPercentage: null,
      girHit: 0,
      girAttempted: 0,
      girPercentage: null,
      totalPenalties: 0,
      holesCompleted: 0,
    };
  }

  const grossScore = calculateGrossScore(scores);
  const totalPar = calculateTotalPar(scores);
  const splits = calculateNineHoleSplits(scores);

  let eagles = 0;
  let birdies = 0;
  let pars = 0;
  let bogeys = 0;
  let doubleBogeys = 0;
  let totalPutts = 0;
  let puttsCount = 0;
  let fairwaysHit = 0;
  let fairwaysAttempted = 0;
  let girHit = 0;
  let girAttempted = 0;
  let totalPenalties = 0;

  for (const s of scores) {
    const toPar = s.score - s.par;
    if (toPar === -2) eagles++;
    else if (toPar === -1) birdies++;
    else if (toPar === 0) pars++;
    else if (toPar === 1) bogeys++;
    else if (toPar >= 2) doubleBogeys++;

    if (s.putts !== null && s.putts !== undefined) {
      totalPutts += s.putts;
      puttsCount++;
    }
    if (s.fairway_hit !== null && s.fairway_hit !== undefined) {
      fairwaysAttempted++;
      if (s.fairway_hit) fairwaysHit++;
    }
    if (s.green_in_regulation !== null && s.green_in_regulation !== undefined) {
      girAttempted++;
      if (s.green_in_regulation) girHit++;
    }
    if (s.penalty_strokes) totalPenalties += s.penalty_strokes;
  }

  return {
    grossScore,
    totalPar,
    toPar: grossScore - totalPar,
    front9Gross: splits.front9Gross,
    front9Par: splits.front9Par,
    back9Gross: splits.back9Gross,
    back9Par: splits.back9Par,
    front9ToPar: splits.front9Gross - splits.front9Par,
    back9ToPar: splits.back9Gross - splits.back9Par,
    eagles,
    birdies,
    pars,
    bogeys,
    doubleBogeys,
    totalPutts: puttsCount > 0 ? totalPutts : null,
    averagePutts: puttsCount > 0 ? Math.round((totalPutts / puttsCount) * 100) / 100 : null,
    fairwaysHit,
    fairwaysAttempted,
    fairwayPercentage: fairwaysAttempted > 0 ? Math.round((fairwaysHit / fairwaysAttempted) * 10000) / 100 : null,
    girHit,
    girAttempted,
    girPercentage: girAttempted > 0 ? Math.round((girHit / girAttempted) * 10000) / 100 : null,
    totalPenalties,
    holesCompleted: scores.length,
  };
}
