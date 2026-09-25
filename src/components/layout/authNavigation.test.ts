import { describe, expect, it } from 'vitest';
import { canAccessRoute } from '@/lib/roleGuards';
import type { UserRole } from '@/types/auth';
import {
  AUTH_NAV_ITEMS,
  MANAGER_ROUTE_PREFIXES,
  getActiveAuthNavItem,
  getAuthDisplayName,
  getAuthInitials,
  getAuthNavItems,
  getNotificationBadgeLabel,
  getRequiredRoleForPath,
  isAuthNavItemActive,
  normalizePathname,
} from './authNavigation';

function itemById(id: string) {
  const item = AUTH_NAV_ITEMS.find((entry) => entry.id === id);
  if (!item) throw new Error(`Missing auth nav item: ${id}`);
  return item;
}

describe('normalizePathname', () => {
  it('collapses trailing slashes and empty input to root', () => {
    expect(normalizePathname('/dashboard/')).toBe('/dashboard');
    expect(normalizePathname('/')).toBe('/');
    expect(normalizePathname('')).toBe('/');
    expect(normalizePathname(null)).toBe('/');
    expect(normalizePathname(undefined)).toBe('/');
  });

  it('strips query strings and hashes', () => {
    expect(normalizePathname('/practice?tab=all')).toBe('/practice');
    expect(normalizePathname('/practice/history#top')).toBe('/practice/history');
  });

  it('prefixes relative input with a slash', () => {
    expect(normalizePathname('dashboard')).toBe('/dashboard');
  });
});

describe('getRequiredRoleForPath', () => {
  it('requires league_manager for /organizer', () => {
    expect(getRequiredRoleForPath('/organizer')).toBe('league_manager');
  });

  it('requires league_manager for every manager route prefix', () => {
    for (const prefix of MANAGER_ROUTE_PREFIXES) {
      expect(getRequiredRoleForPath(prefix)).toBe('league_manager');
      expect(getRequiredRoleForPath(`${prefix}/nested`)).toBe('league_manager');
    }
  });

  it('does not leak manager gates onto similar player routes', () => {
    expect(getRequiredRoleForPath('/organizations')).toBeNull();
    expect(getRequiredRoleForPath('/announcements')).toBeNull();
    expect(getRequiredRoleForPath('/scorecards')).toBeNull();
    expect(getRequiredRoleForPath('/practice/new')).toBeNull();
    expect(getRequiredRoleForPath('/tournaments')).toBeNull();
  });

  it('keeps player-only authenticated routes ungated', () => {
    const playerPaths = [
      '/dashboard',
      '/dashboard/tournaments',
      '/dashboard/leaderboard',
      '/practice',
      '/profile/settings',
      '/notifications',
      '/my-scores',
    ];
    for (const path of playerPaths) {
      expect(getRequiredRoleForPath(path)).toBeNull();
    }
  });

  it('enforces the /organizer gate through the shared role guards', () => {
    const required = getRequiredRoleForPath('/organizer');
    expect(required).toBe('league_manager');
    expect(canAccessRoute('league_manager', required as UserRole)).toBe(true);
    expect(canAccessRoute('super_admin', required as UserRole)).toBe(true);
    expect(canAccessRoute('player', required as UserRole)).toBe(false);
    expect(canAccessRoute(null, required as UserRole)).toBe(false);
  });
});

describe('isAuthNavItemActive', () => {
  it('matches the exact dashboard destination only', () => {
    const home = itemById('home');
    expect(isAuthNavItemActive(home, '/dashboard')).toBe(true);
    expect(isAuthNavItemActive(home, '/dashboard/')).toBe(true);
    expect(isAuthNavItemActive(home, '/dashboard/tournaments')).toBe(false);
  });

  it('activates events on the authenticated events path and its children', () => {
    const events = itemById('events');
    expect(isAuthNavItemActive(events, '/dashboard/tournaments')).toBe(true);
    expect(isAuthNavItemActive(events, '/dashboard/tournaments/abc')).toBe(true);
  });

  it('does not treat the public tournaments path as the authenticated events destination', () => {
    const events = itemById('events');
    expect(isAuthNavItemActive(events, '/tournaments')).toBe(false);
    expect(isAuthNavItemActive(events, '/tournaments/abc')).toBe(false);
  });

  it('does not treat the public leaderboard path as the authenticated leaderboard destination', () => {
    const leaderboard = itemById('leaderboard');
    expect(isAuthNavItemActive(leaderboard, '/leaderboard')).toBe(false);
    expect(isAuthNavItemActive(leaderboard, '/dashboard/leaderboard')).toBe(true);
  });

  it('activates practice across all practice sub-routes', () => {
    const practice = itemById('practice');
    for (const path of ['/practice', '/practice/new', '/practice/history', '/practice/abc', '/practice/abc/score']) {
      expect(isAuthNavItemActive(practice, path)).toBe(true);
    }
  });

  it('groups my-scores, my-statistics and my-tournaments under a single destination', () => {
    const scores = itemById('scores');
    expect(isAuthNavItemActive(scores, '/my-scores')).toBe(true);
    expect(isAuthNavItemActive(scores, '/my-statistics')).toBe(true);
    expect(isAuthNavItemActive(scores, '/my-tournaments')).toBe(true);
    expect(isAuthNavItemActive(scores, '/my-scorers')).toBe(false);
  });

  it('ignores trailing slashes, query strings and empty input', () => {
    const profile = itemById('profile');
    expect(isAuthNavItemActive(profile, '/profile/settings/')).toBe(true);
    expect(isAuthNavItemActive(profile, '/profile/settings?tab=1')).toBe(true);
    expect(isAuthNavItemActive(profile, '')).toBe(false);
  });
});

describe('getAuthNavItems', () => {
  it('returns exactly five primary destinations in bottom-nav order', () => {
    const primary = getAuthNavItems('player', { scope: 'primary' });
    expect(primary.map((item) => item.id)).toEqual(['home', 'events', 'practice', 'leaderboard', 'profile']);
  });

  it('keeps every primary destination inside the authenticated layout', () => {
    const primary = getAuthNavItems('player', { scope: 'primary' });
    for (const item of primary) {
      expect(getRequiredRoleForPath(item.path)).toBeNull();
      expect(item.path.startsWith('/dashboard') || item.path === '/practice' || item.path.startsWith('/profile')).toBe(true);
    }
  });

  it('builds a desktop nav of only authenticated destinations', () => {
    const desktop = getAuthNavItems('player', { scope: 'desktop' });
    expect(desktop.map((item) => item.id)).toEqual([
      'home',
      'events',
      'practice',
      'leaderboard',
      'announcements',
      'scores',
    ]);
    for (const item of desktop) {
      expect(getRequiredRoleForPath(item.path)).toBeNull();
      expect(item.path.startsWith('/')).toBe(true);
    }
  });

  it('adds manager destinations to the desktop nav only for managers', () => {
    const managerDesktop = getAuthNavItems('league_manager', { scope: 'desktop' }).map((item) => item.id);
    expect(managerDesktop).toContain('organizer');
    expect(managerDesktop).toContain('admin');
    expect(managerDesktop).toContain('analytics');
    expect(getAuthNavItems('player', { scope: 'desktop' })).toHaveLength(managerDesktop.length - 3);
  });

  it('hides league_manager destinations from players', () => {
    const ids = getAuthNavItems('player').map((item) => item.id);
    expect(ids).not.toContain('organizer');
    expect(ids).not.toContain('admin');
    expect(ids).not.toContain('analytics');
    expect(ids).toContain('announcements');
    expect(ids).toContain('notifications');
  });

  it('exposes league_manager and super_admin destinations to managers', () => {
    for (const role of ['league_manager', 'super_admin'] as UserRole[]) {
      const ids = getAuthNavItems(role).map((item) => item.id);
      expect(ids).toContain('organizer');
      expect(ids).toContain('admin');
      expect(ids).toContain('analytics');
    }
  });

  it('keeps every scope free of public-layout-only paths', () => {
    const publicPaths = new Set(['/', '/about', '/news', '/gallery', '/contact', '/tournaments', '/leaderboard']);
    for (const role of ['player', 'league_manager', 'super_admin'] as UserRole[]) {
      for (const scope of ['all', 'primary', 'desktop'] as const) {
        for (const item of getAuthNavItems(role, { scope })) {
          expect(publicPaths.has(item.path)).toBe(false);
        }
      }
    }
  });

  it('treats a missing role as the least privileged player', () => {
    expect(getAuthNavItems(null).map((item) => item.id)).toEqual(getAuthNavItems('player').map((item) => item.id));
    expect(getAuthNavItems(undefined).map((item) => item.id)).toEqual(getAuthNavItems('public').map((item) => item.id));
  });

  it('returns the full set when no scope is requested', () => {
    expect(getAuthNavItems('super_admin').length).toBe(AUTH_NAV_ITEMS.length);
  });
});

describe('getActiveAuthNavItem', () => {
  it('resolves the single active destination', () => {
    expect(getActiveAuthNavItem('/dashboard', 'player')?.id).toBe('home');
    expect(getActiveAuthNavItem('/dashboard/tournaments', 'player')?.id).toBe('events');
    expect(getActiveAuthNavItem('/practice/abc/score', 'player')?.id).toBe('practice');
    expect(getActiveAuthNavItem('/organizer', 'league_manager')?.id).toBe('organizer');
  });

  it('returns null when no destination matches', () => {
    expect(getActiveAuthNavItem('/players/abc', 'player')).toBeNull();
  });

  it('does not surface a manager destination to a player even when the path matches', () => {
    expect(getActiveAuthNavItem('/organizer', 'player')).toBeNull();
  });
});

describe('auth identity helpers', () => {
  it('prefers the full name for display', () => {
    expect(getAuthDisplayName('Ada Lovelace', 'ada@example.com')).toBe('Ada Lovelace');
  });

  it('falls back to email and then a generic label', () => {
    expect(getAuthDisplayName(null, 'ada@example.com')).toBe('ada@example.com');
    expect(getAuthDisplayName('   ', '   ')).toBe('Account');
    expect(getAuthDisplayName(null, null)).toBe('Account');
  });

  it('builds initials from names and emails', () => {
    expect(getAuthInitials('Ada Lovelace', null)).toBe('AL');
    expect(getAuthInitials('Prince', null)).toBe('PR');
    expect(getAuthInitials(null, 'ada.lovelace@example.com')).toBe('AL');
    expect(getAuthInitials(null, null)).toBe('?');
  });

  it('labels the notification control with the unread count', () => {
    expect(getNotificationBadgeLabel(0)).toBe('Notifications');
    expect(getNotificationBadgeLabel(null)).toBe('Notifications');
    expect(getNotificationBadgeLabel(3)).toBe('Notifications, 3 unread');
  });
});
