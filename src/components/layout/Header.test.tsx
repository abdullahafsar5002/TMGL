import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Header } from './Header';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderHeader(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Header />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('Header navigation', () => {
  it('navigates from every desktop navigation link', () => {
    renderHeader();
    const nav = screen.getByRole('navigation', { name: 'Main' });

    for (const [label, expected] of [
      ['Tournaments', '/tournaments'],
      ['Leaderboard', '/leaderboard'],
      ['About', '/about'],
      ['News', '/news'],
      ['Home', '/'],
    ] as const) {
      const link = within(nav).getByRole('link', { name: label });
      fireEvent.click(link);
      expect(screen.getByTestId('location')).toHaveTextContent(expected);
    }
  });

  it('opens the mobile menu and navigates from mobile links', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    const nav = screen.getByRole('navigation', { name: 'Mobile' });
    fireEvent.click(within(nav).getByRole('link', { name: 'Tournaments' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/tournaments');
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).toBeNull();
  });

  it('navigates to login from the mobile menu', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const menu = screen.getByRole('navigation', { name: 'Mobile' }).parentElement as HTMLElement;
    fireEvent.click(within(menu).getByRole('link', { name: 'Sign in' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('marks the current destination as active', () => {
    renderHeader('/about');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page');
  });

  it('closes the mobile menu on Escape and restores focus', async () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('navigation', { name: 'Mobile' })).toBeNull();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
    });
  });
});
