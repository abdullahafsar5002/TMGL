import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import type { AuthError, Session, Subscription, User } from '@supabase/supabase-js';
import type { AuthResult } from '@/types/auth';

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
}

const mocks = vi.hoisted(() => {
  const query: MockQueryBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.single.mockResolvedValue({ data: null, error: null });
  query.maybeSingle.mockResolvedValue({ data: null, error: null });
  query.insert.mockResolvedValue({ data: null, error: null });
  const auth = {
    getSession: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  };
  const from = vi.fn();
  from.mockReturnValue(query);
  return { auth, from, query };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: mocks.auth,
    from: mocks.from,
  },
}));

import { AuthProvider, useAuth } from './AuthContext';

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  };
}

function createUser(id = 'user-1'): User {
  return {
    id,
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    email_confirmed_at: '2026-01-01T00:00:00.000Z',
    confirmation_sent_at: undefined,
    recovery_sent_at: undefined,
    last_sign_in_at: '2026-01-01T00:00:00.000Z',
    is_anonymous: false,
  };
}

function createSession(id = 'user-1'): Session {
  return {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: createUser(id),
  };
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as unknown as Subscription },
    });
    mocks.from.mockReturnValue(mocks.query);
    mocks.query.select.mockReturnValue(mocks.query);
    mocks.query.eq.mockReturnValue(mocks.query);
    mocks.query.single.mockResolvedValue({ data: null, error: null });
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.query.insert.mockResolvedValue({ data: null, error: null });
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside <AuthProvider>');
    spy.mockRestore();
  });

  it('initializes with loading state', () => {
    mocks.auth.getSession.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('sets isAuthenticated to true when session exists', async () => {
    const session = createSession();
    mocks.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.query.maybeSingle.mockResolvedValue({ data: { id: 'user-1', full_name: 'Test User', role: 'player' }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.id).toBe('user-1');
    expect(result.current.profile?.full_name).toBe('Test User');
    expect(result.current.profileError).toBeNull();
  });

  it('falls back to legacy profile columns when the schema is missing a column', async () => {
    const session = createSession();
    mocks.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.query.maybeSingle
      .mockResolvedValueOnce({ data: null, error: { code: '42703', message: 'column profiles.email does not exist' } })
      .mockResolvedValueOnce({ data: { id: 'user-1', full_name: 'Legacy User', role: 'player' }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mocks.query.select).toHaveBeenCalledWith('id, full_name, avatar_url, role, created_at, updated_at');
    expect(result.current.profile?.full_name).toBe('Legacy User');
    expect(result.current.profileError).toBeNull();
  });

  it('provisions a missing profile row for the signed-in account', async () => {
    const session = createSession();
    mocks.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.query.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'user-1', full_name: 'TMGL Player', role: 'player' }, error: null });
    mocks.query.insert.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mocks.query.insert).toHaveBeenCalledWith({ id: 'user-1', full_name: 'TMGL Player', role: 'player', email: 'test@example.com' });
    expect(result.current.profile?.id).toBe('user-1');
    expect(result.current.profileError).toBeNull();
  });

  it('surfaces the database reason when the profile cannot be loaded', async () => {
    const session = createSession();
    mocks.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    const permissionError = { code: '42501', message: 'permission denied for table profiles' };
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: permissionError });
    mocks.query.insert.mockResolvedValue({ data: null, error: permissionError });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.profileError).toBe('permission denied for table profiles');
  });

  it('signIn calls supabase.auth.signInWithPassword', async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    let response: AuthResult | undefined;
    await act(async () => {
      response = await result.current.signIn('test@example.com', 'password123');
    });

    expect(mocks.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    expect(response?.success).toBe(true);
  });

  it('signIn returns error on failure', async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { name: 'AuthError', message: 'Invalid login credentials' } as AuthError });
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    let response: AuthResult | undefined;
    await act(async () => {
      response = await result.current.signIn('wrong@example.com', 'wrong');
    });

    expect(response?.success).toBe(false);
    expect(response?.error).toBe('Invalid login credentials');
  });

  it('signUp calls supabase.auth.signUp with options', async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    let response: AuthResult | undefined;
    await act(async () => {
      response = await result.current.signUp('new@example.com', 'password123', 'New User');
    });

    expect(mocks.auth.signUp).toHaveBeenCalledWith({ email: 'new@example.com', password: 'password123', options: { data: { full_name: 'New User' } } });
    expect(response?.success).toBe(true);
    expect(response?.requiresConfirmation).toBe(true);
  });

  it('signUp returns error on failure', async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { name: 'AuthError', message: 'User already registered' } as AuthError });
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    let response: AuthResult | undefined;
    await act(async () => {
      response = await result.current.signUp('existing@example.com', 'password123', 'Existing User');
    });

    expect(response?.success).toBe(false);
    expect(response?.error).toBe('User already registered');
  });

  it('signOut clears all state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.signOut();
    });

    expect(mocks.auth.signOut).toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('refreshProfile reloads profile for current user', async () => {
    const session = createSession();
    mocks.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.query.maybeSingle.mockResolvedValue({ data: { id: 'user-1', full_name: 'Test User', role: 'player' }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await act(async () => {
      await result.current.refreshProfile();
    });

    expect(mocks.from).toHaveBeenCalledWith('profiles');
  });

  it('signIn handles unexpected exceptions', async () => {
    mocks.auth.signInWithPassword.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    let response: AuthResult | undefined;
    await act(async () => {
      response = await result.current.signIn('test@example.com', 'pass');
    });

    expect(response?.success).toBe(false);
    expect(response?.error).toBe('Network error');
  });

  it('signUp handles unexpected exceptions', async () => {
    mocks.auth.signUp.mockRejectedValue(new Error('Network timeout'));
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    let response: AuthResult | undefined;
    await act(async () => {
      response = await result.current.signUp('test@example.com', 'pass', 'Name');
    });

    expect(response?.success).toBe(false);
    expect(response?.error).toBe('Network timeout');
  });
});
