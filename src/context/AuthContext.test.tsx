import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }
}));

import { supabase } from '@/lib/supabase';

const mockAuth = supabase.auth as unknown as {
  getSession: ReturnType<typeof vi.fn>;
  onAuthStateChange: ReturnType<typeof vi.fn>;
  signInWithPassword: ReturnType<typeof vi.fn>;
  signUp: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
};
const mockFrom = supabase.from as unknown as ReturnType<typeof vi.fn>;

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  };
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    });
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used inside <AuthProvider>');
    spy.mockRestore();
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('stops loading when getSession rejects', async () => {
    mockAuth.getSession.mockRejectedValueOnce(new Error('Session unavailable'));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('sets isAuthenticated to true when session exists', async () => {
    const mockSession = {
      user: { id: 'user-1', email: 'test@example.com' },
      access_token: 'token',
    } as any;

    mockAuth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'user-1', full_name: 'Test User', role: 'player' },
        error: null
      })
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.id).toBe('user-1');
  });

  it('signIn calls supabase.auth.signInWithPassword', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    let res: any;
    await act(async () => {
      res = await result.current.signIn('test@example.com', 'password123');
    });

    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
    expect(res.success).toBe(true);
  });

  it('signIn returns error on failure', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' }
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    let res: any;
    await act(async () => {
      res = await result.current.signIn('wrong@example.com', 'wrong');
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Invalid login credentials');
  });

  it('signUp calls supabase.auth.signUp with options', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    let res: any;
    await act(async () => {
      res = await result.current.signUp('new@example.com', 'password123', 'New User');
    });

    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      options: { data: { full_name: 'New User' } }
    });
    expect(res.success).toBe(true);
    expect(res.requiresConfirmation).toBe(true);
  });

  it('signUp returns error on failure', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' }
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    let res: any;
    await act(async () => {
      res = await result.current.signUp('existing@example.com', 'password123', 'Existing User');
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('User already registered');
  });

  it('signOut clears all state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockAuth.signOut).toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('refreshProfile reloads profile for current user', async () => {
    const mockSession = {
      user: { id: 'user-1', email: 'test@example.com' },
      access_token: 'token',
    } as any;

    mockAuth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'user-1', full_name: 'Test User', role: 'player' },
      error: null
    });

    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.refreshProfile();
    });

    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });

  it('signIn handles unexpected exceptions', async () => {
    mockAuth.signInWithPassword.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    let res: any;
    await act(async () => {
      res = await result.current.signIn('test@example.com', 'pass');
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Network error');
  });

  it('signUp handles unexpected exceptions', async () => {
    mockAuth.signUp.mockRejectedValue(new Error('Network timeout'));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    let res: any;
    await act(async () => {
      res = await result.current.signUp('test@example.com', 'pass', 'Name');
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Network timeout');
  });
});
