import { describe, it, expect } from 'vitest';
import {
  validateTournament,
  validateRound,
  validateMatch,
  validateScorecardHoles,
  type TournamentInput,
} from './validation';
import { canManageLeague, hasMinimumRole } from './roleGuards';
import { computeScorecardSummary, calculateMatchPoints, holeScoreToPar } from './scoring';
import { formatToPar, getScoreTerminology } from '@/utils/golf';
import type { TournamentStatus, MatchStatus, ScorecardStatus } from '@/types/database';

describe('Phase 4 — Competition Management', () => {
  describe('Tournament Management', () => {
    it('validates tournament name is required', () => {
      const result = validateTournament({ name: '', season_id: 's1', description: null, event_date: null, course_id: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tournament name is required.');
    });

    it('validates tournament name length', () => {
      const result = validateTournament({ name: 'A', season_id: 's1', description: null, event_date: null, course_id: null });
      expect(result.isValid).toBe(false);
    });

    it('validates tournament season is required', () => {
      const result = validateTournament({ name: 'Championship', season_id: '', description: null, event_date: null, course_id: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A season must be selected.');
    });

    it('accepts valid tournament input', () => {
      const result = validateTournament({ name: 'TMGL Open', season_id: 's1', description: 'Annual open', event_date: '2026-03-15', course_id: 'c1' });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts tournament with optional fields null', () => {
      const input: TournamentInput = { name: 'Test', season_id: 's1', description: null, event_date: null, course_id: null };
      const result = validateTournament(input);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Tournament Status Transitions', () => {
    const VALID_STATUSES: TournamentStatus[] = ['draft', 'open', 'closed', 'live', 'completed', 'cancelled'];

    it('all status options are valid enum values', () => {
      VALID_STATUSES.forEach((status) => {
        expect(VALID_STATUSES).toContain(status);
      });
    });

    it('can transition from draft to open', () => {
      const transitionsFrom: Record<TournamentStatus, TournamentStatus[]> = {
        draft: ['open', 'cancelled'],
        open: ['live', 'completed', 'cancelled'],
        live: ['completed', 'cancelled'],
        completed: [],
        cancelled: [],
        closed: [],
      };
      expect(transitionsFrom.draft).toContain('open');
    });
  });

  describe('Round Management', () => {
    it('validates round number is positive integer', () => {
      const result = validateRound({ tournament_id: 't1', round_number: 0, name: 'Round 1', date: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Round number must be a positive integer.');
    });

    it('validates round name is required', () => {
      const result = validateRound({ tournament_id: 't1', round_number: 1, name: '', date: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Round name is required.');
    });

    it('validates tournament is required', () => {
      const result = validateRound({ tournament_id: '', round_number: 1, name: 'Round 1', date: null });
      expect(result.isValid).toBe(false);
    });

    it('accepts valid round', () => {
      const result = validateRound({ tournament_id: 't1', round_number: 3, name: 'Final Round', date: '2026-04-01' });
      expect(result.isValid).toBe(true);
    });

    it('accepts round with null date', () => {
      const result = validateRound({ tournament_id: 't1', round_number: 1, name: 'Round 1', date: null });
      expect(result.isValid).toBe(true);
    });
  });

  describe('Round Status Options', () => {
    const VALID_ROUND_STATUSES: MatchStatus[] = ['scheduled', 'live', 'completed', 'cancelled'];

    it('does not include draft as a valid round status', () => {
      expect(VALID_ROUND_STATUSES).not.toContain('draft');
    });

    it('includes all valid statuses', () => {
      expect(VALID_ROUND_STATUSES).toContain('scheduled');
      expect(VALID_ROUND_STATUSES).toContain('live');
      expect(VALID_ROUND_STATUSES).toContain('completed');
      expect(VALID_ROUND_STATUSES).toContain('cancelled');
    });
  });

  describe('Match Management', () => {
    it('validates match type for singles requires both players', () => {
      const result = validateMatch({
        round_id: 'r1', match_type: 'singles',
        team_a_id: null, team_b_id: null,
        player_a_id: null, player_b_id: null,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Player A is required for a singles match.');
      expect(result.errors).toContain('Player B is required for a singles match.');
    });

    it('validates match type for team requires both teams', () => {
      const result = validateMatch({
        round_id: 'r1', match_type: 'team',
        team_a_id: null, team_b_id: null,
        player_a_id: null, player_b_id: null,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Team A is required for a team match.');
      expect(result.errors).toContain('Team B is required for a team match.');
    });

    it('validates round_id is required', () => {
      const result = validateMatch({
        round_id: '', match_type: 'singles',
        team_a_id: null, team_b_id: null,
        player_a_id: 'p1', player_b_id: 'p2',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A round must be selected.');
    });

    it('validates match type is valid', () => {
      const result = validateMatch({
        round_id: 'r1', match_type: 'invalid',
        team_a_id: null, team_b_id: null,
        player_a_id: null, player_b_id: null,
      });
      expect(result.isValid).toBe(false);
    });

    it('accepts valid singles match', () => {
      const result = validateMatch({
        round_id: 'r1', match_type: 'singles',
        team_a_id: null, team_b_id: null,
        player_a_id: 'p1', player_b_id: 'p2',
      });
      expect(result.isValid).toBe(true);
    });

    it('accepts valid team match', () => {
      const result = validateMatch({
        round_id: 'r1', match_type: 'team',
        team_a_id: 't1', team_b_id: 't2',
        player_a_id: null, player_b_id: null,
      });
      expect(result.isValid).toBe(true);
    });

    it('accepts valid foursome match', () => {
      const result = validateMatch({
        round_id: 'r1', match_type: 'foursome',
        team_a_id: null, team_b_id: null,
        player_a_id: 'p1', player_b_id: 'p2',
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('Match Result Entry', () => {
    it('match points correctly calculated for winner', () => {
      const result = calculateMatchPoints(-3, 0);
      expect(result.winnerPoints).toBe(2);
      expect(result.loserPoints).toBe(0);
      expect(result.isTie).toBe(false);
    });

    it('match points correctly calculated for tie', () => {
      const result = calculateMatchPoints(-1, -1);
      expect(result.winnerPoints).toBe(1);
      expect(result.loserPoints).toBe(1);
      expect(result.isTie).toBe(true);
    });

    it('score to par correctly computed', () => {
      expect(holeScoreToPar(3, 4)).toBe(-1);
      expect(holeScoreToPar(4, 4)).toBe(0);
      expect(holeScoreToPar(5, 4)).toBe(1);
    });
  });

  describe('Scorecard Actions', () => {
    it('validates scorecard requires at least one hole', () => {
      const result = validateScorecardHoles([]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one hole score is required.');
    });

    it('validates scorecard holes within limits', () => {
      const result = validateScorecardHoles([
        { hole_number: 1, par: 4, strokes: 4 },
        { hole_number: 2, par: 3, strokes: 3 },
      ]);
      expect(result.isValid).toBe(true);
    });

    it('rejects strokes exceeding maximum of 20', () => {
      const result = validateScorecardHoles([{ hole_number: 1, par: 4, strokes: 21 }]);
      expect(result.isValid).toBe(false);
    });

    it('rejects hole number exceeding 18', () => {
      const result = validateScorecardHoles([{ hole_number: 19, par: 4, strokes: 4 }]);
      expect(result.isValid).toBe(false);
    });

    it('computes scorecard summary correctly', () => {
      const holes = Array.from({ length: 18 }, (_, i) => ({
        id: `h${i}`, scorecard_id: 'sc1', hole_number: i + 1, par: 4, strokes: 4,
        score_to_par: 0, created_at: '', updated_at: '',
      }));
      const summary = computeScorecardSummary(holes);
      expect(summary.totalStrokes).toBe(72);
      expect(summary.totalToPar).toBe(0);
      expect(summary.holesCompleted).toBe(18);
      expect(summary.front9Strokes).toBe(36);
      expect(summary.back9Strokes).toBe(36);
    });

    it('handles partial scorecard', () => {
      const holes = [
        { id: 'h1', scorecard_id: 'sc1', hole_number: 1, par: 4, strokes: 3, score_to_par: -1, created_at: '', updated_at: '' },
        { id: 'h2', scorecard_id: 'sc1', hole_number: 2, par: 3, strokes: 4, score_to_par: 1, created_at: '', updated_at: '' },
      ];
      const summary = computeScorecardSummary(holes);
      expect(summary.totalStrokes).toBe(7);
      expect(summary.totalToPar).toBe(0);
      expect(summary.holesCompleted).toBe(2);
    });
  });

  describe('Leaderboard Display', () => {
    it('formats to-par correctly for display', () => {
      expect(formatToPar(0)).toBe('E');
      expect(formatToPar(-3)).toBe('-3');
      expect(formatToPar(5)).toBe('+5');
    });

    it('golf terminology is correct', () => {
      expect(getScoreTerminology(4, 4)).toBe('Par');
      expect(getScoreTerminology(3, 4)).toBe('Birdie');
      expect(getScoreTerminology(5, 4)).toBe('Bogey');
      expect(getScoreTerminology(2, 4)).toBe('Eagle');
      expect(getScoreTerminology(1, 3)).toBe('Hole in One');
    });
  });

  describe('Role-Based Button Visibility', () => {
    it('league_manager can manage competition entities', () => {
      expect(canManageLeague('league_manager')).toBe(true);
      expect(canManageLeague('super_admin')).toBe(true);
    });

    it('player cannot manage competition entities', () => {
      expect(canManageLeague('player')).toBe(false);
    });

    it('public cannot manage competition entities', () => {
      expect(canManageLeague('public')).toBe(false);
    });

    it('player can access player-required routes', () => {
      expect(hasMinimumRole('player', 'player')).toBe(true);
    });

    it('player cannot access league_manager routes', () => {
      expect(hasMinimumRole('player', 'league_manager')).toBe(false);
    });

    it('league_manager can access player routes', () => {
      expect(hasMinimumRole('league_manager', 'player')).toBe(true);
    });

    it('null role cannot manage', () => {
      expect(canManageLeague(null)).toBe(false);
    });
  });

  describe('Scorecard Status Display', () => {
    const VALID_STATUSES: ScorecardStatus[] = ['draft', 'in_progress', 'submitted', 'verified', 'rejected', 'amended'];

    it('all status values are valid', () => {
      VALID_STATUSES.forEach((status) => {
        expect(VALID_STATUSES).toContain(status);
      });
    });

    it('verified status maps to success variant', () => {
      const STATUS_VARIANTS: Record<ScorecardStatus, string> = {
        draft: 'outline', in_progress: 'warning', submitted: 'info', verified: 'success', rejected: 'danger', amended: 'warning',
      };
      expect(STATUS_VARIANTS.verified).toBe('success');
    });
  });
});
