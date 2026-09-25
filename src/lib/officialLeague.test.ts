import { describe, it, expect, vi, beforeEach } from 'vitest';

type QueryResponse = { data: unknown[] | null; error: { message: string } | null };

const responses: Record<string, QueryResponse> = {};
const selectArgs: Record<string, string[]> = {};
const fromMock = vi.fn((table: string) => createQueryBuilder(table));

function createQueryBuilder(table: string) {
  const builder: Record<string, unknown> = {
    select: (columns: string) => {
      selectArgs[table] = [...(selectArgs[table] ?? []), columns];
      return builder;
    },
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    then: (resolve: (value: QueryResponse) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(responses[table] ?? { data: [], error: null }).then(resolve, reject),
  };
  return builder;
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

import {
  getOfficialTeamStandings,
  getNotableRoundPerformances,
  getLeaguePartners,
  getOfficialLeagueOverview,
} from './officialLeague';

const TOURNAMENT_ID = 'tournament-1';

function standing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'standing-1',
    tournament_id: TOURNAMENT_ID,
    team_id: 'team-1',
    position: 1,
    combined_gross: 291,
    combined_net: 273,
    accumulated_score: 564,
    source_url: 'https://torukmaktoleague.com/standings.html',
    created_at: '2021-10-23T00:00:00.000Z',
    updated_at: '2021-10-23T00:00:00.000Z',
    ...overrides,
  };
}

function performance(overrides: Record<string, unknown> = {}) {
  return {
    id: 'performance-1',
    tournament_id: TOURNAMENT_ID,
    player_id: 'player-1',
    team_id: 'team-1',
    gross_score: 68,
    handicap_index: 3,
    net_score: 65,
    note: 'Low gross score of the tournament.',
    source_url: 'https://torukmaktoleague.com/standings.html',
    created_at: '2021-10-23T00:00:00.000Z',
    ...overrides,
  };
}

function setResponses(next: Record<string, QueryResponse>) {
  for (const key of Object.keys(responses)) delete responses[key];
  Object.assign(responses, next);
}

describe('officialLeague — official team standings', () => {
  beforeEach(() => {
    setResponses({});
  });

  it('returns an empty list when no official rows exist', async () => {
    setResponses({ official_team_standings: { data: [], error: null } });

    const result = await getOfficialTeamStandings(TOURNAMENT_ID);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('maps team name and sponsor without nested joins', async () => {
    setResponses({
      official_team_standings: {
        data: [standing()],
        error: null,
      },
      teams: {
        data: [
          { id: 'team-1', name: 'Markhor Warriors', sponsor_name: 'Markhors Logistics', franchise_type: 'official' },
        ],
        error: null,
      },
    });

    const result = await getOfficialTeamStandings(TOURNAMENT_ID);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]).toMatchObject({
      id: 'standing-1',
      team_name: 'Markhor Warriors',
      sponsor_name: 'Markhors Logistics',
      franchise_type: 'official',
      combined_gross: 291,
      combined_net: 273,
      accumulated_score: 564,
    });
  });

  it('falls back to a placeholder when the team row is not visible', async () => {
    setResponses({
      official_team_standings: { data: [standing()], error: null },
      teams: { data: [], error: null },
    });

    const result = await getOfficialTeamStandings(TOURNAMENT_ID);

    expect(result.error).toBeNull();
    expect(result.data?.[0].team_name).toBe('Unknown team');
    expect(result.data?.[0].sponsor_name).toBeNull();
    expect(result.data?.[0].franchise_type).toBeNull();
  });

  it('treats a blank sponsor name as no sponsor', async () => {
    setResponses({
      official_team_standings: { data: [standing()], error: null },
      teams: {
        data: [{ id: 'team-1', name: 'Grey Wolf', sponsor_name: '   ', franchise_type: 'additional' }],
        error: null,
      },
    });

    const result = await getOfficialTeamStandings(TOURNAMENT_ID);

    expect(result.data?.[0].sponsor_name).toBeNull();
    expect(result.data?.[0].franchise_type).toBe('additional');
  });

  it('flags rows that share the same position as tied', async () => {
    setResponses({
      official_team_standings: {
        data: [
          standing({ id: 'standing-1', team_id: 'team-1', position: 1 }),
          standing({ id: 'standing-2', team_id: 'team-2', position: 2 }),
          standing({ id: 'standing-3', team_id: 'team-3', position: 2 }),
        ],
        error: null,
      },
      teams: {
        data: [
          { id: 'team-1', name: 'Markhor Warriors', sponsor_name: null, franchise_type: 'official' },
          { id: 'team-2', name: 'Viper Combat GP', sponsor_name: null, franchise_type: 'official' },
          { id: 'team-3', name: 'Nocturnal Bats', sponsor_name: null, franchise_type: 'official' },
        ],
        error: null,
      },
    });

    const result = await getOfficialTeamStandings(TOURNAMENT_ID);

    expect(result.data?.map((s) => s.tied)).toEqual([false, true, true]);
    expect(result.data?.map((s) => s.position)).toEqual([1, 2, 2]);
  });

  it('coerces numeric strings coming back from PostgREST', async () => {
    setResponses({
      official_team_standings: {
        data: [
          standing({
            position: '2',
            combined_gross: '322',
            combined_net: '281',
            accumulated_score: '603',
          }),
        ],
        error: null,
      },
      teams: {
        data: [{ id: 'team-1', name: 'Viper Combat GP', sponsor_name: 'Marine Group', franchise_type: 'official' }],
        error: null,
      },
    });

    const result = await getOfficialTeamStandings(TOURNAMENT_ID);

    expect(result.data?.[0].position).toBe(2);
    expect(result.data?.[0].combined_gross).toBe(322);
    expect(result.data?.[0].combined_net).toBe(281);
    expect(result.data?.[0].accumulated_score).toBe(603);
  });

  it('surfaces the error message from the standings query', async () => {
    setResponses({
      official_team_standings: { data: null, error: { message: 'permission denied' } },
    });

    const result = await getOfficialTeamStandings(TOURNAMENT_ID);

    expect(result.data).toBeNull();
    expect(result.error).toBe('permission denied');
  });

  it('surfaces the error message from the team lookup', async () => {
    setResponses({
      official_team_standings: { data: [standing()], error: null },
      teams: { data: null, error: { message: 'teams blocked by RLS' } },
    });

    const result = await getOfficialTeamStandings(TOURNAMENT_ID);

    expect(result.data).toBeNull();
    expect(result.error).toBe('teams blocked by RLS');
  });
});

describe('officialLeague — notable round performances', () => {
  beforeEach(() => {
    setResponses({});
  });

  it('returns an empty list when no official rows exist', async () => {
    setResponses({ notable_round_performances: { data: [], error: null } });

    const result = await getNotableRoundPerformances(TOURNAMENT_ID);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('maps player and team names', async () => {
    setResponses({
      notable_round_performances: { data: [performance()], error: null },
      players: {
        data: [{ id: 'player-1', full_name: 'Hamza Ghani', player_code: 'TMGL-2021-001', handicap_index: 3 }],
        error: null,
      },
      teams: {
        data: [{ id: 'team-1', name: 'Markhor Warriors', sponsor_name: 'Markhors Logistics', franchise_type: 'official' }],
        error: null,
      },
    });

    const result = await getNotableRoundPerformances(TOURNAMENT_ID);

    expect(result.error).toBeNull();
    expect(result.data?.[0]).toMatchObject({
      player_name: 'Hamza Ghani',
      player_code: 'TMGL-2021-001',
      team_name: 'Markhor Warriors',
      team_sponsor_name: 'Markhors Logistics',
      gross_score: 68,
      net_score: 65,
      handicap_index: 3,
    });
  });

  it('keeps null net scores, handicaps and notes as null', async () => {
    setResponses({
      notable_round_performances: {
        data: [
          performance({
            id: 'performance-2',
            team_id: null,
            gross_score: 72,
            handicap_index: null,
            net_score: null,
            note: null,
          }),
        ],
        error: null,
      },
      players: {
        data: [{ id: 'player-1', full_name: 'Yashal Shah', player_code: null, handicap_index: null }],
        error: null,
      },
      teams: { data: [], error: null },
    });

    const result = await getNotableRoundPerformances(TOURNAMENT_ID);

    expect(result.data?.[0]).toMatchObject({
      player_name: 'Yashal Shah',
      team_name: null,
      team_sponsor_name: null,
      gross_score: 72,
      net_score: null,
      handicap_index: null,
      note: null,
    });
  });

  it('orders by gross then net, pushing missing net scores last', async () => {
    setResponses({
      notable_round_performances: {
        data: [
          performance({ id: 'p-high', player_id: 'player-3', gross_score: 83, net_score: null }),
          performance({ id: 'p-net', player_id: 'player-2', gross_score: 80, net_score: 64 }),
          performance({ id: 'p-low', player_id: 'player-1', gross_score: 68, net_score: 65 }),
        ],
        error: null,
      },
      players: {
        data: [
          { id: 'player-1', full_name: 'Hamza Ghani', player_code: null, handicap_index: 3 },
          { id: 'player-2', full_name: 'Lt Cdr Naeem Mirza', player_code: null, handicap_index: 16 },
          { id: 'player-3', full_name: 'Hassan Hashmi', player_code: null, handicap_index: null },
        ],
        error: null,
      },
      teams: { data: [], error: null },
    });

    const result = await getNotableRoundPerformances(TOURNAMENT_ID);

    expect(result.data?.map((p) => p.player_name)).toEqual([
      'Hamza Ghani',
      'Lt Cdr Naeem Mirza',
      'Hassan Hashmi',
    ]);
  });

  it('breaks equal gross and net scores alphabetically by player name', async () => {
    setResponses({
      notable_round_performances: {
        data: [
          performance({ id: 'p-b', player_id: 'player-2', gross_score: 80, net_score: 64 }),
          performance({ id: 'p-a', player_id: 'player-1', gross_score: 80, net_score: 64 }),
        ],
        error: null,
      },
      players: {
        data: [
          { id: 'player-1', full_name: 'Ather Abbas', player_code: null, handicap_index: null },
          { id: 'player-2', full_name: 'Yashal Shah', player_code: null, handicap_index: null },
        ],
        error: null,
      },
      teams: { data: [], error: null },
    });

    const result = await getNotableRoundPerformances(TOURNAMENT_ID);

    expect(result.data?.map((p) => p.player_name)).toEqual(['Ather Abbas', 'Yashal Shah']);
  });

  it('falls back to a placeholder when the player row is not visible', async () => {
    setResponses({
      notable_round_performances: { data: [performance()], error: null },
      players: { data: [], error: null },
      teams: { data: [], error: null },
    });

    const result = await getNotableRoundPerformances(TOURNAMENT_ID);

    expect(result.data?.[0].player_name).toBe('Unknown player');
    expect(result.data?.[0].player_code).toBeNull();
    expect(result.data?.[0].profile_handicap_index).toBeNull();
  });

  it('surfaces the error message from the performance query', async () => {
    setResponses({
      notable_round_performances: { data: null, error: { message: 'standings unavailable' } },
    });

    const result = await getNotableRoundPerformances(TOURNAMENT_ID);

    expect(result.data).toBeNull();
    expect(result.error).toBe('standings unavailable');
  });

  it('surfaces the error message from the player lookup', async () => {
    setResponses({
      notable_round_performances: { data: [performance()], error: null },
      players: { data: null, error: { message: 'players blocked by RLS' } },
      teams: { data: [], error: null },
    });

    const result = await getNotableRoundPerformances(TOURNAMENT_ID);

    expect(result.data).toBeNull();
    expect(result.error).toBe('players blocked by RLS');
  });
});

describe('officialLeague — league partners', () => {
  beforeEach(() => {
    setResponses({});
  });

  it('returns partners in the order supplied', async () => {
    setResponses({
      league_partners: {
        data: [
          { id: 'p-1', name: 'Dawn News', category: 'media', source_url: 'https://example.com', sort_order: 1, created_at: '2021-01-01T00:00:00.000Z' },
          { id: 'p-2', name: 'Braun', category: 'sponsor', source_url: 'https://example.com', sort_order: 2, created_at: '2021-01-01T00:00:00.000Z' },
        ],
        error: null,
      },
    });

    const result = await getLeaguePartners();

    expect(result.error).toBeNull();
    expect(result.data?.map((p) => p.name)).toEqual(['Dawn News', 'Braun']);
  });

  it('drops entries without a name and defaults missing sort order', async () => {
    setResponses({
      league_partners: {
        data: [
          { id: 'p-1', name: '', category: 'sponsor', source_url: 'https://example.com', sort_order: 5, created_at: '2021-01-01T00:00:00.000Z' },
          { id: 'p-2', name: 'Bank Alfalah', category: 'sponsor', source_url: 'https://example.com', sort_order: null, created_at: '2021-01-01T00:00:00.000Z' },
        ],
        error: null,
      },
    });

    const result = await getLeaguePartners();

    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].name).toBe('Bank Alfalah');
    expect(result.data?.[0].sort_order).toBe(0);
  });

  it('returns an empty list when there are no partners', async () => {
    setResponses({ league_partners: { data: null, error: null } });

    const result = await getLeaguePartners();

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('surfaces the error message from the partners query', async () => {
    setResponses({ league_partners: { data: null, error: { message: 'partners unavailable' } } });

    const result = await getLeaguePartners('sponsor');

    expect(result.data).toBeNull();
    expect(result.error).toBe('partners unavailable');
  });
});

describe('officialLeague — combined overview', () => {
  beforeEach(() => {
    setResponses({});
  });

  it('reports hasOfficialData false when no official rows exist', async () => {
    setResponses({
      official_team_standings: { data: [], error: null },
      notable_round_performances: { data: [], error: null },
      league_partners: { data: [], error: null },
    });

    const result = await getOfficialLeagueOverview(TOURNAMENT_ID);

    expect(result.error).toBeNull();
    expect(result.data?.hasOfficialData).toBe(false);
    expect(result.data?.standings).toEqual([]);
    expect(result.data?.performances).toEqual([]);
    expect(result.data?.partners).toEqual([]);
  });

  it('reports hasOfficialData true when only standout rounds exist', async () => {
    setResponses({
      official_team_standings: { data: [], error: null },
      notable_round_performances: { data: [performance()], error: null },
      players: {
        data: [{ id: 'player-1', full_name: 'Hamza Ghani', player_code: 'TMGL-2021-001', handicap_index: 3 }],
        error: null,
      },
      teams: { data: [], error: null },
      league_partners: { data: [], error: null },
    });

    const result = await getOfficialLeagueOverview(TOURNAMENT_ID);

    expect(result.data?.hasOfficialData).toBe(true);
    expect(result.data?.standings).toHaveLength(0);
    expect(result.data?.performances).toHaveLength(1);
  });

  it('reports hasOfficialData true when only standings exist', async () => {
    setResponses({
      official_team_standings: { data: [standing()], error: null },
      teams: {
        data: [{ id: 'team-1', name: 'Markhor Warriors', sponsor_name: 'Markhors Logistics', franchise_type: 'official' }],
        error: null,
      },
      notable_round_performances: { data: [], error: null },
      league_partners: { data: [], error: null },
    });

    const result = await getOfficialLeagueOverview(TOURNAMENT_ID);

    expect(result.data?.hasOfficialData).toBe(true);
    expect(result.data?.standings).toHaveLength(1);
    expect(result.data?.performances).toHaveLength(0);
  });

  it('propagates the first failing sub-query error', async () => {
    setResponses({
      official_team_standings: { data: null, error: { message: 'standings unavailable' } },
      notable_round_performances: { data: [], error: null },
      league_partners: { data: [], error: null },
    });

    const result = await getOfficialLeagueOverview(TOURNAMENT_ID);

    expect(result.data).toBeNull();
    expect(result.error).toBe('standings unavailable');
  });
});

describe('officialLeague — query shape', () => {
  beforeEach(() => {
    setResponses({});
    for (const key of Object.keys(selectArgs)) delete selectArgs[key];
    fromMock.mockClear();
  });

  it('resolves team details with a separate flat query', async () => {
    setResponses({
      official_team_standings: { data: [standing()], error: null },
      teams: { data: [], error: null },
    });

    await getOfficialTeamStandings(TOURNAMENT_ID);

    expect(fromMock.mock.calls.map((call) => call[0])).toEqual(['official_team_standings', 'teams']);
  });

  it('selects plain columns instead of nested PostgREST embeds', async () => {
    setResponses({
      official_team_standings: { data: [standing()], error: null },
      teams: { data: [], error: null },
    });

    await getOfficialTeamStandings(TOURNAMENT_ID);

    const allSelects = Object.values(selectArgs).flat();
    expect(allSelects.length).toBeGreaterThan(0);
    for (const columns of allSelects) {
      expect(columns).not.toContain('(');
      expect(columns).not.toContain('*');
    }
  });

  it('resolves player and team details for performances in flat queries', async () => {
    setResponses({
      notable_round_performances: { data: [performance()], error: null },
      players: { data: [], error: null },
      teams: { data: [], error: null },
    });

    await getNotableRoundPerformances(TOURNAMENT_ID);

    expect(fromMock.mock.calls.map((call) => call[0])).toEqual(
      expect.arrayContaining(['notable_round_performances', 'players', 'teams'])
    );
    const allSelects = Object.values(selectArgs).flat();
    for (const columns of allSelects) {
      expect(columns).not.toContain('(');
    }
  });

  it('skips the related lookup queries when there are no official rows', async () => {
    setResponses({
      official_team_standings: { data: [], error: null },
      notable_round_performances: { data: [], error: null },
      league_partners: { data: [], error: null },
    });

    await getOfficialLeagueOverview(TOURNAMENT_ID);

    expect(fromMock.mock.calls.map((call) => call[0])).toEqual([
      'official_team_standings',
      'notable_round_performances',
      'league_partners',
    ]);
  });
});
