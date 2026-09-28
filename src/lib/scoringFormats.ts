import type { ScoringFormat } from '@/types/database';

export interface ScoringFormatOption {
  value: ScoringFormat;
  label: string;
  hint: string;
  teamBased: boolean;
  measuredInPoints: boolean;
}

export const SCORING_FORMATS: ScoringFormatOption[] = [
  {
    value: 'stroke_play',
    label: 'Stroke Play',
    hint: 'Lowest total score wins. Default for classic golf tournaments.',
    teamBased: false,
    measuredInPoints: false
  },
  {
    value: 'stableford',
    label: 'Stableford',
    hint: 'Points per hole against par. Highest points win; a double-bogey or worse scores zero.',
    teamBased: false,
    measuredInPoints: true
  },
  {
    value: 'match_play',
    label: 'Match Play',
    hint: 'Head-to-head hole by hole. Ranking is on holes won, then holes lost.',
    teamBased: true,
    measuredInPoints: false
  },
  {
    value: 'nassau',
    label: 'Nassau',
    hint: 'Longest match won by aggregate strokes relative to par. Best of front nine, back nine and total.',
    teamBased: true,
    measuredInPoints: false
  },
  {
    value: 'best_ball',
    label: 'Best Ball',
    hint: 'Two-player teams. Each hole counts the team’s lowest score. Lowest total wins.',
    teamBased: true,
    measuredInPoints: false
  },
  {
    value: 'scramble',
    label: 'Scramble',
    hint: 'Team event where only one score counts per hole. Counting format must be agreed before play.',
    teamBased: true,
    measuredInPoints: false
  }
];

export const DEFAULT_SCORING_FORMAT: ScoringFormat = 'stroke_play';

export function getScoringFormat(value: string | null | undefined): ScoringFormatOption {
  return (
    SCORING_FORMATS.find((f) => f.value === value) ??
    SCORING_FORMATS.find((f) => f.value === DEFAULT_SCORING_FORMAT)!
  );
}

export function isTeamBasedFormat(format: string | null | undefined): boolean {
  return getScoringFormat(format).teamBased;
}

export function isPointsFormat(format: string | null | undefined): boolean {
  return getScoringFormat(format).measuredInPoints;
}
