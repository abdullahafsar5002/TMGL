import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AuthenticatedHeader } from './AuthenticatedHeader';
import { getAuthNavItems } from './authNavigation';

const mocks = vi.hoisted(() => ({
  signOut: vi.fn().mockResolvedValue(undefined),
  getUnreadCount: vi.fn().mockResolvedValue({ data: 0, error: null }),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'player@tmgl.com' },
    profile: { id: 'profile-1', full_name: 'Test Player', role: 'player' },
    signOut: mocks.signOut,
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: mocks.success, error: mocks.error, info: vi.fn(), warning: vi.fn() }),
}));

vi.mock('@/lib/notifications', () => ({
  getUnreadCount: mocks.getUnreadCount,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderHeader(initialPath = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthenticatedHeader />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('AuthenticatedHeader navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUnreadCount.mockResolvedValue({ data: 0, error: null });
    mocks.signOut.mockResolvedValue(undefined);
  });

  it('navigates from every desktop navigation link', () => {
    renderHeader();
    const nav = screen.getByRole('navigation', { name: 'Main' });

    for (const [label, expected] of [
      ['Events', '/dashboard/tournaments'],
      ['Practice', '/practice'],
      ['Leaderboard', '/dashboard/leaderboard'],
      ['My Scores', '/my-scores'],
      ['Dashboard', '/dashboard'],
    ] as const) {
      fireEvent.click(within(nav).getByRole('link', { name: label }));
      expect(screen.getByTestId('location')).toHaveTextContent(expected);
    }
  });

  it('navigates on a real mobile tap sequence without the menu closing first', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    const nav = screen.getByRole('navigation', { name: 'Mobile' });
    const link = within(nav).getByRole('link', { name: 'Practice' });

    fireEvent.mouseDown(link);
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeNull();

    fireEvent.mouseUp(link);
    fireEvent.click(link);

    expect(screen.getByTestId('location')).toHaveTextContent('/practice');
  });

  it('navigates on a touch tap sequence', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    const nav = screen.getByRole('navigation', { name: 'Mobile' });
    const link = within(nav).getByRole('link', { name: 'Leaderboard' });

    fireEvent.touchStart(link);
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeNull();

    fireEvent.touchEnd(link);
    fireEvent.click(link);

    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard/leaderboard');
  });

  it('still closes the mobile menu when tapping outside it', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeNull();

    fireEvent.mouseDown(screen.getByTestId('location'));
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).toBeNull();
  });

  it('navigates from the mobile menu and closes it after the route changes', async () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    const nav = screen.getByRole('navigation', { name: 'Mobile' });
    fireEvent.click(within(nav).getByRole('link', { name: 'Events' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard/tournaments');
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: 'Mobile' })).toBeNull();
    });
  });

  it('navigates from every mobile menu link', () => {
    for (const item of getAuthNavItems('player')) {
      const view = renderHeader();
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      const nav = screen.getByRole('navigation', { name: 'Mobile' });
      const link = within(nav).getByRole('link', { name: item.label });

      expect(link.getAttribute('href')).toBe(item.path);
      fireEvent.click(link);
      expect(screen.getByTestId('location')).toHaveTextContent(item.path);
      view.unmount();
    }
  });

  it('navigates to profile settings from the account menu', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Profile settings' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/profile/settings');
  });

  it('signs out and returns to the public home page', async () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/');
    });
  });
});
