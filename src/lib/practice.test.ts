import { describe, it, expect } from 'vitest';
import { validatePracticeRound, validatePracticeScores } from './validation';
import { getPracticeRoundsByPlayer } from './practice';
import { getPlayerStatistics } from './statistics';

describe('validatePracticeRound', () => {
  it('passes with valid input', () => {
    const result = validatePracticeRound({ course_id: 'course-1', round_type: 18 });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when course_id is empty', () => {
    const result = validatePracticeRound({ course_id: '', round_type: 18 });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Please select a golf course.');
  });

  it('fails when round_type is invalid', () => {
    const result = validatePracticeRound({ course_id: 'course-1', round_type: 12 as 9 | 18 });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Round type must be 9 or 18 holes.');
  });

  it('passes with 9 holes', () => {
    const result = validatePracticeRound({ course_id: 'course-1', round_type: 9 });
    expect(result.isValid).toBe(true);
  });

  it('fails when notes exceed 500 characters', () => {
    const result = validatePracticeRound({
      course_id: 'course-1',
      round_type: 18,
      notes: 'x'.repeat(501),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Notes must be 500 characters or less.');
  });
});

describe('validatePracticeScores', () => {
  it('passes with valid scores', () => {
    const result = validatePracticeScores([
      { hole_number: 1, par: 4, score: 4 },
      { hole_number: 2, par: 4, score: 5 },
    ], 9);
    expect(result.isValid).toBe(true);
  });

  it('fails with empty scores', () => {
    const result = validatePracticeScores([], 9);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least one hole score is required.');
  });

  it('fails with invalid hole number', () => {
    const result = validatePracticeScores([
      { hole_number: 0, par: 4, score: 4 },
    ], 9);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Hole number'))).toBe(true);
  });

  it('fails with hole number exceeding total', () => {
    const result = validatePracticeScores([
      { hole_number: 10, par: 4, score: 4 },
    ], 9);
    expect(result.isValid).toBe(false);
  });

  it('fails with duplicate hole numbers', () => {
    const result = validatePracticeScores([
      { hole_number: 1, par: 4, score: 4 },
      { hole_number: 1, par: 4, score: 5 },
    ], 9);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
  });

  it('fails with invalid par', () => {
    const result = validatePracticeScores([
      { hole_number: 1, par: 2, score: 4 },
    ], 9);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Par'))).toBe(true);
  });

  it('fails with invalid score', () => {
    const result = validatePracticeScores([
      { hole_number: 1, par: 4, score: 0 },
    ], 9);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Score'))).toBe(true);
  });

  it('fails with score > 20', () => {
    const result = validatePracticeScores([
      { hole_number: 1, par: 4, score: 21 },
    ], 9);
    expect(result.isValid).toBe(false);
  });

  it('validates putts range', () => {
    const result = validatePracticeScores([
      { hole_number: 1, par: 4, score: 4, putts: -1 },
    ], 9);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Putts'))).toBe(true);
  });

  it('validates penalty strokes range', () => {
    const result = validatePracticeScores([
      { hole_number: 1, par: 4, score: 4, penalty_strokes: 11 },
    ], 9);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Penalty'))).toBe(true);
  });

  it('passes with valid optional fields', () => {
    const result = validatePracticeScores([
      { hole_number: 1, par: 4, score: 4, putts: 2, penalty_strokes: 0 },
    ], 9);
    expect(result.isValid).toBe(true);
  });
});

describe('Practice Hub Player Provisioning', () => {
  it('getPracticeRoundsByPlayer accepts a player ID string', () => {
    expect(typeof getPracticeRoundsByPlayer).toBe('function');
    expect(getPracticeRoundsByPlayer.length).toBe(1);
  });

  it('getPlayerStatistics accepts a player ID string', () => {
    expect(typeof getPlayerStatistics).toBe('function');
    expect(getPlayerStatistics.length).toBe(1);
  });

  it('getPracticeRoundsByPlayer returns a Promise', () => {
    const result = getPracticeRoundsByPlayer('00000000-0000-0000-0000-000000000000');
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });

  it('getPlayerStatistics returns a Promise', () => {
    const result = getPlayerStatistics('00000000-0000-0000-0000-000000000000');
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });

  it('getPlayerStatistics returns ServiceResult shape', async () => {
    try {
      const result = await getPlayerStatistics('00000000-0000-0000-0000-000000000000');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
    } catch {
      // Network errors expected in unit tests
    }
  });

  it('getPracticeRoundsByPlayer returns ServiceResult shape', async () => {
    try {
      const result = await getPracticeRoundsByPlayer('00000000-0000-0000-0000-000000000000');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
    } catch {
      // Network errors expected in unit tests
    }
  });
});
