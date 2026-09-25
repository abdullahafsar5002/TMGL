import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthenticatedBottomNav } from './AuthenticatedBottomNav';
import { getAuthNavItems } from './authNavigation';
import type { UserRole } from '@/types/auth';

const useAuthMock = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

function renderNav(pathname: string, role: UserRole | null = 'player') {
  useAuthMock.mockReturnValue({ profile: role ? { id: 'profile-1', role } : null });
  return render(
    <MemoryRouter
      initialEntries={[pathname]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthenticatedBottomNav />
    </MemoryRouter>
  );
}

function navButtons(): HTMLElement[] {
  return screen.getAllByRole('button');
}

function currentItemLabels(): string[] {
  return navButtons()
    .filter((button) => button.getAttribute('aria-current') === 'page')
    .map((button) => button.textContent ?? '');
}

describe('AuthenticatedBottomNav', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it('renders exactly the five primary authenticated destinations', () => {
    renderNav('/dashboard');
    const buttons = navButtons();
    expect(buttons).toHaveLength(5);
    expect(buttons.map((b) => b.textContent)).toEqual(['Home', 'Events', 'Practice', 'Board', 'Profile']);
  });

  it('exposes a primary navigation landmark', () => {
    renderNav('/dashboard');
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeTruthy();
  });

  it('marks the active destination with aria-current and leaves the rest unmarked', () => {
    renderNav('/dashboard/tournaments/abc');
    const buttons = navButtons();
    const active = buttons.filter((b) => b.getAttribute('aria-current') === 'page');
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toBe('Events');
    for (const button of buttons.filter((b) => b.getAttribute('aria-current') === null)) {
      expect(button.hasAttribute('aria-current')).toBe(false);
    }
  });

  it.each([
    ['/dashboard', 'Home'],
    ['/dashboard/tournaments', 'Events'],
    ['/practice', 'Practice'],
    ['/practice/abc/score', 'Practice'],
    ['/dashboard/leaderboard', 'Board'],
    ['/profile/settings', 'Profile'],
  ])('marks %s as the current destination', (pathname, expected) => {
    renderNav(pathname);
    expect(currentItemLabels()).toEqual([expected]);
  });

  it('does not activate a destination for an unrelated authenticated page', () => {
    renderNav('/players/abc');
    expect(currentItemLabels()).toEqual([]);
  });

  it('does not activate authenticated destinations on public paths', () => {
    renderNav('/tournaments');
    expect(currentItemLabels()).toEqual([]);
    renderNav('/leaderboard');
    expect(currentItemLabels()).toEqual([]);
  });

  it('keeps the same five destinations when no profile is loaded', () => {
    renderNav('/dashboard', null);
    expect(navButtons()).toHaveLength(5);
    expect(currentItemLabels()).toEqual(['Home']);
    expect(navButtons().map((b) => b.textContent)).toEqual(
      getAuthNavItems(null, { scope: 'primary' }).map((item) => item.shortLabel)
    );
  });

  it('does not change the primary set for league managers', () => {
    renderNav('/organizer', 'league_manager');
    expect(navButtons().map((b) => b.textContent)).toEqual(['Home', 'Events', 'Practice', 'Board', 'Profile']);
    expect(currentItemLabels()).toEqual([]);
  });
});
