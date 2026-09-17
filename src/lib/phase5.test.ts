import { describe, it, expect } from 'vitest';
import {
  validatePlayer,
  validateTeam,
  validateTeamMember,
} from './validation';
import { canManageLeague, hasMinimumRole } from './roleGuards';

describe('Phase 5 — League Operations & Player Registration', () => {
  describe('Player Management', () => {
    it('validates player name is required', () => {
      const result = validatePlayer({ full_name: '', phone: null, handicap_index: null, status: 'active' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Player name is required.');
    });

    it('validates player name minimum length', () => {
      const result = validatePlayer({ full_name: 'A', phone: null, handicap_index: null, status: 'active' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('at least 2'))).toBe(true);
    });

    it('validates player status values', () => {
      const validStatuses = ['active', 'inactive', 'suspended'];
      validStatuses.forEach((status) => {
        const result = validatePlayer({ full_name: 'John Doe', phone: null, handicap_index: null, status });
        expect(result.isValid).toBe(true);
      });
    });

    it('rejects invalid player status', () => {
      const result = validatePlayer({ full_name: 'John Doe', phone: null, handicap_index: null, status: 'invalid' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Player status must be active, inactive, or suspended.');
    });

    it('validates phone number format', () => {
      const validNumbers = ['+1234567890', '123-456-7890', '+1 (234) 567-8901'];
      validNumbers.forEach((phone) => {
        const result = validatePlayer({ full_name: 'John Doe', phone, handicap_index: null, status: 'active' });
        expect(result.isValid).toBe(true);
      });
    });

    it('rejects invalid phone number', () => {
      const result = validatePlayer({ full_name: 'John Doe', phone: 'abc', handicap_index: null, status: 'active' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Phone number format is invalid.');
    });

    it('validates handicap index range', () => {
      const validHandicaps = [0, 10, 25.5, 54];
      validHandicaps.forEach((handicap) => {
        const result = validatePlayer({ full_name: 'John Doe', phone: null, handicap_index: handicap, status: 'active' });
        expect(result.isValid).toBe(true);
      });
    });

    it('rejects handicap index out of range', () => {
      const result1 = validatePlayer({ full_name: 'John Doe', phone: null, handicap_index: -1, status: 'active' });
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Handicap index must be between 0 and 54.');

      const result2 = validatePlayer({ full_name: 'John Doe', phone: null, handicap_index: 55, status: 'active' });
      expect(result2.isValid).toBe(false);
    });

    it('accepts null handicap index', () => {
      const result = validatePlayer({ full_name: 'John Doe', phone: null, handicap_index: null, status: 'active' });
      expect(result.isValid).toBe(true);
    });

    it('accepts null phone number', () => {
      const result = validatePlayer({ full_name: 'John Doe', phone: null, handicap_index: null, status: 'active' });
      expect(result.isValid).toBe(true);
    });

    it('accepts empty phone string as null', () => {
      const result = validatePlayer({ full_name: 'John Doe', phone: '', handicap_index: null, status: 'active' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('Team Management', () => {
    it('validates team name is required', () => {
      const result = validateTeam({ name: '', season_id: 's1', division_id: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Team name is required.');
    });

    it('validates team name minimum length', () => {
      const result = validateTeam({ name: 'A', season_id: 's1', division_id: null });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('at least 2'))).toBe(true);
    });

    it('validates season is required', () => {
      const result = validateTeam({ name: 'Tigers', season_id: '', division_id: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A season must be selected.');
    });

    it('accepts valid team', () => {
      const result = validateTeam({ name: 'Tigers', season_id: 's1', division_id: null });
      expect(result.isValid).toBe(true);
    });

    it('accepts team with division', () => {
      const result = validateTeam({ name: 'Tigers', season_id: 's1', division_id: 'd1' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('Team Membership Management', () => {
    it('rejects adding player to team twice', () => {
      const existing = [
        { team_id: 't1', player_id: 'p1' },
      ];
      const result = validateTeamMember({
        team_id: 't1',
        player_id: 'p1',
        existingMembers: existing,
        teamSeasonId: 's1',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This player is already a member of this team.');
    });

    it('allows adding player to different team', () => {
      const existing = [
        { team_id: 't1', player_id: 'p1' },
      ];
      const result = validateTeamMember({
        team_id: 't2',
        player_id: 'p1',
        existingMembers: existing,
        teamSeasonId: 's1',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This player is already assigned to another team in this season.');
    });

    it('allows adding new player to team', () => {
      const existing = [
        { team_id: 't1', player_id: 'p1' },
      ];
      const result = validateTeamMember({
        team_id: 't1',
        player_id: 'p2',
        existingMembers: existing,
        teamSeasonId: 's1',
      });
      expect(result.isValid).toBe(true);
    });

    it('rejects empty team_id', () => {
      const result = validateTeamMember({
        team_id: '',
        player_id: 'p1',
        existingMembers: [],
        teamSeasonId: 's1',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A team must be selected.');
    });

    it('rejects empty player_id', () => {
      const result = validateTeamMember({
        team_id: 't1',
        player_id: '',
        existingMembers: [],
        teamSeasonId: 's1',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A player must be selected.');
    });
  });

  describe('Role Guards for League Operations', () => {
    it('league_manager can manage league', () => {
      expect(canManageLeague('league_manager')).toBe(true);
      expect(canManageLeague('super_admin')).toBe(true);
    });

    it('player cannot manage league', () => {
      expect(canManageLeague('player')).toBe(false);
    });

    it('public cannot manage league', () => {
      expect(canManageLeague('public')).toBe(false);
    });

    it('null role cannot manage league', () => {
      expect(canManageLeague(null)).toBe(false);
    });

    it('undefined role cannot manage league', () => {
      expect(canManageLeague(undefined)).toBe(false);
    });

    it('player has minimum player role', () => {
      expect(hasMinimumRole('player', 'player')).toBe(true);
    });

    it('player does not have manager role', () => {
      expect(hasMinimumRole('player', 'league_manager')).toBe(false);
    });

    it('super_admin has all roles', () => {
      expect(hasMinimumRole('super_admin', 'public')).toBe(true);
      expect(hasMinimumRole('super_admin', 'player')).toBe(true);
      expect(hasMinimumRole('super_admin', 'league_manager')).toBe(true);
      expect(hasMinimumRole('super_admin', 'super_admin')).toBe(true);
    });
  });

  describe('Player Status Transitions', () => {
    it('active to inactive is valid', () => {
      const result = validatePlayer({ full_name: 'John Doe', phone: null, handicap_index: null, status: 'inactive' });
      expect(result.isValid).toBe(true);
    });

    it('active to suspended is valid', () => {
      const result = validatePlayer({ full_name: 'John Doe', phone: null, handicap_index: null, status: 'suspended' });
      expect(result.isValid).toBe(true);
    });

    it('inactive to active is valid', () => {
      const result = validatePlayer({ full_name: 'John Doe', phone: null, handicap_index: null, status: 'active' });
      expect(result.isValid).toBe(true);
    });

    it('suspended to active is valid', () => {
      const result = validatePlayer({ full_name: 'John Doe', phone: null, handicap_index: null, status: 'active' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('Team Member Count Validation', () => {
    it('allows adding member when no existing members', () => {
      const result = validateTeamMember({
        team_id: 't1',
        player_id: 'p1',
        existingMembers: [],
        teamSeasonId: 's1',
      });
      expect(result.isValid).toBe(true);
    });

    it('allows adding multiple players to same team', () => {
      const existing = [
        { team_id: 't1', player_id: 'p1' },
        { team_id: 't1', player_id: 'p2' },
      ];
      const result = validateTeamMember({
        team_id: 't1',
        player_id: 'p3',
        existingMembers: existing,
        teamSeasonId: 's1',
      });
      expect(result.isValid).toBe(true);
    });
  });
});
