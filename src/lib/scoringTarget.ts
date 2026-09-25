import { resolveExpectedHoleNumbers } from '@/lib/validation';
import type { ScorecardStatus } from '@/types/database';

export interface CourseHoleLike {
  hole_number: number;
  par: number;
}

export interface CourseLike {
  id: string;
  holes_count?: number | null;
}

export interface RoundLike {
  id: string;
  tournament_id: string;
}

export interface TournamentLike {
  id: string;
  course_id?: string | null;
}

export interface ScoringTarget {
  roundId: string;
  tournamentId: string | null;
  courseId: string | null;
  pars: Record<number, number>;
  expectedHoles: number[];
  holeCount: number;
}

export function buildCourseParMap(courseHoles: CourseHoleLike[]): Record<number, number> {
  const pars: Record<number, number> = {};
  for (const hole of courseHoles) {
    if (typeof hole?.hole_number !== 'number' || !Number.isInteger(hole.hole_number)) continue;
    pars[hole.hole_number] = hole.par;
  }
  return pars;
}

export function resolveScoringTarget(input: {
  round: RoundLike | null;
  tournament?: TournamentLike | null;
  course?: CourseLike | null;
  courseHoles?: CourseHoleLike[] | null;
  fallbackCourseId?: string | null;
}): ScoringTarget {
  const round = input.round;
  const courseHoles = input.courseHoles ?? [];
  const expectedHoles = resolveExpectedHoleNumbers({
    holesCount: input.course?.holes_count ?? null,
    courseHoleNumbers: courseHoles.map((h) => h.hole_number),
  });
  const pars = buildCourseParMap(courseHoles);

  if (courseHoles.length === 0) {
    for (const holeNumber of expectedHoles) {
      if (pars[holeNumber] === undefined) pars[holeNumber] = 4;
    }
  }

  return {
    roundId: round?.id ?? '',
    tournamentId: round?.tournament_id ?? null,
    courseId: input.course?.id ?? input.tournament?.course_id ?? input.fallbackCourseId ?? null,
    pars,
    expectedHoles,
    holeCount: expectedHoles.length,
  };
}

export function isScoringTargetUsable(target: ScoringTarget | null): boolean {
  return Boolean(target && target.roundId && target.courseId && target.expectedHoles.length > 0);
}

export function resolveScorecardSaveStatus(input: {
  hasScores: boolean;
  submit: boolean;
}): ScorecardStatus {
  if (input.submit) return 'submitted';
  return input.hasScores ? 'in_progress' : 'draft';
}
