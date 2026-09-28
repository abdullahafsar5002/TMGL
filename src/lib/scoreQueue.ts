import { getErrorMessage } from '@/lib/errors';

export type ScoreQueueStatus = 'queued' | 'syncing' | 'synced' | 'error';

export interface QueuedScoreHole {
  scorecard_id: string;
  hole_number: number;
  par: number;
  strokes: number;
  score_to_par: number;
}

export interface ScoreQueueOperation {
  id: string;
  dedupeKey: string;
  scorecardId: string;
  ownerId: string;
  holes: QueuedScoreHole[];
  status: 'in_progress' | 'submitted';
  totalStrokes: number;
  totalScoreToPar: number;
  state: ScoreQueueStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
}

export interface NewScoreQueueOperation {
  scorecardId: string;
  ownerId: string;
  holes: QueuedScoreHole[];
  status: 'in_progress' | 'submitted';
  totalStrokes: number;
  totalScoreToPar: number;
}

export interface ScoreQueueSyncSummary {
  synced: number;
  failed: number;
  pending: number;
}

const DATABASE_NAME = 'tmgl-score-queue';
const STORE_NAME = 'score-operations';
const DATABASE_VERSION = 1;

function requireIndexedDb(): IDBFactory {
  if (typeof indexedDB === 'undefined') throw new Error('Offline score storage is not available in this browser.');
  return indexedDB;
}

function openDatabase(): Promise<IDBDatabase> {
  const factory = requireIndexedDb();
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('scorecardId', 'scorecardId', { unique: false });
        store.createIndex('state', 'state', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open offline score storage.'));
  });
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, sortValue(entry)]));
  }
  return value;
}

export function serializeScoreOperation(operation: ScoreQueueOperation): string {
  return JSON.stringify(sortValue(operation));
}

export function deserializeScoreOperation(value: string): ScoreQueueOperation {
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Invalid queued score operation.');
  const record = parsed as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.scorecardId !== 'string' || !Array.isArray(record.holes)) {
    throw new Error('Invalid queued score operation.');
  }
  return record as unknown as ScoreQueueOperation;
}

export function getScoreDedupeKey(operation: Pick<NewScoreQueueOperation, 'scorecardId' | 'holes' | 'status'>): string {
  const holes = [...operation.holes]
    .sort((a, b) => a.hole_number - b.hole_number)
    .map(hole => `${hole.hole_number}:${hole.par}:${hole.strokes}`);
  return `${operation.scorecardId}:${operation.status}:${holes.join('|')}`;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `score-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneOperation(operation: ScoreQueueOperation): ScoreQueueOperation {
  return {
    ...operation,
    holes: operation.holes.map(hole => ({ ...hole })),
  };
}

function readAll(database: IDBDatabase): Promise<ScoreQueueOperation[]> {
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as ScoreQueueOperation[]).map(cloneOperation));
    request.onerror = () => reject(request.error ?? new Error('Unable to read queued scores.'));
  });
}

function put(database: IDBDatabase, operation: ScoreQueueOperation): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(cloneOperation(operation));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save queued score.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Unable to save queued score.'));
  });
}

function remove(database: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to remove queued score.'));
  });
}

export async function enqueueScoreOperation(input: NewScoreQueueOperation): Promise<ScoreQueueOperation> {
  if (!input.scorecardId.trim()) throw new Error('A scorecard ID is required for offline storage.');
  if (!input.ownerId.trim()) throw new Error('An authenticated owner is required for offline storage.');
  const database = await openDatabase();
  const existing = (await readAll(database)).filter(operation => operation.ownerId === input.ownerId);
  const dedupeKey = getScoreDedupeKey(input);
  const same = existing.find(operation => operation.dedupeKey === dedupeKey && operation.state !== 'synced');
  if (same) {
    if (same.state === 'error') {
      const requeued: ScoreQueueOperation = { ...same, state: 'queued', lastError: null, updatedAt: new Date().toISOString() };
      await put(database, requeued);
      database.close();
      return requeued;
    }
    database.close();
    return same;
  }
  const prior = existing.find(operation => operation.scorecardId === input.scorecardId && operation.state !== 'synced');
  const now = new Date().toISOString();
  const operation: ScoreQueueOperation = {
    id: createId(),
    dedupeKey,
    scorecardId: input.scorecardId,
    ownerId: input.ownerId,
    holes: input.holes.map(hole => ({ ...hole })),
    status: input.status,
    totalStrokes: input.totalStrokes,
    totalScoreToPar: input.totalScoreToPar,
    state: 'queued',
    attempts: 0,
    createdAt: prior?.createdAt ?? now,
    updatedAt: now,
    lastError: null,
  };
  if (prior) await remove(database, prior.id);
  await put(database, operation);
  database.close();
  return operation;
}

export async function getScoreQueueOperations(ownerId?: string): Promise<ScoreQueueOperation[]> {
  const database = await openDatabase();
  const operations = (await readAll(database)).filter(operation => !ownerId || operation.ownerId === ownerId);
  database.close();
  return operations.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeScoreOperation(id: string): Promise<void> {
  const database = await openDatabase();
  await remove(database, id);
  database.close();
}

export async function removeScoreOperationsForScorecard(scorecardId: string, ownerId: string): Promise<void> {
  const database = await openDatabase();
  const operations = await readAll(database);
  for (const operation of operations.filter((entry) => entry.scorecardId === scorecardId && entry.ownerId === ownerId)) {
    await remove(database, operation.id);
  }
  database.close();
}

export async function updateScoreOperation(
  id: string,
  changes: Partial<Pick<ScoreQueueOperation, 'state' | 'attempts' | 'lastError'>>
): Promise<ScoreQueueOperation | null> {
  const database = await openDatabase();
  const operations = await readAll(database);
  const current = operations.find(operation => operation.id === id);
  if (!current) {
    database.close();
    return null;
  }
  const updated: ScoreQueueOperation = {
    ...current,
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  await put(database, updated);
  database.close();
  return updated;
}

export async function syncScoreQueue(
  syncOperation: (operation: ScoreQueueOperation) => Promise<void>,
  ownerId?: string
): Promise<ScoreQueueSyncSummary> {
  const operations = (await getScoreQueueOperations(ownerId)).filter(operation => operation.state !== 'synced');
  let synced = 0;
  let failed = 0;
  for (const operation of operations) {
    await updateScoreOperation(operation.id, { state: 'syncing', attempts: operation.attempts + 1, lastError: null });
    try {
      await syncOperation(cloneOperation(operation));
      await removeScoreOperation(operation.id);
      synced++;
    } catch (error) {
      await updateScoreOperation(operation.id, { state: 'error', lastError: getErrorMessage(error, 'Score sync failed.') });
      failed++;
    }
  }
  const pending = operations.length - synced - failed;
  return { synced, failed, pending };
}
