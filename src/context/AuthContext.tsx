import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';
import type { AuthContextValue, AuthResult } from '@/types/auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // -------------------------------------------------------------------
  // Load profile from the profiles table for the current user
  // -------------------------------------------------------------------
  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      // Profile may not exist yet (e.g., trigger hasn't fired on very first signup)
      // This is non-fatal — components should handle profile === null gracefully.
      if (import.meta.env.DEV) {
        console.warn('[TMGL AuthContext] Could not load profile:', error.message);
      }
      setProfile(null);
    } else {
      setProfile(data as Profile);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadProfile(user.id);
    }
  }, [user, loadProfile]);

  // -------------------------------------------------------------------
  // Bootstrap session on mount; subscribe to auth state changes
  // -------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        try {
          if (existingSession?.user) {
            await loadProfile(existingSession.user.id);
          } else {
            setProfile(null);
          }
        } catch {
          if (mounted) setProfile(null);
        }
      } catch {
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        try {
          if (newSession?.user) {
            await loadProfile(newSession.user.id);
          } else {
            setProfile(null);
          }
        } catch {
          if (mounted) setProfile(null);
        } finally {
          if (mounted) setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

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
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextValue = {
    session,
    user,
    profile,
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
