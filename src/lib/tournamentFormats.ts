import type { ScoringFormat } from '@/types/database';

export interface FormatPlayerScore {
  playerId: string;
  playerName: string;
  handicapIndex: number;
  holeNumber: number;
  strokes: number;
  par: number;
  dnf?: boolean;
  cut?: boolean;
  scorecardId?: string;
}

export interface FormatUnit {
  id: string;
  label: string;
  playerIds: string[];
  playerNames: string[];
  handicapAllowance: number;
}

export interface PairHoleResult {
  holeNumber: number;
  par: number;
  bestScore: number | null;
  toPar: number | null;
  holesCompleted: number;
}

export interface PairSummary {
  unit: FormatUnit;
  holes: PairHoleResult[];
  holesPlayed: number;
  strokesToPar: number;
  netToPar: number;
}

export interface MatchUnitResult {
  unit: FormatUnit;
  holesWon: number;
  holesLost: number;
  holesTied: number;
  margin: number;
  holesPlayed: number;
  netToPar: number;
}

export interface NassauUnitResult {
  unit: FormatUnit;
  frontNine: number | null;
  backNine: number | null;
  total: number | null;
  netToPar: number;
  holesPlayed: number;
}

export interface BestBallUnitResult {
  unit: FormatUnit;
  totalStrokes: number;
  totalToPar: number;
  netToPar: number;
  holesPlayed: number;
  eachHoleCounted: number;
}

export interface FormatStandingRow {
  unitId: string;
  label: string;
  position: number;
  playerIds: string[];
  playerNames: string[];
  metricValue: number;
  displayValue: string;
  holesPlayed: number;
  holesWon: number;
  holesLost: number;
  strokesToPar: number | null;
  netToPar: number | null;
  memberCount: number;
  cut: boolean;
}

export const FORMAT_SCRAMBLE_GROUP_SIZE = 4;

function allowanceFor(unit: FormatUnit, holesPlayed: number, fullRoundHoles: number): number {
  if (unit.handicapAllowance <= 0 || holesPlayed <= 0) return 0;
  if (holesPlayed >= fullRoundHoles) return unit.handicapAllowance;
  return Math.floor((unit.handicapAllowance * holesPlayed) / fullRoundHoles);
}

function unitHandicap(unit: FormatUnit): number {
  if (unit.handicapAllowance > 0) return unit.handicapAllowance;
  if (unit.playerIds.length === 0) return 0;
  return Math.max(0, Math.round(unit.handicapAllowance / unit.playerIds.length));
}

export function bestScoreForHole(
  scores: Array<{ playerId: string; strokes: number }>,
  unit: FormatUnit
): number | null {
  let best: number | null = null;
  for (const score of scores) {
    if (!unit.playerIds.includes(score.playerId)) continue;
    if (best === null || score.strokes < best) best = score.strokes;
  }
  return best;
}

export function summarisePair(
  unit: FormatUnit,
  scores: FormatPlayerScore[],
  pars: Record<number, number>,
  fullRoundHoles = 18
): PairSummary {
  const holes: PairHoleResult[] = [];
  let strokesToPar = 0;
  let holesPlayed = 0;

  for (let holeNumber = 1; holeNumber <= fullRoundHoles; holeNumber += 1) {
    const par = pars[holeNumber] ?? 4;
    const best = bestScoreForHole(
      scores
        .filter((score) => score.holeNumber === holeNumber)
        .map((score) => ({ playerId: score.playerId, strokes: score.strokes })),
      unit
    );
    if (best === null) {
      holes.push({ holeNumber, par, bestScore: null, toPar: null, holesCompleted: 0 });
      continue;
    }
    holesPlayed += 1;
    strokesToPar += best - par;
    holes.push({ holeNumber, par, bestScore: best, toPar: best - par, holesCompleted: holesPlayed });
  }

  const allowance = allowanceFor(
    { ...unit, handicapAllowance: unitHandicap(unit) },
    holesPlayed,
    fullRoundHoles
  );

  return {
    unit,
    holes,
    holesPlayed,
    strokesToPar,
    netToPar: strokesToPar - allowance
  };
}

export function computeMatchPlay(
  units: FormatUnit[],
  scores: FormatPlayerScore[],
  pars: Record<number, number>,
  fullRoundHoles = 18
): MatchUnitResult[] {
  const summaries = units.map((unit) => summarisePair(unit, scores, pars, fullRoundHoles));

  return summaries.map((summary) => {
    let holesWon = 0;
    let holesLost = 0;
    let holesTied = 0;
    for (const hole of summary.holes) {
      if (hole.bestScore === null) continue;
      const rival = summaries.find(
        (other) => other.unit.id !== summary.unit.id && shareMatchPair(other.unit.id, summary.unit.id)
      );
      if (!rival) continue;
      const rivalHole = rival.holes.find((entry) => entry.holeNumber === hole.holeNumber);
      if (!rivalHole || rivalHole.bestScore === null) continue;
      if (hole.bestScore < rivalHole.bestScore) holesWon += 1;
      else if (hole.bestScore > rivalHole.bestScore) holesLost += 1;
      else holesTied += 1;
    }
    return {
      unit: summary.unit,
      holesWon,
      holesLost,
      holesTied,
      margin: holesWon - holesLost,
      holesPlayed: summary.holesPlayed,
      netToPar: summary.netToPar
    };
  });
}

export function matchPairIndex(unitId: string): number {
  const match = /^pair-(\d+)$/.exec(unitId);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function shareMatchPair(a: string, b: string): boolean {
  const indexA = matchPairIndex(a);
  const indexB = matchPairIndex(b);
  if (indexA === Number.MAX_SAFE_INTEGER || indexB === Number.MAX_SAFE_INTEGER) return false;
  return Math.floor((indexA - 1) / 2) === Math.floor((indexB - 1) / 2);
}

export function computeNassau(
  units: FormatUnit[],
  scores: FormatPlayerScore[],
  pars: Record<number, number>,
  fullRoundHoles = 18
): NassauUnitResult[] {
  return units.map((unit) => summarisePair(unit, scores, pars, fullRoundHoles)).map((summary) => {
    const frontNine = sumRange(summary, 1, 9);
    const backNine = sumRange(summary, 10, fullRoundHoles);
    const total = frontNine !== null && backNine !== null ? frontNine + backNine : null;
    return {
      unit: summary.unit,
      frontNine,
      backNine,
      total,
      netToPar: summary.netToPar,
      holesPlayed: summary.holesPlayed
    };
  });
}

function sumRange(summary: PairSummary, from: number, to: number): number | null {
  let total = 0;
  let played = 0;
  for (let holeNumber = from; holeNumber <= to; holeNumber += 1) {
    const hole = summary.holes.find((entry) => entry.holeNumber === holeNumber);
    if (!hole || hole.toPar === null) continue;
    total += hole.toPar;
    played += 1;
  }
  return played > 0 ? total : null;
}

export function computeBestBall(
  units: FormatUnit[],
  scores: FormatPlayerScore[],
  pars: Record<number, number>,
  fullRoundHoles = 18
): BestBallUnitResult[] {
  return units.map((unit) => summarisePair(unit, scores, pars, fullRoundHoles)).map((summary) => {
    let totalStrokes = 0;
    let counted = 0;
    for (const hole of summary.holes) {
      if (hole.bestScore === null) continue;
      totalStrokes += hole.bestScore;
      counted += 1;
    }
    const allowance = allowanceFor(
      { ...summary.unit, handicapAllowance: unitHandicap(summary.unit) },
      summary.holesPlayed,
      fullRoundHoles
    );
    return {
      unit: summary.unit,
      totalStrokes,
      totalToPar: summary.strokesToPar,
      netToPar: summary.strokesToPar - allowance,
      holesPlayed: summary.holesPlayed,
      eachHoleCounted: counted
    };
  });
}

export function buildPairsFromPairings(
  members: Array<{ playerId: string; playerName: string; handicapIndex: number; pairingNo: number; flightId?: string }>
): FormatUnit[] {
  const pairs = new Map<string, typeof members>();
  for (const member of members) {
    const pairNo = Math.ceil(member.pairingNo / 2);
    const key = `${member.flightId ?? 'f'}:${pairNo}`;
    const list = pairs.get(key) ?? [];
    list.push(member);
    pairs.set(key, list);
  }
  return [...pairs.entries()]
    .map(([, list], index) => {
      const sorted = [...list].sort((a, b) => a.pairingNo - b.pairingNo);
      const names = sorted.map((m) => m.playerName);
      const allowance = sorted.reduce((sum, m) => sum + Math.max(0, Math.round(m.handicapIndex)), 0);
      return {
        id: `pair-${index + 1}`,
        label: names.join(' / '),
        playerIds: sorted.map((m) => m.playerId),
        playerNames: names,
        handicapAllowance: sorted.length >= 2 ? allowance / sorted.length : allowance
      };
    })
    .filter((unit) => unit.playerIds.length >= 2);
}

export function buildScrambleGroups(
  members: Array<{ playerId: string; playerName: string; handicapIndex: number }>,
  groupSize = FORMAT_SCRAMBLE_GROUP_SIZE
): FormatUnit[] {
  const size = Math.max(2, Math.floor(groupSize));
  const groups: FormatUnit[] = [];
  for (let index = 0; index < members.length; index += size) {
    const slice = members.slice(index, index + size);
    if (slice.length < 2) break;
    const names = slice.map((m) => m.playerName);
    const averageHandicap =
      slice.reduce((sum, m) => sum + Math.max(0, Math.round(m.handicapIndex)), 0) / slice.length;
    groups.push({
      id: `group-${index / size + 1}`,
      label: `Group ${index / size + 1}`,
      playerIds: slice.map((m) => m.playerId),
      playerNames: names,
      handicapAllowance: Math.round(averageHandicap)
    });
  }
  return groups;
}

export function supportsFormat(format: ScoringFormat): boolean {
  return ['stroke_play', 'stableford', 'match_play', 'nassau', 'best_ball', 'scramble'].includes(format);
}

export function formatUsesTeams(format: ScoringFormat): boolean {
  return format === 'best_ball' || format === 'scramble';
}

export interface RankFormatOptions {
  fullRoundHoles?: number;
  cutUnitIds?: Set<string>;
}

export interface RankedFormatStanding {
  rows: FormatStandingRow[];
  skipped: number;
}

function competitionNumbers(values: number[]): number[] {
  const positions: number[] = [];
  let previous: number | null = null;
  let lastPosition = 1;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (previous === null || value !== previous) lastPosition = index + 1;
    positions.push(lastPosition);
    previous = value;
  }
  return positions;
}

function toParText(value: number): string {
  if (value === 0) return 'E';
  return value > 0 ? `+${value}` : `${value}`;
}

export function rankMatchPlay(results: MatchUnitResult[]): RankedFormatStanding {
  const sorted = [...results].sort(
    (a, b) => b.margin - a.margin || b.holesWon - a.holesWon || a.netToPar - b.netToPar || a.unit.label.localeCompare(b.unit.label)
  );
  const metrics = sorted.map((entry) => -entry.margin);
  const positions = competitionNumbers(metrics);
  return {
    skipped: 0,
    rows: sorted.map((entry, index) => ({
      unitId: entry.unit.id,
      label: entry.unit.label,
      position: positions[index],
      playerIds: entry.unit.playerIds,
      playerNames: entry.unit.playerNames,
      metricValue: entry.margin,
      displayValue: entry.margin === 0 ? 'All square' : entry.margin > 0 ? `${entry.margin} up` : `${Math.abs(entry.margin)} down`,
      holesPlayed: entry.holesPlayed,
      holesWon: entry.holesWon,
      holesLost: entry.holesLost,
      strokesToPar: null,
      netToPar: entry.netToPar,
      memberCount: entry.unit.playerIds.length,
      cut: false
    }))
  };
}

export function rankNassau(results: NassauUnitResult[]): RankedFormatStanding {
  const sorted = [...results].sort(
    (a, b) => a.netToPar - b.netToPar || (a.total ?? 0) - (b.total ?? 0) || a.unit.label.localeCompare(b.unit.label)
  );
  const metrics = sorted.map((entry) => entry.netToPar);
  const positions = competitionNumbers(metrics);
  return {
    skipped: 0,
    rows: sorted.map((entry, index) => ({
      unitId: entry.unit.id,
      label: entry.unit.label,
      position: positions[index],
      playerIds: entry.unit.playerIds,
      playerNames: entry.unit.playerNames,
      metricValue: entry.netToPar,
      displayValue:
        entry.holesPlayed === 0
          ? 'Not started'
          : `${entry.netToPar === 0 ? 'All square' : entry.netToPar > 0 ? `${entry.netToPar} up` : `${Math.abs(entry.netToPar)} down`} (${toParText(entry.netToPar)})`,
      holesPlayed: entry.holesPlayed,
      holesWon: 0,
      holesLost: 0,
      strokesToPar: entry.total,
      netToPar: entry.netToPar,
      memberCount: entry.unit.playerIds.length,
      cut: false
    }))
  };
}

export function rankBestBall(results: BestBallUnitResult[], cutUnitIds?: Set<string>): RankedFormatStanding {
  const cut = cutUnitIds ?? new Set<string>();
  const live = results.filter((entry) => !cut.has(entry.unit.id));
  const skipped = results.length - live.length;
  const sorted = [...live].sort(
    (a, b) => a.netToPar - b.netToPar || a.totalStrokes - b.totalStrokes || a.unit.label.localeCompare(b.unit.label)
  );
  const metrics = sorted.map((entry) => entry.netToPar);
  const positions = competitionNumbers(metrics);
  return {
    skipped,
    rows: sorted.map((entry, index) => ({
      unitId: entry.unit.id,
      label: entry.unit.label,
      position: positions[index],
      playerIds: entry.unit.playerIds,
      playerNames: entry.unit.playerNames,
      metricValue: entry.netToPar,
      displayValue: `${toParText(entry.netToPar)}`,
      holesPlayed: entry.holesPlayed,
      holesWon: 0,
      holesLost: 0,
      strokesToPar: entry.totalToPar,
      netToPar: entry.netToPar,
      memberCount: entry.unit.playerIds.length,
      cut: false
    }))
  };
}

export function resolveFormatUnits(
  format: ScoringFormat,
  members: Array<{ playerId: string; playerName: string; handicapIndex: number; pairingNo: number; flightId?: string }>,
  scrambleGroupSize = FORMAT_SCRAMBLE_GROUP_SIZE
): FormatUnit[] {
  if (format === 'best_ball' || format === 'scramble') {
    return buildScrambleGroups(members, format === 'scramble' ? scrambleGroupSize : 2);
  }
  return buildPairsFromPairings(members);
}