import { describe, it, expect, vi, beforeEach } from 'vitest';

type QueryResponse = { data: unknown; error: { message: string } | null };
type RecordedCall = { table: string; method: string; args: unknown[] };

const responses: Record<string, QueryResponse> = {};
const calls: RecordedCall[] = [];

function resolve(table: string, mode = 'select', one = false): QueryResponse {
  if (one) {
    const single = responses[`${table}:${mode}:one`];
    if (single) return single;
  }
  return responses[`${table}:${mode}`] ?? responses[table] ?? { data: [], error: null };
}

function createQueryBuilder(table: string) {
  let mode = 'select';
  const builder: Record<string, unknown> = {
    select: (...args: unknown[]) => { calls.push({ table, method: 'select', args }); return builder; },
    insert: (...args: unknown[]) => { mode = 'insert'; calls.push({ table, method: 'insert', args }); return builder; },
    update: (...args: unknown[]) => { mode = 'update'; calls.push({ table, method: 'update', args }); return builder; },
    upsert: (...args: unknown[]) => { mode = 'upsert'; calls.push({ table, method: 'upsert', args }); return builder; },
    delete: (...args: unknown[]) => { mode = 'delete'; calls.push({ table, method: 'delete', args }); return builder; },
    eq: (...args: unknown[]) => { calls.push({ table, method: 'eq', args }); return builder; },
    in: (...args: unknown[]) => { calls.push({ table, method: 'in', args }); return builder; },
    not: (...args: unknown[]) => { calls.push({ table, method: 'not', args }); return builder; },
    order: (...args: unknown[]) => { calls.push({ table, method: 'order', args }); return builder; },
    limit: (...args: unknown[]) => { calls.push({ table, method: 'limit', args }); return builder; },
    maybeSingle: () => Promise.resolve(resolve(table, mode, true)),
    single: () => Promise.resolve(resolve(table, mode, true)),
    then: (onOk: (value: QueryResponse) => unknown, onErr: (reason: unknown) => unknown) =>
      Promise.resolve(resolve(table, mode, false)).then(onOk, onErr),
  };
  return builder;
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => createQueryBuilder(table),
  },
}));

import { finalizeTournament } from './tournamentFinalize';
import {
  LEADERBOARD_ELIGIBLE_STATUSES,
  getLeaderboard,
  getTournamentLeaderboard,
  getScorecardsCompletionByRound,
  verifyScorecard,
  buildLeaderboardEntries,
  buildTournamentLeaderboardEntries,
} from './competition';

const TOURNAMENT_ID = 'tournament-1';
const COURSE_ID = 'course-1';

function setResponses(next: Record<string, QueryResponse>) {
  for (const key of Object.keys(responses)) delete responses[key];
  Object.assign(responses, next);
}

function baseResponses(scorecards: unknown[]): Record<string, QueryResponse> {
  return {
    rounds: { data: [{ id: 'r1' }, { id: 'r2' }], error: null },
    'rounds:select:one': { data: { id: 'r1', tournament_id: TOURNAMENT_ID }, error: null },
    scorecards: { data: scorecards, error: null },
    'scorecards:update': { data: [{ id: 'verified' }], error: null },
    tournament_trophies: { data: [], error: null },
    players: { data: { full_name: 'Test Player' }, error: null },
    tournaments: { data: { id: TOURNAMENT_ID, course_id: COURSE_ID }, error: null },
    'tournaments:update': { data: { id: TOURNAMENT_ID, status: 'completed' }, error: null },
    courses: { data: [{ id: COURSE_ID, holes_count: 18 }], error: null },
    'courses:select:one': { data: { id: COURSE_ID, holes_count: 18 }, error: null },
    course_holes: {
      data: Array.from({ length: 18 }, (_, i) => ({ course_id: COURSE_ID, hole_number: i + 1, par: 4 })),
      error: null,
    },
  };
}

describe('finalizeTournament', () => {
  beforeEach(() => {
    calls.length = 0;
    setResponses({});
  });

  it('awards the trophy to the aggregated champion, not the best single card', async () => {
    setResponses(
      baseResponses([
        { id: 'sc-a1', round_id: 'r1', player_id: 'player-flashy', total_strokes: 65, total_score_to_par: -13, status: 'submitted' },
        { id: 'sc-a2', round_id: 'r2', player_id: 'player-flashy', total_strokes: 101, total_score_to_par: 31, status: 'submitted' },
        { id: 'sc-b1', round_id: 'r1', player_id: 'player-steady', total_strokes: 80, total_score_to_par: 8, status: 'submitted' },
        { id: 'sc-b2', round_id: 'r2', player_id: 'player-steady', total_strokes: 81, total_score_to_par: 9, status: 'submitted' },
      ])
    );

    const result = await finalizeTournament(TOURNAMENT_ID);

    expect(result.error).toBeNull();
    expect(result.data?.trophy_winner_id).toBe('player-steady');

    const trophyCall = calls.find((c) => c.table === 'tournament_trophies' && c.method === 'upsert');
    expect(trophyCall).toBeDefined();
    expect((trophyCall?.args[0] as { player_id: string }).player_id).toBe('player-steady');
  });

  it('ignores draft, in_progress and rejected scorecards when picking the champion', async () => {
    setResponses(
      baseResponses([
        { id: 'sc-r1', round_id: 'r1', player_id: 'real', total_strokes: 80, total_score_to_par: 8, status: 'submitted' },
        { id: 'sc-r2', round_id: 'r2', player_id: 'real', total_strokes: 80, total_score_to_par: 8, status: 'submitted' },
        { id: 'sc-d1', round_id: 'r1', player_id: 'drafter', total_strokes: 60, total_score_to_par: -20, status: 'in_progress' },
        { id: 'sc-d2', round_id: 'r2', player_id: 'drafter', total_strokes: 60, total_score_to_par: -20, status: 'draft' },
        { id: 'sc-x1', round_id: 'r1', player_id: 'rejected', total_strokes: 61, total_score_to_par: -19, status: 'rejected' },
        { id: 'sc-x2', round_id: 'r2', player_id: 'rejected', total_strokes: 61, total_score_to_par: -19, status: 'rejected' },
      ])
    );

    const result = await finalizeTournament(TOURNAMENT_ID);

    expect(result.error).toBeNull();
    expect(result.data?.trophy_winner_id).toBe('real');
  });

  it('skips players who are missing a round', async () => {
    setResponses(
      baseResponses([
        { id: 'sc-a1', round_id: 'r1', player_id: 'complete', total_strokes: 84, total_score_to_par: 12, status: 'submitted' },
        { id: 'sc-a2', round_id: 'r2', player_id: 'complete', total_strokes: 84, total_score_to_par: 12, status: 'submitted' },
        { id: 'sc-b1', round_id: 'r1', player_id: 'partial', total_strokes: 61, total_score_to_par: -11, status: 'submitted' },
      ])
    );

    const result = await finalizeTournament(TOURNAMENT_ID);

    expect(result.data?.trophy_winner_id).toBe('complete');
  });

  it('only auto-verifies submitted scorecards', async () => {
    setResponses(
      baseResponses([
        { id: 'sc-s', round_id: 'r1', player_id: 'p1', total_strokes: 80, total_score_to_par: 8, status: 'submitted' },
        { id: 'sc-d', round_id: 'r1', player_id: 'p1', total_strokes: 80, total_score_to_par: 8, status: 'in_progress' },
        { id: 'sc-v', round_id: 'r1', player_id: 'p1', total_strokes: 80, total_score_to_par: 8, status: 'verified' },
      ])
    );

    await finalizeTournament(TOURNAMENT_ID);

    const updateCall = calls.find((c) => c.table === 'scorecards' && c.method === 'update');
    expect(updateCall).toBeDefined();
    expect((updateCall?.args[0] as { status: string }).status).toBe('verified');

    const idFilter = calls.find((c) => c.table === 'scorecards' && c.method === 'in' && c.args[0] === 'id');
    expect(idFilter?.args[1]).toEqual(['sc-s']);
  });

  it('aborts and returns an error when verification fails', async () => {
    const next = baseResponses([
      { id: 'sc-s', round_id: 'r1', player_id: 'p1', total_strokes: 80, total_score_to_par: 8, status: 'submitted' },
      { id: 'sc-s2', round_id: 'r2', player_id: 'p1', total_strokes: 80, total_score_to_par: 8, status: 'submitted' },
    ]);
    next['scorecards:update'] = { data: null, error: { message: 'permission denied' } };
    setResponses(next);

    const result = await finalizeTournament(TOURNAMENT_ID);

    expect(result.data).toBeNull();
    expect(result.error).toContain('Scorecard verification failed');
    expect(result.error).toContain('permission denied');
    expect(calls.some((c) => c.table === 'tournament_trophies')).toBe(false);
    expect(calls.some((c) => c.table === 'tournaments' && c.method === 'update')).toBe(false);
  });

  it('does not complete the tournament when the trophy award fails', async () => {
    const next = baseResponses([
      { id: 'sc-a', round_id: 'r1', player_id: 'p1', total_strokes: 80, total_score_to_par: 8, status: 'submitted' },
      { id: 'sc-b', round_id: 'r2', player_id: 'p1', total_strokes: 80, total_score_to_par: 8, status: 'submitted' },
    ]);
    next['tournament_trophies'] = { data: null, error: { message: 'trophy write failed' } };
    setResponses(next);

    const result = await finalizeTournament(TOURNAMENT_ID);

    expect(result.data).toBeNull();
    expect(result.error).toContain('Trophy award failed');
    expect(calls.some((c) => c.table === 'tournaments' && c.method === 'update')).toBe(false);
  });

  it('returns an error when the tournament has no rounds', async () => {
    setResponses({ rounds: { data: [], error: null } });

    const result = await finalizeTournament(TOURNAMENT_ID);

    expect(result.data).toBeNull();
    expect(result.error).toContain('No rounds found');
  });
});

describe('leaderboard eligibility filtering', () => {
  beforeEach(() => {
    calls.length = 0;
    setResponses({});
  });

  it('restricts the round leaderboard query to eligible statuses', async () => {
    setResponses(baseResponses([]));

    await getLeaderboard('r1');

    const inCall = calls.find((c) => c.table === 'scorecards' && c.method === 'in');
    expect(inCall?.args[0]).toBe('status');
    expect(inCall?.args[1]).toEqual(LEADERBOARD_ELIGIBLE_STATUSES);
  });

  it('restricts the tournament leaderboard query to eligible statuses', async () => {
    setResponses(baseResponses([]));

    await getTournamentLeaderboard(TOURNAMENT_ID);

    const inCalls = calls.filter((c) => c.table === 'scorecards' && c.method === 'in');
    expect(inCalls.some((c) => c.args[0] === 'status' && (c.args[1] as string[]).includes('amended'))).toBe(true);
    const statusArgs = inCalls.filter((c) => c.args[0] === 'status').map((c) => c.args[1]);
    for (const args of statusArgs) {
      expect(args).toEqual(['submitted', 'verified', 'amended']);
    }
  });

  it('uses the actual course hole count for the round leaderboard', async () => {
    setResponses({
      ...baseResponses([]),
      scorecards: {
        data: [
          { id: 'sc1', player_id: 'p1', status: 'submitted', total_strokes: 40, total_score_to_par: 1, players: { id: 'p1', full_name: 'A' } },
          { id: 'sc2', player_id: 'p2', status: 'verified', total_strokes: 42, total_score_to_par: 3, players: { id: 'p2', full_name: 'B' } },
        ],
        error: null,
      },
      'courses:select:one': { data: { id: COURSE_ID, holes_count: 9 }, error: null },
      course_holes: { data: Array.from({ length: 9 }, (_, i) => ({ course_id: COURSE_ID, hole_number: i + 1, par: 4 })), error: null },
    });

    const result = await getLeaderboard('r1');

    expect(result.error).toBeNull();
    expect(result.data?.map((e) => [e.player_id, e.holes_completed, e.total_holes])).toEqual([
      ['p1', 9, 9],
      ['p2', 9, 9],
    ]);
  });

  it('drops ineligible rows that the database still returns', () => {
    const entries = buildLeaderboardEntries(
      [
        { id: 'sc1', player_id: 'p1', status: 'submitted', total_strokes: 70, total_score_to_par: -2, players: { id: 'p1', full_name: 'A' } },
        { id: 'sc2', player_id: 'p2', status: 'in_progress', total_strokes: 65, total_score_to_par: -7, players: { id: 'p2', full_name: 'B' } },
        { id: 'sc3', player_id: 'p3', status: 'draft', total_strokes: 60, total_score_to_par: -12, players: { id: 'p3', full_name: 'C' } },
        { id: 'sc4', player_id: 'p4', status: 'rejected', total_strokes: 60, total_score_to_par: -12, players: { id: 'p4', full_name: 'D' } },
        { id: 'sc5', player_id: 'p5', status: 'amended', total_strokes: 75, total_score_to_par: 3, players: { id: 'p5', full_name: 'E' } },
        { id: 'sc6', player_id: 'p6', status: 'verified', total_strokes: null, total_score_to_par: null, players: { id: 'p6', full_name: 'F' } },
      ],
      18
    );

    expect(entries.map((e) => e.player_id)).toEqual(['p1', 'p5']);
    expect(entries[0].position).toBe(1);
    expect(entries[1].position).toBe(2);
    expect(entries[0].holes_completed).toBe(18);
    expect(entries[0].total_holes).toBe(18);
  });

  it('aggregates eligible rounds per player for the tournament leaderboard', () => {
    const entries = buildTournamentLeaderboardEntries(
      [
        { id: 'sc1', player_id: 'p1', status: 'submitted', total_strokes: 80, total_score_to_par: 8, players: { id: 'p1', full_name: 'A' } },
        { id: 'sc2', player_id: 'p1', status: 'submitted', total_strokes: 82, total_score_to_par: 10, players: { id: 'p1', full_name: 'A' } },
        { id: 'sc3', player_id: 'p2', status: 'submitted', total_strokes: 70, total_score_to_par: -2, players: { id: 'p2', full_name: 'B' } },
        { id: 'sc4', player_id: 'p2', status: 'in_progress', total_strokes: 60, total_score_to_par: -12, players: { id: 'p2', full_name: 'B' } },
      ],
      18,
      2
    );

    expect(entries).toHaveLength(2);

    const leader = entries[0];
    expect(leader.player_id).toBe('p2');
    expect(leader.total_strokes).toBe(70);
    expect(leader.total_score_to_par).toBe(-2);
    expect(leader.position).toBe(1);

    const second = entries[1];
    expect(second.player_id).toBe('p1');
    expect(second.total_strokes).toBe(162);
    expect(second.total_score_to_par).toBe(18);
    expect(second.total_holes).toBe(36);
    expect(second.position).toBe(2);
  });
});

describe('scorecard verification guard', () => {
  beforeEach(() => {
    calls.length = 0;
    setResponses({});
  });

  it('refuses to verify an incomplete scorecard', async () => {
    setResponses({
      scorecards: { data: [], error: null },
      'scorecards:select:one': { data: { id: 'sc1', round_id: 'r1', player_id: 'p1', course_id: COURSE_ID }, error: null },
      'courses:select:one': { data: { id: COURSE_ID, holes_count: 18 }, error: null },
      course_holes: { data: Array.from({ length: 18 }, (_, i) => ({ course_id: COURSE_ID, hole_number: i + 1, par: 4 })), error: null },
      scorecard_holes: { data: Array.from({ length: 17 }, (_, i) => ({ hole_number: i + 1 })), error: null },
    });

    const result = await verifyScorecard('sc1');

    expect(result.data).toBeNull();
    expect(result.error).toContain('Cannot verify an incomplete scorecard (17/18 holes scored)');
    expect(calls.some((c) => c.table === 'scorecards' && c.method === 'update')).toBe(false);
  });

  it('verifies a complete scorecard', async () => {
    setResponses({
      'scorecards:select:one': { data: { id: 'sc1', round_id: 'r1', player_id: 'p1', course_id: COURSE_ID }, error: null },
      'scorecards:update': { data: { id: 'sc1', status: 'verified' }, error: null },
      'courses:select:one': { data: { id: COURSE_ID, holes_count: 9 }, error: null },
      course_holes: { data: Array.from({ length: 9 }, (_, i) => ({ course_id: COURSE_ID, hole_number: i + 1, par: 4 })), error: null },
      scorecard_holes: { data: Array.from({ length: 9 }, (_, i) => ({ hole_number: i + 1 })), error: null },
    });

    const result = await verifyScorecard('sc1');

    expect(result.error).toBeNull();
    expect(result.data?.status).toBe('verified');
  });

  it('reports completion per scorecard for a round', async () => {
    setResponses({
      ...baseResponses([]),
      scorecards: {
        data: [
          { id: 'sc1', player_id: 'p1', course_id: COURSE_ID },
          { id: 'sc2', player_id: 'p2', course_id: COURSE_ID },
        ],
        error: null,
      },
      scorecard_holes: {
        data: [
          ...Array.from({ length: 18 }, (_, i) => ({ scorecard_id: 'sc1', hole_number: i + 1 })),
          ...Array.from({ length: 5 }, (_, i) => ({ scorecard_id: 'sc2', hole_number: i + 1 })),
        ],
        error: null,
      },
    });

    const result = await getScorecardsCompletionByRound('r1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      { scorecard_id: 'sc1', player_id: 'p1', course_id: COURSE_ID, holes_completed: 18, total_holes: 18, is_complete: true },
      { scorecard_id: 'sc2', player_id: 'p2', course_id: COURSE_ID, holes_completed: 5, total_holes: 18, is_complete: false },
    ]);
  });

  it('uses a 9-hole course layout when the course is 9 holes', async () => {
    setResponses({
      ...baseResponses([]),
      scorecards: { data: [{ id: 'sc1', player_id: 'p1', course_id: COURSE_ID }], error: null },
      courses: { data: [{ id: COURSE_ID, holes_count: 9 }], error: null },
      'courses:select:one': { data: { id: COURSE_ID, holes_count: 9 }, error: null },
      course_holes: { data: Array.from({ length: 9 }, (_, i) => ({ course_id: COURSE_ID, hole_number: i + 1, par: 4 })), error: null },
      scorecard_holes: { data: Array.from({ length: 9 }, (_, i) => ({ scorecard_id: 'sc1', hole_number: i + 1 })), error: null },
    });

    const result = await getScorecardsCompletionByRound('r1');

    expect(result.data?.[0]).toMatchObject({ holes_completed: 9, total_holes: 9, is_complete: true });
  });

  it('derives the hole count from course hole rows when holes_count is missing', async () => {
    setResponses({
      ...baseResponses([]),
      scorecards: { data: [{ id: 'sc1', player_id: 'p1', course_id: COURSE_ID }], error: null },
      courses: { data: [{ id: COURSE_ID, holes_count: null }], error: null },
      course_holes: { data: Array.from({ length: 9 }, (_, i) => ({ course_id: COURSE_ID, hole_number: i + 1 })), error: null },
      scorecard_holes: { data: Array.from({ length: 9 }, (_, i) => ({ scorecard_id: 'sc1', hole_number: i + 1 })), error: null },
    });

    const result = await getScorecardsCompletionByRound('r1');

    expect(result.data?.[0]).toMatchObject({ holes_completed: 9, total_holes: 9, is_complete: true });
  });
});
