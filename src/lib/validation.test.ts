import { describe, it, expect } from 'vitest';
import {
  validateSeason,
  validateDivision,
  validatePlayer,
  validateTeam,
  validateTeamMember,
  validateTournament,
  validateRound,
  validateMatch,
  validateScorecardHoles,
  validateScorecardCompletion,
  resolveExpectedHoleNumbers,
  getMissingHoleNumbers,
} from './validation';

describe('TMGL Validation Helpers', () => {
  describe('validateSeason', () => {
    it('rejects empty name', () => {
      const result = validateSeason({ name: '', start_date: null, end_date: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Season name is required.');
    });

    it('rejects name shorter than 2 characters', () => {
      const result = validateSeason({ name: 'A', start_date: null, end_date: null });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('at least 2'))).toBe(true);
    });

    it('rejects name longer than 100 characters', () => {
      const result = validateSeason({ name: 'X'.repeat(101), start_date: null, end_date: null });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('100'))).toBe(true);
    });

    it('rejects start date after end date', () => {
      const result = validateSeason({ name: 'Summer 2026', start_date: '2026-09-01', end_date: '2026-06-01' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date must be before end date.');
    });

    it('accepts valid season with no dates', () => {
      const result = validateSeason({ name: 'Summer 2026', start_date: null, end_date: null });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts valid season with dates', () => {
      const result = validateSeason({ name: 'Summer 2026', start_date: '2026-06-01', end_date: '2026-09-01' });
      expect(result.isValid).toBe(true);
    });

    it('trims whitespace from name', () => {
      const result = validateSeason({ name: '  ', start_date: null, end_date: null });
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateDivision', () => {
    it('rejects empty name', () => {
      const result = validateDivision({ name: '', season_id: 'abc' });
      expect(result.isValid).toBe(false);
    });

    it('rejects missing season_id', () => {
      const result = validateDivision({ name: 'Division A', season_id: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A season must be selected.');
    });

    it('accepts valid division', () => {
      const result = validateDivision({ name: 'Division A', season_id: 'abc' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePlayer', () => {
    it('rejects empty name', () => {
      const result = validatePlayer({ full_name: '', phone: null, handicap_index: null, status: 'active' });
      expect(result.isValid).toBe(false);
    });

    it('rejects invalid phone format', () => {
      const result = validatePlayer({ full_name: 'John', phone: 'not-a-phone!!!', handicap_index: null, status: 'active' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Phone'))).toBe(true);
    });

    it('accepts valid phone', () => {
      const result = validatePlayer({ full_name: 'John', phone: '+1 555-123-4567', handicap_index: null, status: 'active' });
      expect(result.isValid).toBe(true);
    });

    it('rejects handicap out of range', () => {
      const result = validatePlayer({ full_name: 'John', phone: null, handicap_index: -1, status: 'active' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Handicap'))).toBe(true);

      const result2 = validatePlayer({ full_name: 'John', phone: null, handicap_index: 55, status: 'active' });
      expect(result2.isValid).toBe(false);
    });

    it('accepts valid handicap', () => {
      const result = validatePlayer({ full_name: 'John', phone: null, handicap_index: 12.5, status: 'active' });
      expect(result.isValid).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = validatePlayer({ full_name: 'John', phone: null, handicap_index: null, status: 'deleted' });
      expect(result.isValid).toBe(false);
    });

    it('accepts all valid statuses', () => {
      for (const status of ['active', 'inactive', 'suspended']) {
        const result = validatePlayer({ full_name: 'John', phone: null, handicap_index: null, status });
        expect(result.isValid).toBe(true);
      }
    });

    it('accepts empty phone', () => {
      const result = validatePlayer({ full_name: 'John', phone: '', handicap_index: null, status: 'active' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateTeam', () => {
    it('rejects empty name', () => {
      const result = validateTeam({ name: '', season_id: 'abc', division_id: null });
      expect(result.isValid).toBe(false);
    });

    it('rejects missing season_id', () => {
      const result = validateTeam({ name: 'Eagles', season_id: '', division_id: null });
      expect(result.isValid).toBe(false);
    });

    it('accepts valid team without division', () => {
      const result = validateTeam({ name: 'Eagles', season_id: 'abc', division_id: null });
      expect(result.isValid).toBe(true);
    });

    it('accepts valid team with division', () => {
      const result = validateTeam({ name: 'Eagles', season_id: 'abc', division_id: 'div1' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateTeamMember', () => {
    const existingMembers = [
      { team_id: 'team1', player_id: 'player1' },
      { team_id: 'team1', player_id: 'player2' },
      { team_id: 'team2', player_id: 'player3' },
    ];

    it('rejects missing team_id', () => {
      const result = validateTeamMember({ team_id: '', player_id: 'player4', existingMembers, teamSeasonId: 'season1' });
      expect(result.isValid).toBe(false);
    });

    it('rejects missing player_id', () => {
      const result = validateTeamMember({ team_id: 'team1', player_id: '', existingMembers, teamSeasonId: 'season1' });
      expect(result.isValid).toBe(false);
    });

    it('rejects duplicate membership in same team', () => {
      const result = validateTeamMember({ team_id: 'team1', player_id: 'player1', existingMembers, teamSeasonId: 'season1' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('already a member'))).toBe(true);
    });

    it('rejects player on another team in same season', () => {
      const result = validateTeamMember({ team_id: 'team2', player_id: 'player1', existingMembers, teamSeasonId: 'season1' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('already assigned to another team'))).toBe(true);
    });

    it('accepts valid new membership', () => {
      const result = validateTeamMember({ team_id: 'team2', player_id: 'player4', existingMembers, teamSeasonId: 'season1' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateTournament', () => {
    it('rejects empty name', () => {
      const result = validateTournament({ name: '', season_id: 's1', description: null, event_date: null, course_id: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tournament name is required.');
    });

    it('rejects missing season_id', () => {
      const result = validateTournament({ name: 'Championship', season_id: '', description: null, event_date: null, course_id: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A season must be selected.');
    });

    it('rejects name shorter than 2 characters', () => {
      const result = validateTournament({ name: 'A', season_id: 's1', description: null, event_date: null, course_id: null });
      expect(result.isValid).toBe(false);
    });

    it('accepts valid tournament', () => {
      const result = validateTournament({ name: 'Championship 2026', season_id: 's1', description: null, event_date: null, course_id: null });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateRound', () => {
    it('rejects empty tournament_id', () => {
      const result = validateRound({ tournament_id: '', round_number: 1, name: 'Round 1', date: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A tournament must be selected.');
    });

    it('rejects invalid round_number', () => {
      const result = validateRound({ tournament_id: 't1', round_number: 0, name: 'Round 1', date: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Round number must be a positive integer.');
    });

    it('rejects empty name', () => {
      const result = validateRound({ tournament_id: 't1', round_number: 1, name: '', date: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Round name is required.');
    });

    it('accepts valid round', () => {
      const result = validateRound({ tournament_id: 't1', round_number: 1, name: 'Stroke Play', date: null });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateMatch', () => {
    it('rejects empty round_id', () => {
      const result = validateMatch({ round_id: '', match_type: 'singles', team_a_id: null, team_b_id: null, player_a_id: 'p1', player_b_id: 'p2' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A round must be selected.');
    });

    it('rejects invalid match_type', () => {
      const result = validateMatch({ round_id: 'r1', match_type: 'invalid', team_a_id: null, team_b_id: null, player_a_id: null, player_b_id: null });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Match type'))).toBe(true);
    });

    it('requires players for singles match', () => {
      const result = validateMatch({ round_id: 'r1', match_type: 'singles', team_a_id: null, team_b_id: null, player_a_id: null, player_b_id: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Player A is required for a singles match.');
      expect(result.errors).toContain('Player B is required for a singles match.');
    });

    it('requires teams for team match', () => {
      const result = validateMatch({ round_id: 'r1', match_type: 'team', team_a_id: null, team_b_id: null, player_a_id: null, player_b_id: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Team A is required for a team match.');
      expect(result.errors).toContain('Team B is required for a team match.');
    });

    it('accepts valid singles match', () => {
      const result = validateMatch({ round_id: 'r1', match_type: 'singles', team_a_id: null, team_b_id: null, player_a_id: 'p1', player_b_id: 'p2' });
      expect(result.isValid).toBe(true);
    });

    it('accepts valid team match', () => {
      const result = validateMatch({ round_id: 'r1', match_type: 'team', team_a_id: 't1', team_b_id: 't2', player_a_id: null, player_b_id: null });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateScorecardHoles', () => {
    it('rejects empty holes', () => {
      const result = validateScorecardHoles([]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one hole score is required.');
    });

    it('rejects duplicate hole numbers', () => {
      const result = validateScorecardHoles([
        { hole_number: 1, par: 4, strokes: 5 },
        { hole_number: 1, par: 4, strokes: 6 },
      ]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true);
    });

    it('rejects invalid hole number', () => {
      const result = validateScorecardHoles([{ hole_number: 0, par: 4, strokes: 5 }]);
      expect(result.isValid).toBe(false);
    });

    it('rejects hole number exceeding total', () => {
      const result = validateScorecardHoles([{ hole_number: 19, par: 4, strokes: 5 }], 18);
      expect(result.isValid).toBe(false);
    });

    it('rejects invalid par', () => {
      const result = validateScorecardHoles([{ hole_number: 1, par: 2, strokes: 5 }]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Par'))).toBe(true);
    });

    it('rejects invalid strokes', () => {
      const result = validateScorecardHoles([{ hole_number: 1, par: 4, strokes: 0 }]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Strokes'))).toBe(true);
    });

    it('rejects strokes exceeding maximum', () => {
      const result = validateScorecardHoles([{ hole_number: 1, par: 4, strokes: 21 }]);
      expect(result.isValid).toBe(false);
    });

    it('accepts valid holes', () => {
      const result = validateScorecardHoles([
        { hole_number: 1, par: 4, strokes: 4 },
        { hole_number: 2, par: 3, strokes: 3 },
        { hole_number: 3, par: 5, strokes: 6 },
      ]);
      expect(result.isValid).toBe(true);
    });

    it('accepts 9-hole scorecard', () => {
      const holes = Array.from({ length: 9 }, (_, i) => ({ hole_number: i + 1, par: 4, strokes: 4 }));
      const result = validateScorecardHoles(holes, 9);
      expect(result.isValid).toBe(true);
    });

    it('does not require every hole', () => {
      const result = validateScorecardHoles([{ hole_number: 1, par: 4, strokes: 4 }], 18);
      expect(result.isValid).toBe(true);
    });
  });

  describe('resolveExpectedHoleNumbers', () => {
    it('uses the course hole count when available', () => {
      const result = resolveExpectedHoleNumbers({ holesCount: 9, courseHoleNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
      expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('falls back to course hole numbers when the count is unknown', () => {
      const result = resolveExpectedHoleNumbers({ holesCount: null, courseHoleNumbers: [10, 9, 10, 8] });
      expect(result).toEqual([8, 9, 10]);
    });

    it('sorts and dedupes course hole numbers', () => {
      const result = resolveExpectedHoleNumbers({ holesCount: undefined, courseHoleNumbers: [3, 1, 3, 2] });
      expect(result).toEqual([1, 2, 3]);
    });

    it('falls back to the course hole count when no hole rows exist', () => {
      const result = resolveExpectedHoleNumbers({ holesCount: 9, courseHoleNumbers: [] });
      expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('defaults to 18 holes when the course is unknown', () => {
      const result = resolveExpectedHoleNumbers({ holesCount: null, courseHoleNumbers: null });
      expect(result).toHaveLength(18);
      expect(result[0]).toBe(1);
      expect(result[17]).toBe(18);
    });

    it('ignores invalid hole numbers', () => {
      const result = resolveExpectedHoleNumbers({ holesCount: null, courseHoleNumbers: [0, -2, null, 2.5, 4] });
      expect(result).toEqual([4]);
    });

    it('ignores a non-positive or non-integer hole count', () => {
      expect(resolveExpectedHoleNumbers({ holesCount: 0, courseHoleNumbers: [1, 2] })).toEqual([1, 2]);
      expect(resolveExpectedHoleNumbers({ holesCount: 12.5, courseHoleNumbers: [1, 2] })).toEqual([1, 2]);
    });
  });

  describe('getMissingHoleNumbers', () => {
    it('returns holes without a score', () => {
      expect(getMissingHoleNumbers([1, 2, 3], [1, 2, 3, 4])).toEqual([4]);
    });

    it('returns every expected hole when nothing is scored', () => {
      expect(getMissingHoleNumbers([], [1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('ignores duplicate and invalid scores', () => {
      expect(getMissingHoleNumbers([1, 1, 0, null], [1, 2])).toEqual([2]);
    });
  });

  describe('validateScorecardCompletion', () => {
    it('rejects a partially scored card', () => {
      const holes = Array.from({ length: 17 }, (_, i) => ({ hole_number: i + 1, strokes: 4 }));
      const result = validateScorecardCompletion(holes, Array.from({ length: 18 }, (_, i) => i + 1));
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('18 holes must be scored');
      expect(result.errors[0]).toContain('Missing: 18');
    });

    it('rejects an empty card', () => {
      const result = validateScorecardCompletion([], [1, 2, 3]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Missing: 1, 2, 3');
    });

    it('accepts a complete 18-hole card', () => {
      const holes = Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1, strokes: 4 }));
      const result = validateScorecardCompletion(holes, Array.from({ length: 18 }, (_, i) => i + 1));
      expect(result.isValid).toBe(true);
    });

    it('accepts a complete 9-hole card', () => {
      const expected = Array.from({ length: 9 }, (_, i) => i + 1);
      const holes = expected.map((hole_number) => ({ hole_number, strokes: 3 }));
      const result = validateScorecardCompletion(holes, expected);
      expect(result.isValid).toBe(true);
    });

    it('rejects holes that are not part of the course', () => {
      const result = validateScorecardCompletion(
        [{ hole_number: 1, strokes: 4 }, { hole_number: 2, strokes: 4 }, { hole_number: 10, strokes: 4 }],
        [1, 2]
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Holes not part of this course: 10'))).toBe(true);
    });

    it('fails when the course layout cannot be resolved', () => {
      const result = validateScorecardCompletion([], []);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Course hole layout could not be resolved.');
    });
  });
});
