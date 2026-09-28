import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Header } from './Header';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, profile: { full_name: 'Test Golfer', role: 'player' } })
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="pathname">{location.pathname}</span>;
}

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Header />
      <LocationProbe />
    </MemoryRouter>
  );
}

function currentPath(): string {
  return screen.getByTestId('pathname').textContent ?? '';
}

function mobileNav() {
  return within(screen.getByRole('navigation', { name: 'Mobile navigation' }));
}

describe('Header mobile navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders real anchors so navigation is addressable and openable in a new tab', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'Tournaments' }).getAttribute('href')).toBe('/tournaments');
  });

  it('navigates when a mobile menu link is pressed', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByLabelText('Open menu'));
    await user.click(mobileNav().getByRole('link', { name: 'Tournaments' }));

    expect(currentPath()).toBe('/tournaments');
    expect(screen.queryByLabelText('Close menu')).toBeNull();
  });

  it('navigates from the dashboard action inside the mobile menu', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByLabelText('Open menu'));
    await user.click(mobileNav().getByRole('button', { name: 'Open dashboard' }));

    expect(currentPath()).toBe('/dashboard');
  });

  it('closes the menu on outside click without navigating', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByLabelText('Open menu'));
    expect(screen.queryByLabelText('Close menu')).not.toBeNull();

    await user.click(document.body);

    expect(screen.queryByLabelText('Close menu')).toBeNull();
    expect(currentPath()).toBe('/');
  });

  it('closes the menu when Escape is pressed', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByLabelText('Open menu'));
    await user.keyboard('{Escape}');

    expect(screen.queryByLabelText('Close menu')).toBeNull();
  });
});
