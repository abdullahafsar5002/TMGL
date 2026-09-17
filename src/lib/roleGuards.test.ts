import { describe, it, expect } from 'vitest';
import {
  hasMinimumRole,
  isSuperAdmin,
  canManageLeague,
  isAuthenticated,
  getRoleLabel,
  canAccessRoute,
} from './roleGuards';
import type { UserRole } from '@/types/auth';

describe('TMGL Role Guards', () => {
  describe('hasMinimumRole', () => {
    it('public does not meet player requirement', () => {
      expect(hasMinimumRole('public', 'player')).toBe(false);
    });

    it('player meets player requirement', () => {
      expect(hasMinimumRole('player', 'player')).toBe(true);
    });

    it('player does not meet league_manager requirement', () => {
      expect(hasMinimumRole('player', 'league_manager')).toBe(false);
    });

    it('league_manager meets league_manager requirement', () => {
      expect(hasMinimumRole('league_manager', 'league_manager')).toBe(true);
    });

    it('league_manager does not meet super_admin requirement', () => {
      expect(hasMinimumRole('league_manager', 'super_admin')).toBe(false);
    });

    it('super_admin meets all requirements', () => {
      const roles: UserRole[] = ['public', 'player', 'league_manager', 'super_admin'];
      roles.forEach((r) => expect(hasMinimumRole('super_admin', r)).toBe(true));
    });

    it('any role meets public requirement', () => {
      const roles: UserRole[] = ['public', 'player', 'league_manager', 'super_admin'];
      roles.forEach((r) => expect(hasMinimumRole(r, 'public')).toBe(true));
    });
  });

  describe('isSuperAdmin', () => {
    it('returns true only for super_admin', () => {
      expect(isSuperAdmin('super_admin')).toBe(true);
      expect(isSuperAdmin('league_manager')).toBe(false);
      expect(isSuperAdmin('player')).toBe(false);
      expect(isSuperAdmin('public')).toBe(false);
      expect(isSuperAdmin(null)).toBe(false);
      expect(isSuperAdmin(undefined)).toBe(false);
    });
  });

  describe('canManageLeague', () => {
    it('returns true for league_manager and super_admin', () => {
      expect(canManageLeague('league_manager')).toBe(true);
      expect(canManageLeague('super_admin')).toBe(true);
    });

    it('returns false for player, public, null, undefined', () => {
      expect(canManageLeague('player')).toBe(false);
      expect(canManageLeague('public')).toBe(false);
      expect(canManageLeague(null)).toBe(false);
      expect(canManageLeague(undefined)).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('returns true for player and above', () => {
      expect(isAuthenticated('player')).toBe(true);
      expect(isAuthenticated('league_manager')).toBe(true);
      expect(isAuthenticated('super_admin')).toBe(true);
    });

    it('returns false for public, null, undefined', () => {
      expect(isAuthenticated('public')).toBe(false);
      expect(isAuthenticated(null)).toBe(false);
      expect(isAuthenticated(undefined)).toBe(false);
    });
  });

  describe('getRoleLabel', () => {
    it('returns correct human-readable labels', () => {
      expect(getRoleLabel('super_admin')).toBe('Super Admin');
      expect(getRoleLabel('league_manager')).toBe('League Manager');
      expect(getRoleLabel('player')).toBe('Player');
      expect(getRoleLabel('public')).toBe('Public');
      expect(getRoleLabel(null)).toBe('Unknown');
      expect(getRoleLabel(undefined)).toBe('Unknown');
    });
  });

  describe('canAccessRoute', () => {
    it('allows super_admin to access any route', () => {
      const routes: UserRole[] = ['public', 'player', 'league_manager', 'super_admin'];
      routes.forEach((r) => expect(canAccessRoute('super_admin', r)).toBe(true));
    });

    it('blocks unauthenticated user from player-required route', () => {
      expect(canAccessRoute(null, 'player')).toBe(false);
      expect(canAccessRoute(undefined, 'player')).toBe(false);
    });

    it('allows unauthenticated user to access public routes', () => {
      expect(canAccessRoute(null, 'public')).toBe(true);
      expect(canAccessRoute(undefined, 'public')).toBe(true);
    });

    it('blocks player from league_manager routes', () => {
      expect(canAccessRoute('player', 'league_manager')).toBe(false);
    });
  });
});
