const DATABASE_NAME = 'GeekLensScoreReferences';
const DATABASE_VERSION = 4;
const REFERENCE_STORE = 'scoreReferences';
const ATTEMPT_STORE = 'sourceAttempts';

export const SCORE_REFERENCE_FRESH_MS = 24 * 60 * 60 * 1000;
export const SCORE_REFERENCE_USABLE_MS = 30 * 24 * 60 * 60 * 1000;
export const SCORE_REFERENCE_SUCCESS_RETRY_MS = 24 * 60 * 60 * 1000;
export const SCORE_REFERENCE_FAILURE_RETRY_MS = 5 * 60 * 1000;

export interface StoredScoreReference {
  cacheKey: string;
  generation: 7;
  catalogueKey: string;
  singleCore: number;
  multiCore: number;
  fetchedAt: number;
  sourceUrl: string;
  minimumUniqueResults?: number;
  parserVersion: number;
}

interface SourceAttempt {
  sourceUrl: string;
  lastAttemptAt: number;
  succeeded: boolean;
}

export type ScoreReferenceAge = 'fresh' | 'obsolete' | 'expired';

export function scoreReferenceCacheKey(generation: 7, catalogueKey: string): string {
  return `v${generation}:${catalogueKey}`;
}

export function scoreReferenceAge(
  reference: StoredScoreReference,
  now = Date.now(),
): ScoreReferenceAge {
  const age = Math.max(0, now - reference.fetchedAt);
  if (age <= SCORE_REFERENCE_FRESH_MS) return 'fresh';
  if (age <= SCORE_REFERENCE_USABLE_MS) return 'obsolete';
  return 'expired';
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Transaction aborted'));
  });
}

export class ScoreReferenceCache {
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly databaseName = DATABASE_NAME) {}

  private database(): Promise<IDBDatabase> {
    this.databasePromise ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, DATABASE_VERSION);
      let settled = false;
      request.onblocked = () => {
        if (settled) return;
        settled = true;
        this.databasePromise = null;
        reject(new Error('Score reference database upgrade blocked'));
      };
      request.onerror = () => {
        if (settled) return;
        settled = true;
        this.databasePromise = null;
        reject(request.error ?? new Error('Score reference database open failed'));
      };
      request.onupgradeneeded = (event) => {
        const database = request.result;
        if (!database.objectStoreNames.contains(REFERENCE_STORE)) {
          database.createObjectStore(REFERENCE_STORE, { keyPath: 'cacheKey' });
        }
        // Attempt records are disposable coordination state. Clear older
        // schemas so their retry policy cannot suppress the first request.
        if (
          (event as IDBVersionChangeEvent).oldVersion < DATABASE_VERSION &&
          database.objectStoreNames.contains(ATTEMPT_STORE)
        ) {
          database.deleteObjectStore(ATTEMPT_STORE);
        }
        if (!database.objectStoreNames.contains(ATTEMPT_STORE)) {
          database.createObjectStore(ATTEMPT_STORE, { keyPath: 'sourceUrl' });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        if (settled) {
          database.close();
          return;
        }
        settled = true;
        database.onversionchange = () => {
          database.close();
          this.databasePromise = null;
        };
        resolve(database);
      };
    });
    return this.databasePromise;
  }

  async get(generation: 7, catalogueKey: string): Promise<StoredScoreReference | null> {
    try {
      const database = await this.database();
      const transaction = database.transaction(REFERENCE_STORE, 'readonly');
      const request = transaction
        .objectStore(REFERENCE_STORE)
        .get(scoreReferenceCacheKey(generation, catalogueKey));
      return await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve((request.result as StoredScoreReference) ?? null);
        request.onerror = () => reject(request.error ?? new Error('Score reference read failed'));
      });
    } catch (error) {
      console.error('GeekLens: Could not read score reference', error);
      return null;
    }
  }

  async claimSourceAttempt(sourceUrl: string, now = Date.now()): Promise<boolean> {
    const database = await this.database();
    const transaction = database.transaction(ATTEMPT_STORE, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(ATTEMPT_STORE);
    const request = store.get(sourceUrl);
    let claimed = false;
    request.onsuccess = () => {
      const attempt = request.result as SourceAttempt | undefined;
      const retryInterval = attempt?.succeeded
        ? SCORE_REFERENCE_SUCCESS_RETRY_MS
        : SCORE_REFERENCE_FAILURE_RETRY_MS;
      if (attempt && now - attempt.lastAttemptAt < retryInterval) return;
      claimed = true;
      store.put({ sourceUrl, lastAttemptAt: now, succeeded: false } satisfies SourceAttempt);
    };
    await done;
    return claimed;
  }

  async markSourceSuccess(sourceUrl: string, now = Date.now()): Promise<void> {
    const database = await this.database();
    const transaction = database.transaction(ATTEMPT_STORE, 'readwrite');
    transaction
      .objectStore(ATTEMPT_STORE)
      .put({ sourceUrl, lastAttemptAt: now, succeeded: true } satisfies SourceAttempt);
    await transactionDone(transaction);
  }

  async storeSnapshot(references: readonly StoredScoreReference[]): Promise<void> {
    if (references.length === 0) return;
    const database = await this.database();
    const transaction = database.transaction(REFERENCE_STORE, 'readwrite');
    const store = transaction.objectStore(REFERENCE_STORE);
    for (const reference of references) store.put(reference);
    await transactionDone(transaction);
  }
}

export const scoreReferenceCache = new ScoreReferenceCache();
