import { describe, it, expect } from 'vitest';
import {
  buildCourseParMap,
  isScoringTargetUsable,
  resolveScorecardSaveStatus,
  resolveScoringTarget,
} from './scoringTarget';
import { buildHoleEntries, computeTotalsFromHoles, parseStrokeInput } from './scoring';

const ROUND = { id: 'r1', tournament_id: 't1' };
const TOURNAMENT = { id: 't1', course_id: 'course-1' };

function courseHoles(count: number) {
  return Array.from({ length: count }, (_, i) => ({ hole_number: i + 1, par: 4 }));
}

describe('resolveScoringTarget', () => {
  it('resolves the course for a round through its tournament', () => {
    const target = resolveScoringTarget({
      round: ROUND,
      tournament: TOURNAMENT,
      course: { id: 'course-1', holes_count: 9 },
      courseHoles: courseHoles(9),
    });

    expect(target.roundId).toBe('r1');
    expect(target.tournamentId).toBe('t1');
    expect(target.courseId).toBe('course-1');
    expect(target.holeCount).toBe(9);
    expect(target.expectedHoles).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(target.pars[1]).toBe(4);
  });

  it('is not usable when the round has no course', () => {
    const target = resolveScoringTarget({
      round: ROUND,
      tournament: { id: 't1', course_id: null },
      course: null,
      courseHoles: [],
    });

    expect(target.courseId).toBeNull();
    expect(isScoringTargetUsable(target)).toBe(false);
  });

  it('is not usable without a round', () => {
    expect(isScoringTargetUsable(null)).toBe(false);
    expect(isScoringTargetUsable(resolveScoringTarget({ round: null, course: null, courseHoles: [] }))).toBe(false);
  });

  it('falls back to a scorecard course when the tournament has none', () => {
    const target = resolveScoringTarget({
      round: ROUND,
      tournament: { id: 't1', course_id: null },
      course: null,
      courseHoles: courseHoles(18),
      fallbackCourseId: 'course-legacy',
    });

    expect(target.courseId).toBe('course-legacy');
    expect(target.holeCount).toBe(18);
  });

  it('derives pars from course hole rows', () => {
    const pars = buildCourseParMap([
      { hole_number: 1, par: 4 },
      { hole_number: 2, par: 3 },
      { hole_number: 2, par: 5 },
    ]);

    expect(pars).toEqual({ 1: 4, 2: 5 });
  });
});

describe('resolveScorecardSaveStatus', () => {
  it('autosaves partial scores as in_progress', () => {
    expect(resolveScorecardSaveStatus({ hasScores: true, submit: false })).toBe('in_progress');
  });

  it('autosaves an empty card as draft', () => {
    expect(resolveScorecardSaveStatus({ hasScores: false, submit: false })).toBe('draft');
  });

  it('submits when the card is being submitted', () => {
    expect(resolveScorecardSaveStatus({ hasScores: true, submit: true })).toBe('submitted');
    expect(resolveScorecardSaveStatus({ hasScores: false, submit: true })).toBe('submitted');
  });
});

describe('hole score helpers', () => {
  it('parses valid stroke input only', () => {
    expect(parseStrokeInput('4')).toBe(4);
    expect(parseStrokeInput(7)).toBe(7);
    expect(parseStrokeInput('')).toBeNull();
    expect(parseStrokeInput('0')).toBeNull();
    expect(parseStrokeInput('21')).toBeNull();
    expect(parseStrokeInput('abc')).toBeNull();
    expect(parseStrokeInput(null)).toBeNull();
  });

  it('only builds entries for scored holes of the course', () => {
    const entries = buildHoleEntries({ 1: '4', 2: '3', 3: 'x', 9: '2' }, { 1: 4, 2: 3, 3: 5, 9: 4 }, [1, 2, 3]);

    expect(entries).toEqual([
      { holeNumber: 1, par: 4, strokes: 4 },
      { holeNumber: 2, par: 3, strokes: 3 },
    ]);
  });

  it('ignores blank and out-of-course input', () => {
    expect(buildHoleEntries({ 1: '' }, { 1: 4 }, [1, 2])).toEqual([]);
    expect(buildHoleEntries({ 19: '4' }, { 19: 4 }, [1, 2])).toEqual([]);
  });

  it('computes totals from hole scores', () => {
    const totals = computeTotalsFromHoles([
      { par: 4, strokes: 3 },
      { par: 3, strokes: 4 },
      { par: 5, strokes: 5 },
    ]);

    expect(totals).toEqual({ totalStrokes: 12, totalPar: 12, totalToPar: 0, holesCompleted: 3 });
  });

  it('returns zeroed totals for an empty card', () => {
    expect(computeTotalsFromHoles([])).toEqual({
      totalStrokes: 0,
      totalPar: 0,
      totalToPar: 0,
      holesCompleted: 0,
    });
  });
});
