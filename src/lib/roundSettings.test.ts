import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, chainRef } = vi.hoisted(() => {
  const chainRef: { payload: Record<string, unknown> | null } = { payload: null };
  const fromMock = vi.fn();
  return { fromMock, chainRef };
});

vi.mock('@/lib/supabase', () => ({ supabase: { from: fromMock } }));

import { setScorecardDnf, updateRound } from './competition';

function stubChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    update: vi.fn((payload: Record<string, unknown>) => {
      chainRef.payload = payload;
      return chain;
    }),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
  };
  fromMock.mockReturnValue(chain);
  return chain;
}

const ok = { data: { id: 'r1', name: 'Round 1' }, error: null };

describe('updateRound competition settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainRef.payload = null;
  });

  it('writes the cut line, tee settings and format', async () => {
    stubChain(ok);
    const result = await updateRound('r1', {
      name: 'Round 1',
      scoring_format: 'match_play',
      cut_after_hole: 9,
      cut_line_score: 45,
      tee_interval_minutes: 10,
      first_tee_time: '08:30'
    });
    expect(result.error).toBeNull();
    expect(chainRef.payload).toMatchObject({
      scoring_format: 'match_play',
      cut_after_hole: 9,
      cut_line_score: 45,
      tee_interval_minutes: 10,
      first_tee_time: '08:30'
    });
  });

  it('clears the cut when the hole and score are both null', async () => {
    stubChain(ok);
    await updateRound('r1', { cut_after_hole: null, cut_line_score: null });
    expect(chainRef.payload).toMatchObject({ cut_after_hole: null, cut_line_score: null });
  });

  it('refuses a cut score with no cut hole', async () => {
    stubChain(ok);
    const result = await updateRound('r1', { cut_after_hole: null, cut_line_score: 45 });
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/Choose the hole the cut applies after/);
    expect(chainRef.payload).toBeNull();
  });

  it('refuses a non positive cut score', async () => {
    stubChain(ok);
    const result = await updateRound('r1', { cut_after_hole: 9, cut_line_score: 0 });
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/cumulative stroke total/);
    expect(chainRef.payload).toBeNull();
  });

  it('clears the first tee time when an empty value is sent', async () => {
    stubChain(ok);
    await updateRound('r1', { first_tee_time: '' });
    expect(chainRef.payload).toMatchObject({ first_tee_time: null });
  });

  it('surfaces a database failure instead of reporting success', async () => {
    stubChain({ data: null, error: { message: 'permission denied for table rounds' } });
    const result = await updateRound('r1', { name: 'Round 1' });
    expect(result.data).toBeNull();
    expect(result.error).toBe('permission denied for table rounds');
  });
});

describe('setScorecardDnf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainRef.payload = null;
  });

  it('marks a scorecard withdrawn', async () => {
    stubChain({ data: null, error: null });
    const result = await setScorecardDnf('sc-1', true);
    expect(result.error).toBeNull();
    expect(chainRef.payload).toEqual({ dnf: true });
  });

  it('reinstates a withdrawn scorecard', async () => {
    stubChain({ data: null, error: null });
    await setScorecardDnf('sc-1', false);
    expect(chainRef.payload).toEqual({ dnf: false });
  });

  it('requires a scorecard id', async () => {
    const result = await setScorecardDnf('   ', true);
    expect(result.error).toBe('A scorecard is required.');
  });

  it('surfaces a database failure', async () => {
    stubChain({ data: null, error: { message: 'row level security' } });
    const result = await setScorecardDnf('sc-1', true);
    expect(result.error).toBe('row level security');
  });
});