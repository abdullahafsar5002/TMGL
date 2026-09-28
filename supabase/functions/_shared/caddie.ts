export interface HoleInput {
  hole_number: number;
  par: number;
  score: number;
  putts: number | null;
  fairway_hit: boolean | null;
  green_in_regulation: boolean | null;
}

export interface RoundInput {
  id: string;
  completed_at: string | null;
  holes: HoleInput[];
}

export interface RoundStats {
  holes: number;
  gross: number;
  par: number;
  toPar: number;
  par3Avg: number | null;
  par4Avg: number | null;
  par5Avg: number | null;
  birdies: number;
  pars: number;
  bogeys: number;
  doubles: number;
  avgPutts: number | null;
  fairwayPct: number | null;
  girPct: number | null;
}

export interface CaddieStats {
  rounds: RoundStats[];
  averageToPar: number;
  weakestPar: 3 | 4 | 5 | null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function percentage(hit: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((hit / total) * 100);
}

export function summarizeRound(round: RoundInput): RoundStats {
  const holes = round.holes;
  const par = holes.reduce((sum, hole) => sum + hole.par, 0);
  const gross = holes.reduce((sum, hole) => sum + hole.score, 0);
  const scored = holes.filter((hole) => hole.score > 0);
  const putts = holes.filter((hole) => typeof hole.putts === 'number').map((hole) => hole.putts as number);
  const fairwaySample = holes.filter((hole) => typeof hole.fairway_hit === 'boolean');
  const girSample = holes.filter((hole) => typeof hole.green_in_regulation === 'boolean');

  return {
    holes: scored.length,
    gross,
    par,
    toPar: gross - par,
    par3Avg: average(holes.filter((hole) => hole.par === 3).map((hole) => hole.score)),
    par4Avg: average(holes.filter((hole) => hole.par === 4).map((hole) => hole.score)),
    par5Avg: average(holes.filter((hole) => hole.par === 5).map((hole) => hole.score)),
    birdies: scored.filter((hole) => hole.score - hole.par <= -2).length,
    pars: scored.filter((hole) => hole.score - hole.par === 0).length,
    bogeys: scored.filter((hole) => hole.score - hole.par === 1).length,
    doubles: scored.filter((hole) => hole.score - hole.par >= 2).length,
    avgPutts: average(putts),
    fairwayPct: percentage(fairwaySample.filter((hole) => hole.fairway_hit === true).length, fairwaySample.length),
    girPct: percentage(girSample.filter((hole) => hole.green_in_regulation === true).length, girSample.length),
  };
}

export function buildStats(rounds: RoundInput[]): CaddieStats {
  const stats = rounds.map(summarizeRound).filter((round) => round.holes > 0);
  const averageToPar = stats.length === 0
    ? 0
    : Math.round((stats.reduce((sum, round) => sum + round.toPar, 0) / stats.length) * 10) / 10;
  const parAverages = ([3, 4, 5] as const).map((par) => {
    const values = stats
      .map((round) => (par === 3 ? round.par3Avg : par === 4 ? round.par4Avg : round.par5Avg))
      .filter((value): value is number => typeof value === 'number');
    if (values.length === 0) return null;
    return { par, value: values.reduce((sum, value) => sum + value, 0) / values.length };
  }).filter((entry): entry is { par: 3 | 4 | 5; value: number } => entry !== null);
  const weakest = parAverages.length === 0
    ? null
    : parAverages.reduce((worst, entry) => (entry.value / entry.par > worst.value / worst.par ? entry : worst)).par;
  return { rounds: stats, averageToPar, weakestPar: weakest };
}

export function buildPrompt(stats: CaddieStats): string {
  const lines = stats.rounds.map((round, index) => {
    const format = (value: number | null) => (value === null ? 'n/a' : value.toFixed(1));
    return [
      `Round ${index + 1}: holes ${round.holes}, gross ${round.gross} (${round.toPar > 0 ? '+' : ''}${round.toPar})`,
      `  par3 avg ${format(round.par3Avg)}, par4 avg ${format(round.par4Avg)}, par5 avg ${format(round.par5Avg)}`,
      `  eagles ${round.birdies}, pars ${round.pars}, bogeys ${round.bogeys}, double+ ${round.doubles}`,
      `  avg putts ${format(round.avgPutts)}, fairways ${round.fairwayPct ?? 'n/a'}%, gir ${round.girPct ?? 'n/a'}%`,
    ].join('\n');
  });

  return [
    'You are a professional golf caddie. Based only on the performance data below, give the player exactly 5 specific, actionable improvement tips.',
    'Never invent statistics. Keep every tip under 40 words. Tone is direct and encouraging.',
    `Average score relative to par across ${stats.rounds.length} rounds: ${stats.averageToPar > 0 ? '+' : ''}${stats.averageToPar}.`,
    stats.weakestPar ? `Weakest par category: par ${stats.weakestPar}.` : '',
    '',
    'Performance data:',
    ...lines,
    '',
    'Return only JSON with this exact shape:',
    '{"summary":"one sentence","overallRating":"one word","keyImprovement":"single biggest focus",',
    '"tips":[{"category":"approach|tee|putting|course_management|mental","title":"short title",',
    '"advice":"actionable advice","confidence":"high|medium|low"}]}',
  ].filter((line) => line !== '').join('\n');
}

export function parseCaddieJson(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}
