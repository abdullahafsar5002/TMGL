import { describe, expect, it } from 'vitest';
import { deserializeScoreOperation, getScoreDedupeKey, serializeScoreOperation, type ScoreQueueOperation } from './scoreQueue';

const operation: ScoreQueueOperation = {
  id: 'operation-1',
  dedupeKey: 'scorecard-1:submitted:1:4:4',
  scorecardId: 'scorecard-1',
  ownerId: 'profile-1',
  holes: [{ scorecard_id: 'scorecard-1', hole_number: 1, par: 4, strokes: 4, score_to_par: 0 }],
  status: 'submitted',
  totalStrokes: 4,
  totalScoreToPar: 0,
  state: 'queued',
  attempts: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  lastError: null,
};

describe('offline score queue helpers', () => {
  it('round-trips a serialized operation', () => {
    expect(deserializeScoreOperation(serializeScoreOperation(operation))).toEqual(operation);
  });

  it('deduplicates the same scorecard payload regardless of hole order', () => {
    const first = { scorecardId: 'scorecard-1', status: 'submitted' as const, holes: [
      { scorecard_id: 'scorecard-1', hole_number: 1, par: 4, strokes: 4, score_to_par: 0 },
      { scorecard_id: 'scorecard-1', hole_number: 2, par: 3, strokes: 3, score_to_par: 0 },
    ] };
    const second = { ...first, holes: [...first.holes].reverse() };
    expect(getScoreDedupeKey(first)).toBe(getScoreDedupeKey(second));
  });

  it('does not deduplicate different score values', () => {
    const first = { scorecardId: 'scorecard-1', status: 'submitted' as const, holes: [{ scorecard_id: 'scorecard-1', hole_number: 1, par: 4, strokes: 4, score_to_par: 0 }] };
    const second = { ...first, holes: [{ ...first.holes[0], strokes: 5, score_to_par: 1 }] };
    expect(getScoreDedupeKey(first)).not.toBe(getScoreDedupeKey(second));
  });
});
