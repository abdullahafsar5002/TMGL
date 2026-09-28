import { describe, it, expect } from 'vitest';
import {
  LEADERBOARD_ELIGIBLE_STATUSES,
  aggregateStandingsByPlayer,
  countCompletedHoles,
  filterLeaderboardEligibleScorecards,
  isLeaderboardEligibleStatus,
  isScorecardComplete,
  selectChampion,
  sortAggregateStandings,
  type ChampionScorecard,
} from './scorecardEligibility';

function card(overrides: Partial<ChampionScorecard> & { player_id: string }): ChampionScorecard {
  return {
    id: `${overrides.player_id}-${overrides.round_id ?? 'r1'}`,
    round_id: 'r1',
    total_strokes: 72,
    total_score_to_par: 0,
    status: 'submitted',
    ...overrides,
  };
}

describe('leaderboard eligibility', () => {
  it('only allows submitted, verified and amended scorecards', () => {
    expect(LEADERBOARD_ELIGIBLE_STATUSES).toEqual(['submitted', 'verified', 'amended']);
  });

  it('accepts eligible statuses', () => {
    expect(isLeaderboardEligibleStatus('submitted')).toBe(true);
    expect(isLeaderboardEligibleStatus('verified')).toBe(true);
    expect(isLeaderboardEligibleStatus('amended')).toBe(true);
  });

  it('rejects draft, in_progress and rejected statuses', () => {
    expect(isLeaderboardEligibleStatus('draft')).toBe(false);
    expect(isLeaderboardEligibleStatus('in_progress')).toBe(false);
    expect(isLeaderboardEligibleStatus('rejected')).toBe(false);
  });

  it('rejects missing statuses', () => {
    expect(isLeaderboardEligibleStatus(null)).toBe(false);
    expect(isLeaderboardEligibleStatus(undefined)).toBe(false);
    expect(isLeaderboardEligibleStatus('')).toBe(false);
  });

  it('filters out non-eligible scorecards', () => {
    const cards = [
      card({ player_id: 'p1', status: 'submitted' }),
      card({ player_id: 'p2', status: 'draft' }),
      card({ player_id: 'p3', status: 'in_progress' }),
      card({ player_id: 'p4', status: 'rejected' }),
      card({ player_id: 'p5', status: 'verified' }),
      card({ player_id: 'p6', status: 'amended' }),
    ];

    const filtered = filterLeaderboardEligibleScorecards(cards);

    expect(filtered.map((c) => c.player_id)).toEqual(['p1', 'p5', 'p6']);
  });

  it('treats scorecards without a status as ineligible', () => {
    const filtered = filterLeaderboardEligibleScorecards([
      { player_id: 'p1', round_id: 'r1', total_strokes: 70 },
      { player_id: 'p2', round_id: 'r1', total_strokes: 70, status: 'verified' },
    ]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].player_id).toBe('p2');
  });
});

describe('scorecard completeness', () => {
  it('is complete when every expected hole is scored', () => {
    expect(isScorecardComplete({ holes_completed: 18, total_holes: 18 })).toBe(true);
  });

  it('is incomplete when holes are missing', () => {
    expect(isScorecardComplete({ holes_completed: 17, total_holes: 18 })).toBe(false);
  });

  it('is incomplete when the total is unknown', () => {
    expect(isScorecardComplete({ holes_completed: 0, total_holes: 0 })).toBe(false);
  });

  it('counts distinct scored holes only', () => {
    expect(countCompletedHoles([1, 1, 2, null, 0, 3])).toBe(3);
  });
});

describe('champion aggregation', () => {
  it('aggregates every round per player instead of the best single card', () => {
    const standings = aggregateStandingsByPlayer([
      card({ player_id: 'flashy', round_id: 'r1', total_strokes: 66, total_score_to_par: -12, status: 'verified' }),
      card({ player_id: 'flashy', round_id: 'r2', total_strokes: 100, total_score_to_par: 30, status: 'verified' }),
      card({ player_id: 'steady', round_id: 'r1', total_strokes: 80, total_score_to_par: 8, status: 'submitted' }),
      card({ player_id: 'steady', round_id: 'r2', total_strokes: 81, total_score_to_par: 9, status: 'submitted' }),
    ]);

    expect(standings).toHaveLength(2);
    const champion = selectChampion(standings);
    expect(champion?.player_id).toBe('steady');
    expect(champion?.total_strokes).toBe(161);
    expect(champion?.total_score_to_par).toBe(17);
    expect(champion?.rounds_played).toBe(2);
  });

  it('ignores draft, in_progress and rejected scorecards when aggregating', () => {
    const standings = aggregateStandingsByPlayer([
      card({ player_id: 'real', round_id: 'r1', total_strokes: 80, total_score_to_par: 8, status: 'submitted' }),
      card({ player_id: 'real', round_id: 'r2', total_strokes: 80, total_score_to_par: 8, status: 'submitted' }),
      card({ player_id: 'cheater', round_id: 'r1', total_strokes: 60, total_score_to_par: -20, status: 'in_progress' }),
      card({ player_id: 'cheater', round_id: 'r2', total_strokes: 60, total_score_to_par: -20, status: 'draft' }),
      card({ player_id: 'rejected', round_id: 'r1', total_strokes: 60, total_score_to_par: -20, status: 'rejected' }),
      card({ player_id: 'rejected', round_id: 'r2', total_strokes: 60, total_score_to_par: -20, status: 'rejected' }),
    ]);

    expect(standings.map((s) => s.player_id)).toEqual(['real']);
  });

  it('includes amended scorecards', () => {
    const standings = aggregateStandingsByPlayer([
      card({ player_id: 'p1', round_id: 'r1', total_strokes: 70, total_score_to_par: -2, status: 'amended' }),
    ]);

    expect(standings).toHaveLength(1);
    expect(standings[0].player_id).toBe('p1');
  });

  it('excludes players who do not have a card for every round', () => {
    const standings = aggregateStandingsByPlayer(
      [
        card({ player_id: 'complete', round_id: 'r1', total_strokes: 80, total_score_to_par: 8, status: 'submitted' }),
        card({ player_id: 'complete', round_id: 'r2', total_strokes: 80, total_score_to_par: 8, status: 'submitted' }),
        card({ player_id: 'partial', round_id: 'r1', total_strokes: 61, total_score_to_par: -11, status: 'submitted' }),
      ],
      { requiredRounds: 2 }
    );

    expect(standings.map((s) => s.player_id)).toEqual(['complete']);
    expect(standings[0].rounds_played).toBe(2);
  });

  it('skips eligible scorecards that have no total', () => {
    const standings = aggregateStandingsByPlayer([
      card({ player_id: 'p1', round_id: 'r1', total_strokes: null, total_score_to_par: null, status: 'submitted' }),
    ]);

    expect(standings).toEqual([]);
    expect(selectChampion(standings)).toBeNull();
  });

  it('breaks ties on total strokes then player id', () => {
    const standings = aggregateStandingsByPlayer([
      card({ player_id: 'b', round_id: 'r1', total_strokes: 80, total_score_to_par: 8, status: 'submitted' }),
      card({ player_id: 'a', round_id: 'r1', total_strokes: 79, total_score_to_par: 8, status: 'submitted' }),
      card({ player_id: 'c', round_id: 'r1', total_strokes: 80, total_score_to_par: 8, status: 'submitted' }),
    ]);

    expect(selectChampion(standings)?.player_id).toBe('a');
    expect(sortAggregateStandings(standings).map((s) => s.player_id)).toEqual(['a', 'b', 'c']);
  });

  it('returns null when there are no eligible standings', () => {
    expect(selectChampion([])).toBeNull();
  });
});
