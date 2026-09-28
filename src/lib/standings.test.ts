import { describe, it, expect } from 'vitest';
import { buildStandings, standingsToPar, type StandingsOptions } from './competition';

const row = (overrides: Partial<Parameters<typeof buildStandings>[0][number]> = {}) => ({
  scorecard_id: 'card-1',
  player_id: 'player-1',
  player_name: 'Player One',
  handicap_index: 0,
  gross: 72,
  to_par: 0,
  holes_completed: 18,
  status: 'verified' as const,
  ...overrides,
});

describe('buildStandings', () => {
  it('applies the handicap to produce net score and net to par', () => {
    const entries = buildStandings([
      row({ player_id: 'p1', player_name: 'High handicap', gross: 78, to_par: 6, handicap_index: 12 }),
      row({ player_id: 'p2', player_name: 'Scratch', gross: 70, to_par: -2, handicap_index: 0 }),
    ], 18);

    const scratch = entries.find((entry) => entry.player_id === 'p2');
    expect(scratch?.net_strokes).toBe(70);
    expect(scratch?.net_to_par).toBe(-2);

    const handicapped = entries.find((entry) => entry.player_id === 'p1');
    expect(handicapped?.net_strokes).toBe(66);
    expect(handicapped?.net_to_par).toBe(-6);
    expect(entries[0].player_id).toBe('p1');
  });

  it('ranks by gross when the handicap is switched off', () => {
    const options: StandingsOptions = { useHandicap: false };
    const entries = buildStandings([
      row({ player_id: 'p1', player_name: 'Gross worse net better', gross: 78, to_par: 6, handicap_index: 20 }),
      row({ player_id: 'p2', player_name: 'Gross better', gross: 72, to_par: 0, handicap_index: 0 }),
    ], 18, options);

    expect(entries[0].player_name).toBe('Gross better');
    expect(entries[0].net_strokes).toBe(72);
  });

  it('excludes unranked statuses by default and includes them on request', () => {
    const rows = [
      row({ player_id: 'p1', status: 'submitted' }),
      row({ player_id: 'p2', status: 'draft' }),
      row({ player_id: 'p3', status: 'in_progress' }),
    ];

    expect(buildStandings(rows, 18).map((entry) => entry.player_id)).toEqual(['p1']);
    expect(
      buildStandings(rows, 18, { includeInProgress: true }).map((entry) => entry.player_id).sort()
    ).toEqual(['p1', 'p2', 'p3']);
  });

  it('never ranks a rejected card', () => {
    const entries = buildStandings([row({ status: 'rejected' }), row({ player_id: 'p2', status: 'verified' })], 18, { includeInProgress: true });
    expect(entries.map((entry) => entry.scorecard_status)).not.toContain('rejected');
  });

  it('puts players further through the round ahead of leaders who are behind', () => {
    const entries = buildStandings([
      row({ player_id: 'behind', player_name: 'Behind', gross: 60, to_par: -6, holes_completed: 9 }),
      row({ player_id: 'ahead', player_name: 'Ahead', gross: 72, to_par: 0, holes_completed: 18 }),
    ], 18);
    expect(entries[0].player_id).toBe('ahead');
  });

  it('shares a position on an exact tie and then increments', () => {
    const entries = buildStandings([
      row({ player_id: 'a', player_name: 'A' }),
      row({ player_id: 'b', player_name: 'B' }),
      row({ player_id: 'c', player_name: 'C', gross: 74, to_par: 2 }),
    ], 18);

    expect(entries.map((entry) => entry.position)).toEqual([1, 1, 3]);
  });

  it('treats a missing or negative handicap as zero', () => {
    const [entry] = buildStandings([row({ gross: 70, to_par: -2, handicap_index: 0 })], 18);
    expect(entry.net_strokes).toBe(70);
  });
});

describe('standingsToPar', () => {
  it('formats even, over and under par scores', () => {
    expect(standingsToPar(0)).toBe('E');
    expect(standingsToPar(4)).toBe('+4');
    expect(standingsToPar(-3)).toBe('-3');
  });
});
