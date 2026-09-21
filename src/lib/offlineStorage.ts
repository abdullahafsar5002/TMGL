/**
 * Offline Scoring Storage
 *
 * Uses IndexedDB to persist draft scorecards when offline.
 * Syncs to Supabase when connectivity is restored.
 */

const DB_NAME = 'tmgl-offline';
const DB_VERSION = 1;
const DRAFT_STORE = 'drafts';
const SYNC_QUEUE_STORE = 'sync-queue';

interface DraftHole {
  holeNumber: number;
  par: number;
  strokes: number;
}

interface DraftScorecard {
  id: string;
  entityId: string;
  entityType: 'scorecard' | 'practice_round';
  holes: DraftHole[];
  totalStrokes: number;
  totalToPar: number;
  status: 'draft' | 'in_progress';
  createdAt: string;
  updatedAt: string;
}

interface SyncQueueItem {
  id: string;
  action: 'upsert_scorecard_holes' | 'update_scorecard';
  payload: unknown;
  createdAt: string;
  retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
      }
    };
  });
}

// Draft scorecard operations
export async function saveDraft(draft: DraftScorecard): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, 'readwrite');
    const store = tx.objectStore(DRAFT_STORE);
    store.put({ ...draft, updatedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDraft(id: string): Promise<DraftScorecard | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, 'readonly');
    const store = tx.objectStore(DRAFT_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllDrafts(): Promise<DraftScorecard[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, 'readonly');
    const store = tx.objectStore(DRAFT_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, 'readwrite');
    const store = tx.objectStore(DRAFT_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Sync queue operations
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries'>): Promise<void> {
  const db = await openDB();
  const queueItem: SyncQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    store.add(queueItem);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly');
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearSyncQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export type { DraftScorecard, DraftHole, SyncQueueItem };
