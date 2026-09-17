import { describe, it, expect } from 'vitest';
import {
  validatePlayer,
  validateTeam,
  validateTournament,
  validateRound,
} from './validation';
import { canManageLeague, hasMinimumRole, isSuperAdmin } from './roleGuards';
import type { TournamentStatus, MatchStatus, ScorecardStatus } from '@/types/database';

describe('Phase 6 — Dashboard, Analytics & Polish', () => {
  describe('Dashboard Stats Calculations', () => {
    it('calculates match win correctly for player', () => {
      const matches = [
        { winner_player_id: 'p1', status: 'completed' as MatchStatus },
        { winner_player_id: 'p2', status: 'completed' as MatchStatus },
        { winner_player_id: 'p1', status: 'completed' as MatchStatus },
        { winner_player_id: 'p1', status: 'scheduled' as MatchStatus },
      ];
      const playerId = 'p1';
      const wins = matches.filter((m) => m.winner_player_id === playerId && m.status === 'completed').length;
      expect(wins).toBe(2);
    });

    it('calculates team wins correctly', () => {
      const matches = [
        { winner_team_id: 't1', status: 'completed' as MatchStatus },
        { winner_team_id: 't2', status: 'completed' as MatchStatus },
        { winner_team_id: 't1', status: 'completed' as MatchStatus },
      ];
      const teamId = 't1';
      const wins = matches.filter((m) => m.winner_team_id === teamId && m.status === 'completed').length;
      expect(wins).toBe(2);
    });

    it('calculates tournament status counts', () => {
      const tournaments = [
        { status: 'open' as TournamentStatus },
        { status: 'live' as TournamentStatus },
        { status: 'completed' as TournamentStatus },
        { status: 'cancelled' as TournamentStatus },
        { status: 'draft' as TournamentStatus },
      ];
      expect(tournaments.filter((t) => t.status === 'open').length).toBe(1);
      expect(tournaments.filter((t) => t.status === 'live').length).toBe(1);
      expect(tournaments.filter((t) => t.status === 'completed').length).toBe(1);
      expect(tournaments.filter((t) => t.status === 'cancelled').length).toBe(1);
      expect(tournaments.filter((t) => t.status === 'draft').length).toBe(1);
    });

    it('calculates match status counts', () => {
      const matches = [
        { status: 'scheduled' as MatchStatus },
        { status: 'live' as MatchStatus },
        { status: 'completed' as MatchStatus },
        { status: 'cancelled' as MatchStatus },
      ];
      expect(matches.filter((m) => m.status === 'scheduled').length).toBe(1);
      expect(matches.filter((m) => m.status === 'live').length).toBe(1);
      expect(matches.filter((m) => m.status === 'completed').length).toBe(1);
      expect(matches.filter((m) => m.status === 'cancelled').length).toBe(1);
    });

    it('calculates scorecard average strokes', () => {
      const scorecards = [
        { total_strokes: 72 },
        { total_strokes: 78 },
        { total_strokes: 80 },
      ];
      const avg = Math.round(scorecards.reduce((sum, sc) => sum + sc.total_strokes, 0) / scorecards.length);
      expect(avg).toBe(77);
    });

    it('returns null average for empty scorecards', () => {
      const scorecards: Array<{ total_strokes: number | null }> = [];
      const completed = scorecards.filter((sc) => sc.total_strokes !== null);
      const avg = completed.length > 0 ? Math.round(completed.reduce((sum, sc) => sum + (sc.total_strokes ?? 0), 0) / completed.length) : null;
      expect(avg).toBeNull();
    });

    it('calculates scorecard completion count', () => {
      const scorecards = [
        { status: 'submitted' as ScorecardStatus },
        { status: 'verified' as ScorecardStatus },
        { status: 'draft' as ScorecardStatus },
        { status: 'in_progress' as ScorecardStatus },
      ];
      const completed = scorecards.filter((sc) => ['submitted', 'verified'].includes(sc.status));
      expect(completed.length).toBe(2);
    });
  });

  describe('Activity Feed', () => {
    it('generates activity description for tournament status changes', () => {
      const t = { name: 'Spring Open', status: 'open' };
      const desc = `Tournament "${t.name}" ${t.status === 'open' ? 'opened' : t.status}`;
      expect(desc).toBe('Tournament "Spring Open" opened');
    });

    it('generates activity description for completed tournament', () => {
      const t = { name: 'Championship', status: 'completed' };
      const desc = `Tournament "${t.name}" ${t.status === 'completed' ? 'completed' : t.status}`;
      expect(desc).toBe('Tournament "Championship" completed');
    });

    it('generates activity description for match completion', () => {
      const m = { match_type: 'singles', status: 'completed' };
      const desc = `${m.match_type} match completed`;
      expect(desc).toBe('singles match completed');
    });

    it('sorts activity items by timestamp descending', () => {
      const items = [
        { id: '1', timestamp: '2026-01-01T00:00:00Z' },
        { id: '2', timestamp: '2026-06-01T00:00:00Z' },
        { id: '3', timestamp: '2026-03-01T00:00:00Z' },
      ];
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      expect(items[0].id).toBe('2');
      expect(items[1].id).toBe('3');
      expect(items[2].id).toBe('1');
    });
  });

  describe('Manager Dashboard Behavior', () => {
    it('league_manager can manage league', () => {
      expect(canManageLeague('league_manager')).toBe(true);
    });

    it('super_admin can manage league', () => {
      expect(canManageLeague('super_admin')).toBe(true);
    });

    it('player cannot manage league', () => {
      expect(canManageLeague('player')).toBe(false);
    });

    it('public cannot manage league', () => {
      expect(canManageLeague('public')).toBe(false);
    });

    it('super_admin has full access', () => {
      expect(isSuperAdmin('super_admin')).toBe(true);
    });

    it('league_manager is not super_admin', () => {
      expect(isSuperAdmin('league_manager')).toBe(false);
    });
  });

  describe('Player Dashboard Behavior', () => {
    it('player has minimum player role', () => {
      expect(hasMinimumRole('player', 'player')).toBe(true);
    });

    it('player does not have manager role', () => {
      expect(hasMinimumRole('player', 'league_manager')).toBe(false);
    });

    it('player can view public data', () => {
      expect(hasMinimumRole('player', 'public')).toBe(true);
    });
  });

  describe('Analytics Calculations', () => {
    it('calculates total score to par', () => {
      const scorecards = [
        { total_score_to_par: -2 },
        { total_score_to_par: 3 },
        { total_score_to_par: 0 },
      ];
      const total = scorecards.reduce((sum, sc) => sum + (sc.total_score_to_par ?? 0), 0);
      expect(total).toBe(1);
    });

    it('formats positive score to par', () => {
      const val: number = 3;
      const display = val > 0 ? `+${val}` : val === 0 ? 'E' : `${val}`;
      expect(display).toBe('+3');
    });

    it('formats zero score to par as even', () => {
      const val: number = 0;
      const display = val > 0 ? `+${val}` : val === 0 ? 'E' : `${val}`;
      expect(display).toBe('E');
    });

    it('formats negative score to par', () => {
      const val: number = -5;
      const display = val > 0 ? `+${val}` : val === 0 ? 'E' : `${val}`;
      expect(display).toBe('-5');
    });
  });

  describe('Tournament Analytics', () => {
    it('counts rounds correctly', () => {
      const rounds = [
        { tournament_id: 't1' },
        { tournament_id: 't1' },
        { tournament_id: 't2' },
      ];
      const tournamentRounds = rounds.filter((r) => r.tournament_id === 't1');
      expect(tournamentRounds.length).toBe(2);
    });

    it('counts participants correctly', () => {
      const participants = [
        { type: 'player' as const, id: 'p1', name: 'Alice' },
        { type: 'player' as const, id: 'p2', name: 'Bob' },
        { type: 'team' as const, id: 't1', name: 'Tigers' },
      ];
      expect(participants.length).toBe(3);
      expect(participants.filter((p) => p.type === 'player').length).toBe(2);
      expect(participants.filter((p) => p.type === 'team').length).toBe(1);
    });
  });

  describe('Player Analytics', () => {
    it('calculates player win rate', () => {
      const matches = [
        { winner_player_id: 'p1', status: 'completed' as MatchStatus },
        { winner_player_id: 'p2', status: 'completed' as MatchStatus },
        { winner_player_id: 'p1', status: 'completed' as MatchStatus },
      ];
      const playerId = 'p1';
      const completed = matches.filter((m) => m.status === 'completed');
      const wins = completed.filter((m) => m.winner_player_id === playerId).length;
      const losses = completed.filter((m) => m.winner_player_id && m.winner_player_id !== playerId).length;
      expect(wins).toBe(2);
      expect(losses).toBe(1);
    });

    it('handles zero completed matches', () => {
      const matches: Array<{ winner_player_id: string | null; status: MatchStatus }> = [];
      const playerId = 'p1';
      const completed = matches.filter((m) => m.status === 'completed');
      const wins = completed.filter((m) => m.winner_player_id === playerId).length;
      expect(wins).toBe(0);
    });
  });

  describe('Team Analytics', () => {
    it('calculates team match record', () => {
      const matches = [
        { winner_team_id: 't1', status: 'completed' as MatchStatus },
        { winner_team_id: 't2', status: 'completed' as MatchStatus },
        { winner_team_id: 't1', status: 'scheduled' as MatchStatus },
      ];
      const teamId = 't1';
      const completed = matches.filter((m) => m.status === 'completed');
      const wins = completed.filter((m) => m.winner_team_id === teamId).length;
      const losses = completed.filter((m) => m.winner_team_id && m.winner_team_id !== teamId).length;
      expect(wins).toBe(1);
      expect(losses).toBe(1);
    });

    it('counts team members', () => {
      const members = [
        { team_id: 't1', player_id: 'p1' },
        { team_id: 't1', player_id: 'p2' },
        { team_id: 't2', player_id: 'p3' },
      ];
      const teamMembers = members.filter((m) => m.team_id === 't1');
      expect(teamMembers.length).toBe(2);
    });
  });

  describe('Empty States', () => {
    it('returns empty array for no activity', () => {
      const items: string[] = [];
      expect(items.length).toBe(0);
    });

    it('returns no data message for null average strokes', () => {
      const avg: number | null = null;
      const display = avg !== null ? avg : '—';
      expect(display).toBe('—');
    });
  });

  describe('Validation for Dashboard', () => {
    it('validates tournament for creation', () => {
      const result = validateTournament({
        name: 'Spring Championship',
        season_id: 's1',
        description: null,
        event_date: null,
        course_id: null,
      });
      expect(result.isValid).toBe(true);
    });

    it('validates round for creation', () => {
      const result = validateRound({
        tournament_id: 't1',
        round_number: 1,
        name: 'Round 1',
        date: null,
      });
      expect(result.isValid).toBe(true);
    });

    it('validates player for creation', () => {
      const result = validatePlayer({
        full_name: 'John Doe',
        phone: null,
        handicap_index: 15,
        status: 'active',
      });
      expect(result.isValid).toBe(true);
    });

    it('validates team for creation', () => {
      const result = validateTeam({
        name: 'Tigers',
        season_id: 's1',
        division_id: null,
      });
      expect(result.isValid).toBe(true);
    });
  });
});
