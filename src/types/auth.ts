import type { UserRole } from '@/types/database';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';

// Re-export for convenience
export type { UserRole };

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  /** true when email confirmation is required before the session is active */
  requiresConfirmation?: boolean;
}

export type AuthContextValue = AuthState & AuthActions;

/**
 * The ordered role hierarchy from lowest to highest privilege.
 * Used by hasMinimumRole() comparisons.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  public: 0,
  player: 1,
  league_manager: 2,
  super_admin: 3,
};
