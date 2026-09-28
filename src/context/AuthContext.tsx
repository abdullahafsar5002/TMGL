import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { registerFcmToken } from '@/lib/push';
import type { Profile } from '@/types/database';
import type { AuthContextValue, AuthResult } from '@/types/auth';

const AuthContext = createContext<AuthContextValue | null>(null);

const PROFILE_COLUMNS = 'id, email, full_name, avatar_url, role, created_at, updated_at';
const PROFILE_COLUMNS_LEGACY = 'id, full_name, avatar_url, role, created_at, updated_at';

type ProfileErrorLike = { message: string; code?: string } | null;

function isSchemaMismatchError(error: ProfileErrorLike): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return error.code === '42703'
    || error.code === '42P01'
    || message.includes('does not exist')
    || message.includes('schema cache')
    || message.includes('could not find the function')
    || message.includes('permission denied for table');
}

function resolveFullName(authUser: User): string {
  const metadata = authUser.user_metadata ?? {};
  const candidate = metadata.full_name ?? metadata.name;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : 'TMGL Player';
}

function normalizeProfile(row: Record<string, unknown>, authUser: User): Profile {
  const role = typeof row.role === 'string' ? row.role : 'player';
  const now = new Date().toISOString();
  const base = {
    id: (row.id as string) ?? authUser.id,
    email: typeof row.email === 'string' ? row.email : authUser.email ?? null,
    full_name: typeof row.full_name === 'string' && row.full_name ? row.full_name : resolveFullName(authUser),
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    role: (role === 'super_admin' || role === 'league_manager' || role === 'public' ? role : 'player') as Profile['role'],
    created_at: typeof row.created_at === 'string' ? row.created_at : now,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : now,
  };
  for (const [key, value] of Object.entries(row)) {
    if (!(key in base) && key !== 'id') {
      (base as Record<string, unknown>)[key] = value;
    }
  }
  return base as unknown as Profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // -------------------------------------------------------------------
  // Load profile from the profiles table for the current user
  // -------------------------------------------------------------------
  const loadProfile = useCallback(async (authUser: User) => {
    const userId = authUser.id;

    const fetchRow = async (columns: string) => {
      const result = await supabase
        .from('profiles')
        .select(columns)
        .eq('id', userId)
        .maybeSingle();
      return { row: result.data as Record<string, unknown> | null, error: result.error };
    };

    let { row, error } = await fetchRow(PROFILE_COLUMNS);

    if (!row && isSchemaMismatchError(error)) {
      const fallback = await fetchRow(PROFILE_COLUMNS_LEGACY);
      if (fallback.row || !fallback.error) {
        row = fallback.row;
        error = fallback.error;
      }
    }

    if (row) {
      setProfile(normalizeProfile(row, authUser));
      setProfileError(null);
      return;
    }

    const provision = async (includeEmail: boolean) => {
      const payload: Record<string, unknown> = {
        id: userId,
        full_name: resolveFullName(authUser),
        role: 'player',
      };
      if (includeEmail && authUser.email) payload.email = authUser.email;
      return supabase.from('profiles').insert(payload);
    };

    let insertError: ProfileErrorLike = error;
    if (!isSchemaMismatchError(insertError) || insertError?.message.toLowerCase().includes('permission denied')) {
      const first = await provision(true);
      if (!first.error) {
        const retry = await fetchRow(PROFILE_COLUMNS);
        if (retry.row) {
          setProfile(normalizeProfile(retry.row, authUser));
          setProfileError(null);
          return;
        }
        insertError = retry.error;
      } else if (isSchemaMismatchError(first.error)) {
        const second = await provision(false);
        if (!second.error) {
          const retry = await fetchRow(PROFILE_COLUMNS_LEGACY);
          if (retry.row) {
            setProfile(normalizeProfile(retry.row, authUser));
            setProfileError(null);
            return;
          }
          insertError = retry.error;
        } else {
          insertError = second.error;
        }
      } else {
        insertError = first.error;
      }
    }

    setProfile(null);
    setProfileError(insertError?.message ?? 'Profile row is missing for this account.');
    if (import.meta.env.DEV) {
      console.warn('[TMGL AuthContext] Could not load profile:', insertError?.message);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadProfile(user);
    }
  }, [user, loadProfile]);

  // -------------------------------------------------------------------
  // Bootstrap session on mount; subscribe to auth state changes
  // -------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      if (!mounted) return;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        await loadProfile(existingSession.user);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await loadProfile(newSession.user);
        } else {
          setProfile(null);
          setProfileError(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  useEffect(() => {
    if (user?.id) {
      void registerFcmToken(user.id);
    }
  }, [user?.id]);

  // -------------------------------------------------------------------
  // Auth actions
  // -------------------------------------------------------------------
  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unexpected error signing in' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string
  ): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const requiresConfirmation = !data.session;
      return { success: true, requiresConfirmation };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unexpected error signing up' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch {
      if (import.meta.env.DEV) {
        console.warn('[TMGL AuthContext] Error during sign out');
      }
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setProfileError(null);
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextValue = {
    session,
    user,
    profile,
    profileError,
    isLoading,
    isAuthenticated: !!session,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook for consuming auth context.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
