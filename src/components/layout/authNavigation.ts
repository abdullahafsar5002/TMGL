import { canAccessRoute } from '@/lib/roleGuards';
import { ROUTES } from '@/router/routes';
import type { UserRole } from '@/types/auth';

export type AuthNavIcon =
  | 'home'
  | 'tournaments'
  | 'practice'
  | 'leaderboard'
  | 'announcements'
  | 'scores'
  | 'organizer'
  | 'admin'
  | 'analytics'
  | 'notifications'
  | 'profile';

export interface AuthNavItem {
  id: string;
  label: string;
  shortLabel: string;
  path: string;
  icon: AuthNavIcon;
  matchPrefixes: readonly string[];
  exact: boolean;
  primary: boolean;
  desktop: boolean;
  minRole: UserRole | null;
}

export const MANAGER_ROUTE_PREFIXES: readonly string[] = [
  '/admin',
  '/analytics',
  '/announcements/manage',
  '/organizer',
  '/courses/new',
  '/divisions/new',
  '/players/new',
  '/rounds',
  '/scorecard',
  '/seasons/new',
  '/teams/new',
  '/tournaments/new',
];

export const AUTH_NAV_ITEMS: readonly AuthNavItem[] = [
  {
    id: 'home',
    label: 'Dashboard',
    shortLabel: 'Home',
    path: '/dashboard',
    icon: 'home',
    matchPrefixes: [],
    exact: true,
    primary: true,
    desktop: true,
    minRole: null,
  },
  {
    id: 'events',
    label: 'Events',
    shortLabel: 'Events',
    path: ROUTES.authenticatedEvents,
    icon: 'tournaments',
    matchPrefixes: [ROUTES.authenticatedEvents],
    exact: false,
    primary: true,
    desktop: true,
    minRole: null,
  },
  {
    id: 'practice',
    label: 'Practice',
    shortLabel: 'Practice',
    path: '/practice',
    icon: 'practice',
    matchPrefixes: ['/practice'],
    exact: false,
    primary: true,
    desktop: true,
    minRole: null,
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    shortLabel: 'Board',
    path: ROUTES.authenticatedLeaderboard,
    icon: 'leaderboard',
    matchPrefixes: [ROUTES.authenticatedLeaderboard],
    exact: false,
    primary: true,
    desktop: true,
    minRole: null,
  },
  {
    id: 'announcements',
    label: 'Announcements',
    shortLabel: 'News',
    path: '/announcements',
    icon: 'announcements',
    matchPrefixes: ['/announcements'],
    exact: false,
    primary: false,
    desktop: true,
    minRole: null,
  },
  {
    id: 'scores',
    label: 'My Scores',
    shortLabel: 'Scores',
    path: '/my-scores',
    icon: 'scores',
    matchPrefixes: ['/my-scores', '/my-statistics', '/my-tournaments'],
    exact: false,
    primary: false,
    desktop: true,
    minRole: null,
  },
  {
    id: 'organizer',
    label: 'Organizer',
    shortLabel: 'Organizer',
    path: '/organizer',
    icon: 'organizer',
    matchPrefixes: ['/organizer'],
    exact: false,
    primary: false,
    desktop: true,
    minRole: 'league_manager',
  },
  {
    id: 'admin',
    label: 'Admin',
    shortLabel: 'Admin',
    path: '/admin',
    icon: 'admin',
    matchPrefixes: ['/admin'],
    exact: false,
    primary: false,
    desktop: true,
    minRole: 'league_manager',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    shortLabel: 'Stats',
    path: '/analytics',
    icon: 'analytics',
    matchPrefixes: ['/analytics'],
    exact: false,
    primary: false,
    desktop: true,
    minRole: 'league_manager',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    shortLabel: 'Alerts',
    path: '/notifications',
    icon: 'notifications',
    matchPrefixes: ['/notifications'],
    exact: false,
    primary: false,
    desktop: false,
    minRole: null,
  },
  {
    id: 'profile',
    label: 'Profile',
    shortLabel: 'Profile',
    path: '/profile/settings',
    icon: 'profile',
    matchPrefixes: ['/profile/settings'],
    exact: false,
    primary: true,
    desktop: false,
    minRole: null,
  },
];

export function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname) return '/';
  const withoutQuery = pathname.split(/[?#]/)[0];
  const trimmed = withoutQuery.replace(/\/+$/, '');
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  const normalizedPrefix = normalizePathname(prefix);
  if (normalizedPrefix === '/') return pathname === '/';
  return pathname === normalizedPrefix || pathname.startsWith(`${normalizedPrefix}/`);
}

export function getRequiredRoleForPath(pathname: string | null | undefined): UserRole | null {
  const path = normalizePathname(pathname);
  for (const prefix of MANAGER_ROUTE_PREFIXES) {
    if (matchesPrefix(path, prefix)) return 'league_manager';
  }
  return null;
}

export function isAuthNavItemActive(item: AuthNavItem, pathname: string | null | undefined): boolean {
  const path = normalizePathname(pathname);
  if (item.exact) return path === normalizePathname(item.path);
  for (const prefix of item.matchPrefixes) {
    if (matchesPrefix(path, prefix)) return true;
  }
  return false;
}

export type AuthNavScope = 'all' | 'primary' | 'desktop';

export function getAuthNavItems(
  role: UserRole | null | undefined,
  options: { scope?: AuthNavScope } = {}
): AuthNavItem[] {
  const scope = options.scope ?? 'all';
  return AUTH_NAV_ITEMS.filter((item) => {
    if (scope === 'primary' && !item.primary) return false;
    if (scope === 'desktop' && !item.desktop) return false;
    const requiredRole = item.minRole ?? getRequiredRoleForPath(item.path);
    if (!requiredRole) return true;
    return canAccessRoute(role, requiredRole);
  });
}

export function getActiveAuthNavItem(
  pathname: string | null | undefined,
  role: UserRole | null | undefined
): AuthNavItem | null {
  const items = getAuthNavItems(role);
  return items.find((item) => isAuthNavItemActive(item, pathname)) ?? null;
}

export function getAuthDisplayName(fullName: string | null | undefined, email: string | null | undefined): string {
  const name = fullName?.trim();
  if (name) return name;
  const mail = email?.trim();
  if (mail) return mail;
  return 'Account';
}

export function getAuthInitials(fullName: string | null | undefined, email: string | null | undefined): string {
  const name = fullName?.trim();
  const source = name || email?.trim().split('@')[0] || '';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getNotificationBadgeLabel(unreadCount: number | null | undefined): string {
  if (!unreadCount || unreadCount <= 0) return 'Notifications';
  return `Notifications, ${unreadCount} unread`;
}
