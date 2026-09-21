/**
 * Advanced Player Analytics
 *
 * Consistency Score (Stability Index) and Weakness Identification
 * based on standard deviation and per-par-type analysis.
 */

import { supabase } from '@/lib/supabase';
import type { PracticeScore } from '@/types/database';
import type { ServiceResult } from '@/types/service';

// -------------------------------------------------------------------
// Consistency Score / Stability Index
// -------------------------------------------------------------------

export interface ConsistencyResult {
  standardDeviation: number;
  coefficientOfVariation: number;
  stabilityLabel: string;
  stabilityDescription: string;
  scoreRange: { min: number; max: number };
  roundsAnalyzed: number;
}

const STABILITY_THRESHOLDS = [
  { maxCV: 5, label: 'Elite Consistency', description: 'You are a machine. Your scores barely fluctuate — tour-level stability.' },
  { maxCV: 8, label: 'Rock Solid', description: 'You rarely have a bad day. Opponents know what they\'re getting.' },
  { maxCV: 12, label: 'Steady Eddie', description: 'Your scores rarely fluctuate more than 3 strokes. Reliable and consistent.' },
  { maxCV: 16, label: 'Moderate Range', description: 'You have good days and off days. Focus on eliminating big numbers.' },
  { maxCV: 20, label: 'Wild Card', description: 'High variance in your game. Work on course management to tighten up.' },
  { maxCV: Infinity, label: 'Roller Coaster', description: 'Your scores swing widely. The good rounds are great — let\'s make them more frequent.' },
];

export function calculateConsistency(scores: number[]): ConsistencyResult | null {
  if (scores.length < 3) return null;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0;

  const threshold = STABILITY_THRESHOLDS.find(t => cv <= t.maxCV)!;

  return {
    standardDeviation: Math.round(stdDev * 100) / 100,
    coefficientOfVariation: Math.round(cv * 100) / 100,
    stabilityLabel: threshold.label,
    stabilityDescription: threshold.description,
    scoreRange: { min: Math.min(...scores), max: Math.max(...scores) },
    roundsAnalyzed: scores.length,
  };
}

// -------------------------------------------------------------------
// Weakness Identification (Par-Type Analysis)
// -------------------------------------------------------------------

export interface ParTypeAnalysis {
  par3: { avgScore: number; count: number; toPar: number; rating: 'excellent' | 'good' | 'average' | 'weak' | 'struggle' };
  par4: { avgScore: number; count: number; toPar: number; rating: 'excellent' | 'good' | 'average' | 'weak' | 'struggle' };
  par5: { avgScore: number; count: number; toPar: number; rating: 'excellent' | 'good' | 'average' | 'weak' | 'struggle' };
  weakestPar: 'par3' | 'par4' | 'par5';
  strongestPar: 'par3' | 'par4' | 'par5';
  insight: string;
}

function rateParPerformance(toPar: number): 'excellent' | 'good' | 'average' | 'weak' | 'struggle' {
  if (toPar <= -0.3) return 'excellent';
  if (toPar <= 0) return 'good';
  if (toPar <= 0.2) return 'average';
  if (toPar <= 0.5) return 'weak';
  return 'struggle';
}

export function analyzeParTypes(scores: PracticeScore[]): ParTypeAnalysis | null {
  if (scores.length < 5) return null;

  const par3Scores = scores.filter(s => s.par === 3);
  const par4Scores = scores.filter(s => s.par === 4);
  const par5Scores = scores.filter(s => s.par === 5);

  function avgToPar(group: PracticeScore[]): number {
    if (group.length === 0) return 0;
    return group.reduce((sum, s) => sum + (s.score - s.par), 0) / group.length;
  }

  const par3ToPar = avgToPar(par3Scores);
  const par4ToPar = avgToPar(par4Scores);
  const par5ToPar = avgToPar(par5Scores);

  const par3: ParTypeAnalysis['par3'] = {
    avgScore: par3Scores.length > 0 ? Math.round((par3Scores.reduce((s, x) => s + x.score, 0) / par3Scores.length) * 100) / 100 : 0,
    count: par3Scores.length,
    toPar: Math.round(par3ToPar * 100) / 100,
    rating: rateParPerformance(par3ToPar),
  };
  const par4: ParTypeAnalysis['par4'] = {
    avgScore: par4Scores.length > 0 ? Math.round((par4Scores.reduce((s, x) => s + x.score, 0) / par4Scores.length) * 100) / 100 : 0,
    count: par4Scores.length,
    toPar: Math.round(par4ToPar * 100) / 100,
    rating: rateParPerformance(par4ToPar),
  };
  const par5: ParTypeAnalysis['par5'] = {
    avgScore: par5Scores.length > 0 ? Math.round((par5Scores.reduce((s, x) => s + x.score, 0) / par5Scores.length) * 100) / 100 : 0,
    count: par5Scores.length,
    toPar: Math.round(par5ToPar * 100) / 100,
    rating: rateParPerformance(par5ToPar),
  };

  const pars = [
    { key: 'par3' as const, toPar: par3ToPar },
    { key: 'par4' as const, toPar: par4ToPar },
    { key: 'par5' as const, toPar: par5ToPar },
  ];
  pars.sort((a, b) => a.toPar - b.toPar);

  const weakest = pars[2].key;
  const strongest = pars[0].key;

  const parLabels = { par3: 'Par 3s', par4: 'Par 4s', par5: 'Par 5s' };
  const insights: string[] = [];

  if (par3.rating === 'struggle' || par3.rating === 'weak') {
    insights.push(`You struggle most on ${parLabels.par3}; your average score there is ${par3.avgScore}.`);
  }
  if (par5.rating === 'struggle' || par5.rating === 'weak') {
    insights.push(`${parLabels.par5} are hurting your score — you're averaging ${par5.avgScore} on them.`);
  }
  if (par4.rating === 'excellent') {
    insights.push(`Your ${parLabels.par4} game is elite — keep it up!`);
  }
  if (insights.length === 0) {
    insights.push(`Your game is balanced across all par types. Focus on converting ${parLabels[weakest].toLowerCase()} into birdie opportunities.`);
  }

  return {
    par3,
    par4,
    par5,
    weakestPar: weakest,
    strongestPar: strongest,
    insight: insights.join(' '),
  };
}

// -------------------------------------------------------------------
// Hole Difficulty Analysis
// -------------------------------------------------------------------

export interface HoleDifficulty {
  holeNumber: number;
  avgScore: number;
  avgToPar: number;
  playCount: number;
  rating: 'easiest' | 'easy' | 'average' | 'hard' | 'hardest';
}

export function analyzeHoleDifficulty(scores: PracticeScore[]): HoleDifficulty[] {
  const holeMap = new Map<number, PracticeScore[]>();
  for (const s of scores) {
    if (!holeMap.has(s.hole_number)) holeMap.set(s.hole_number, []);
    holeMap.get(s.hole_number)!.push(s);
  }

  const results: HoleDifficulty[] = [];
  for (const [hole, holeScores] of holeMap) {
    const avgScore = holeScores.reduce((s, x) => s + x.score, 0) / holeScores.length;
    const avgPar = holeScores.reduce((s, x) => s + x.par, 0) / holeScores.length;
    const avgToPar = avgScore - avgPar;
    results.push({
      holeNumber: hole,
      avgScore: Math.round(avgScore * 100) / 100,
      avgToPar: Math.round(avgToPar * 100) / 100,
      playCount: holeScores.length,
      rating: 'average',
    });
  }

  results.sort((a, b) => a.avgToPar - b.avgToPar);
  const n = results.length;
  if (n >= 5) {
    results.forEach((r, i) => {
      if (i === 0) r.rating = 'easiest';
      else if (i < n * 0.2) r.rating = 'easy';
      else if (i < n * 0.6) r.rating = 'average';
      else if (i < n * 0.85) r.rating = 'hard';
      else r.rating = 'hardest';
    });
  }

  return results.sort((a, b) => a.holeNumber - b.holeNumber);
}

// -------------------------------------------------------------------
// Fetch all player scores for analytics
// -------------------------------------------------------------------

export async function getPlayerScoresForAnalytics(
  playerId: string
): Promise<ServiceResult<PracticeScore[]>> {
  const { data: rounds, error: rErr } = await supabase
    .from('practice_rounds')
    .select('id')
    .eq('player_id', playerId)
    .eq('status', 'completed');

  if (rErr) return { data: null, error: rErr.message };
  if (!rounds || rounds.length === 0) return { data: [], error: null };

  const roundIds = rounds.map(r => r.id);
  const { data: scores, error: sErr } = await supabase
    .from('practice_scores')
    .select('*')
    .in('practice_round_id', roundIds);

  if (sErr) return { data: null, error: sErr.message };
  return { data: (scores ?? []) as PracticeScore[], error: null };
}

// -------------------------------------------------------------------
// Score Trend (last N rounds)
// -------------------------------------------------------------------

export interface ScoreTrend {
  roundDate: string;
  totalScore: number;
  toPar: number;
}

export async function getScoreTrend(
  playerId: string,
  limit = 20
): Promise<ServiceResult<ScoreTrend[]>> {
  const { data, error } = await supabase
    .from('practice_rounds')
    .select('completed_at, gross_score, total_to_par')
    .eq('player_id', playerId)
    .eq('status', 'completed')
    .not('gross_score', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) return { data: null, error: error.message };
  const trend = (data ?? []).reverse().map(r => ({
    roundDate: r.completed_at ?? '',
    totalScore: r.gross_score ?? 0,
    toPar: r.total_to_par ?? 0,
  }));
  return { data: trend, error: null };
}
