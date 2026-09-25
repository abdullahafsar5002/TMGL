import { matchRoutes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { resolvePageExport } from './pageLoader';
import { ROUTES, ROUTE_PATTERNS } from './routes';

describe('page module resolution', () => {
  const NamedPage = () => null;
  const DefaultPage = () => null;

  it('resolves a named page export', () => {
    expect(resolvePageExport({ NamedPage }, 'NamedPage')).toBe(NamedPage);
  });

  it('falls back to a default page export', () => {
    expect(resolvePageExport({ default: DefaultPage }, 'MissingPage')).toBe(DefaultPage);
  });

  it('fails clearly when neither export exists', () => {
    expect(() => resolvePageExport({}, 'MissingPage')).toThrow('Page module does not export MissingPage');
  });
});

describe('route helpers', () => {
  it('builds practice score paths', () => {
    expect(ROUTES.practiceScore('practice-1')).toBe('/practice/practice-1/score');
    expect(ROUTES.practiceScorecard('practice-1')).toBe('/practice/practice-1/scorecard');
  });

  it('builds nested competition creation paths', () => {
    expect(ROUTES.tournamentRoundCreate('tournament-1')).toBe('/tournaments/tournament-1/rounds/new');
    expect(ROUTES.roundMatchCreate('round-1')).toBe('/rounds/round-1/matches/new');
  });

  it('matches nested params expected by the create pages', () => {
    const roundMatch = matchRoutes(
      [{ path: ROUTE_PATTERNS.tournamentRoundCreate, element: null }],
      '/tournaments/tournament-1/rounds/new'
    );
    const matchMatch = matchRoutes(
      [{ path: ROUTE_PATTERNS.roundMatchCreate, element: null }],
      '/rounds/round-1/matches/new'
    );

    expect(roundMatch?.[0].params).toEqual({ id: 'tournament-1' });
    expect(matchMatch?.[0].params).toEqual({ roundId: 'round-1' });
  });

  it('keeps friendly match aliases available', () => {
    expect(ROUTES.friendlyMatch('match-1')).toBe('/friendly-matches/match-1');
    expect(ROUTES.friendlyMatchScore('match-1')).toBe('/friendly-matches/match-1/score');
    expect(ROUTES.legacyFriendlyMatch('match-1')).toBe('/friendly/match-1');
    expect(ROUTE_PATTERNS.legacyFriendlyMatchScore).toBe('/friendly/:id/score');
  });

  it('defines authenticated mobile destinations', () => {
    expect(ROUTES.authenticatedEvents).toBe('/dashboard/tournaments');
    expect(ROUTES.authenticatedLeaderboard).toBe('/dashboard/leaderboard');
  });
});
