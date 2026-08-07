import { resultCacheKey, type GeekbenchGeneration } from '../geekbench/generation';
import { mergeProcessorLinks, type CanonicalProcessorLinks } from '../geekbench/processorLinks';
import type { ResultMetadata } from '../geekbench/resultPayload';

const DEFAULT_DB_NAME = 'GeekLensCache';
const RESULTS_STORE_NAME = 'results';
const LAST_ACCESSED_INDEX_NAME = 'lastAccessedAt';
const DB_VERSION = 3;
const MAX_WRITES_BETWEEN_CLEANUPS = 50;

export const CACHE_HIGH_WATER_ENTRIES = 5_000;
export const CACHE_LOW_WATER_ENTRIES = 4_000;

export interface CachedResultValidity {
  level: 'valid' | 'warning' | 'invalid';
  message: string;
  checkedAt: number;
  source: 'validation-widget-v2';
}

export interface StoredResultRecord {
  cacheKey: string;
  instructionSet?: string;
  lastAccessedAt: number;
  metadata?: ResultMetadata;
  processorLinks?: CanonicalProcessorLinks;
  validity?: CachedResultValidity;
}

export interface CachedResultContext {
  instructionSet: string | null;
  metadata: ResultMetadata | null;
  processorLinks: CanonicalProcessorLinks;
  validity?: CachedResultValidity | null;
  lastAccessedAt: number;
}

export interface ResultContextUpdate {
  instructionSet?: string | null;
  metadata?: ResultMetadata | null;
  processorLinks?: CanonicalProcessorLinks;
  validity?: CachedResultValidity | null;
}

export interface ResultsCacheOptions {
  databaseName?: string;
  highWaterEntries?: number;
  lowWaterEntries?: number;
}

export function normalizeStoredResultRecord(record: StoredResultRecord): CachedResultContext {
  return {
    instructionSet: record.instructionSet || record.metadata?.instructionSets?.value || null,
    metadata: record.metadata ?? null,
    processorLinks: mergeProcessorLinks(null, record.processorLinks),
    validity: record.validity ?? null,
    lastAccessedAt: record.lastAccessedAt,
  };
}

export function mergeStoredResultRecord(
  cacheKey: string,
  existing: StoredResultRecord | undefined,
  update: ResultContextUpdate,
  lastAccessedAt = Date.now(),
): StoredResultRecord {
  const metadata =
    update.metadata === undefined ? existing?.metadata : (update.metadata ?? undefined);
  const instructionSet =
    update.instructionSet === undefined
      ? (existing?.instructionSet ?? metadata?.instructionSets?.value)
      : (update.instructionSet ?? undefined);

  return {
    cacheKey,
    instructionSet,
    metadata,
    processorLinks: mergeProcessorLinks(existing?.processorLinks, update.processorLinks),
    validity: update.validity === undefined ? existing?.validity : (update.validity ?? undefined),
    lastAccessedAt,
  };
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function isQuotaExceededError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError';
}

export class ResultsCache {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private readonly databaseName: string;
  private readonly highWaterEntries: number;
  private readonly lowWaterEntries: number;
  private readonly cleanupInterval: number;
  private writesSinceCleanup = 0;

  constructor(options: ResultsCacheOptions = {}) {
    this.databaseName = options.databaseName ?? DEFAULT_DB_NAME;
    this.highWaterEntries = options.highWaterEntries ?? CACHE_HIGH_WATER_ENTRIES;
    this.lowWaterEntries = options.lowWaterEntries ?? CACHE_LOW_WATER_ENTRIES;
    this.cleanupInterval = Math.max(
      1,
      Math.min(MAX_WRITES_BETWEEN_CLEANUPS, this.highWaterEntries - this.lowWaterEntries),
    );
  }

  private database(): Promise<IDBDatabase> {
    this.dbPromise ??= this.initDB();
    return this.dbPromise;
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, DB_VERSION);
      let settled = false;

      request.onblocked = (event) => {
        if (settled) return;
        settled = true;
        this.dbPromise = null;
        console.error('GeekLens: IndexedDB upgrade blocked by another tab', event);
        reject(new Error('IndexedDB upgrade blocked by another tab'));
      };

      request.onerror = (event) => {
        if (settled) return;
        settled = true;
        this.dbPromise = null;
        console.error('GeekLens: Error opening IndexedDB', event);
        reject(request.error ?? new Error('Failed to open database'));
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;

        // Results are a disposable cache, so version 3 intentionally drops the
        // instruction-set-era schema instead of carrying its names forward.
        if ((event as IDBVersionChangeEvent).oldVersion < 3) {
          for (const storeName of Array.from(db.objectStoreNames)) {
            db.deleteObjectStore(storeName);
          }

          const results = db.createObjectStore(RESULTS_STORE_NAME, { keyPath: 'cacheKey' });
          results.createIndex(LAST_ACCESSED_INDEX_NAME, 'lastAccessedAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        if (settled) {
          db.close();
          return;
        }
        settled = true;
        const discardHandle = () => {
          this.dbPromise = null;
        };
        db.onversionchange = () => {
          db.close();
          discardHandle();
        };
        db.onclose = discardHandle;
        resolve(db);
      };
    });
  }

  async storeResultContext(
    generation: GeekbenchGeneration,
    resultId: string,
    update: ResultContextUpdate,
  ): Promise<void> {
    try {
      await this.putResultContext(generation, resultId, update);
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        console.error('GeekLens: DB error storing result context', error);
        return;
      }

      try {
        await this.evictForQuota();
        await this.putResultContext(generation, resultId, update);
      } catch (retryError) {
        console.error('GeekLens: DB quota error storing result context', retryError);
        return;
      }
    }

    this.scheduleCleanup();
  }

  private scheduleCleanup(): void {
    this.writesSinceCleanup += 1;
    if (this.writesSinceCleanup < this.cleanupInterval) return;
    this.writesSinceCleanup = 0;

    // Cleanup is cache maintenance, not part of the page's critical path.
    void this.evictIfNeeded().catch((error) => {
      console.error('GeekLens: DB error cleaning result cache', error);
    });
  }

  private async putResultContext(
    generation: GeekbenchGeneration,
    resultId: string,
    update: ResultContextUpdate,
  ): Promise<void> {
    const db = await this.database();
    const transaction = db.transaction(RESULTS_STORE_NAME, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(RESULTS_STORE_NAME);
    const cacheKey = resultCacheKey(generation, resultId);
    const existingRequest = store.get(cacheKey);

    existingRequest.onsuccess = () => {
      const existing = existingRequest.result as StoredResultRecord | undefined;
      const putRequest = store.put(mergeStoredResultRecord(cacheKey, existing, update));
      putRequest.onerror = (event) => {
        console.error('GeekLens: Error storing result context', event);
      };
    };
    existingRequest.onerror = (event) => {
      console.error('GeekLens: Error reading result before cache update', event);
    };

    await done;
  }

  private async evictIfNeeded(): Promise<void> {
    await this.trimResults((count) =>
      count > this.highWaterEntries ? this.lowWaterEntries : count,
    );
  }

  private async evictForQuota(): Promise<void> {
    await this.trimResults((count) =>
      Math.min(this.lowWaterEntries, Math.max(0, count - Math.max(1, Math.ceil(count / 5)))),
    );
  }

  private async trimResults(targetCount: (count: number) => number): Promise<void> {
    const db = await this.database();
    const transaction = db.transaction(RESULTS_STORE_NAME, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(RESULTS_STORE_NAME);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      let entriesToDelete = countRequest.result - targetCount(countRequest.result);
      if (entriesToDelete <= 0) return;

      const cursorRequest = store.index(LAST_ACCESSED_INDEX_NAME).openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor || entriesToDelete <= 0) return;

        cursor.delete();
        entriesToDelete -= 1;
        cursor.continue();
      };
    };

    await done;
  }

  async getResultContext(
    generation: GeekbenchGeneration,
    resultId: string,
  ): Promise<CachedResultContext | null> {
    const cacheKey = resultCacheKey(generation, resultId);

    try {
      const db = await this.database();
      const transaction = db.transaction(RESULTS_STORE_NAME, 'readonly');
      const request = transaction.objectStore(RESULTS_STORE_NAME).get(cacheKey);
      const record = await new Promise<StoredResultRecord | undefined>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as StoredResultRecord | undefined);
        request.onerror = () =>
          reject(request.error ?? new Error('Failed to retrieve cached result'));
      });
      if (!record) return null;

      void this.touchResult(cacheKey).catch((error) => {
        console.error('GeekLens: DB error updating cached result recency', error);
      });
      return normalizeStoredResultRecord(record);
    } catch (error) {
      console.error('GeekLens: DB error retrieving result context', error);
      return null;
    }
  }

  private async touchResult(cacheKey: string): Promise<void> {
    const db = await this.database();
    const transaction = db.transaction(RESULTS_STORE_NAME, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(RESULTS_STORE_NAME);
    const request = store.get(cacheKey);

    request.onsuccess = () => {
      const record = request.result as StoredResultRecord | undefined;
      if (record) store.put({ ...record, lastAccessedAt: Date.now() });
    };

    await done;
  }

  async storeInstructionSet(
    generation: GeekbenchGeneration,
    resultId: string,
    instructionSet: string,
  ): Promise<void> {
    await this.storeResultContext(generation, resultId, { instructionSet });
  }

  async getInstructionSet(
    generation: GeekbenchGeneration,
    resultId: string,
  ): Promise<string | null> {
    return (await this.getResultContext(generation, resultId))?.instructionSet ?? null;
  }
}

export const resultsCache = new ResultsCache();
