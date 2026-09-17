/**
 * Pure role guard functions for TMGL.
 *
 * Rules (from docs/MASTER_ARCHITECTURE.md):
 *   public       — read-only public data
 *   player       — own profile, own scorecards, assigned fixtures
 *   league_manager — manage competition/league records
 *   super_admin  — full access including users, settings, audit
 *
 * These functions are pure and have zero side effects.
 * They are also used by ProtectedRoute for frontend navigation hints,
 * but authoritative authorization is always enforced by Supabase RLS.
 */

import type { UserRole } from '@/types/auth';
import { ROLE_HIERARCHY } from '@/types/auth';

/** Returns true if the role is at least as privileged as requiredRole. */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/** Only super_admin can access full admin functions. */
export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === 'super_admin';
}

/**
 * League manager or higher can manage competition records.
 * Per docs/MASTER_ARCHITECTURE.md: league_manager role.
 */
export function canManageLeague(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return hasMinimumRole(role, 'league_manager');
}

/** Any authenticated user (player or above). */
export function isAuthenticated(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return hasMinimumRole(role, 'player');
}

/** Returns a human-readable label for a role. */
export function getRoleLabel(role: UserRole | null | undefined): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'league_manager':
      return 'League Manager';
    case 'player':
      return 'Player';
    case 'public':
      return 'Public';
    default:
      return 'Unknown';
  }
}

/**
 * Returns true if the user's role grants access to the given route.
 * Used by ProtectedRoute as a UI-layer hint (not a security boundary).
 */
export function canAccessRoute(
  userRole: UserRole | null | undefined,
  requiredRole: UserRole
): boolean {
  if (!userRole) return requiredRole === 'public';
  return hasMinimumRole(userRole, requiredRole);
}
