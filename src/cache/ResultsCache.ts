import { resultCacheKey, type GeekbenchGeneration } from '../geekbench/generation';
import { mergeProcessorLinks, type CanonicalProcessorLinks } from '../geekbench/processorLinks';
import type { ResultMetadata } from '../geekbench/resultPayload';

const DB_NAME = 'GeekLensCache';
// Keep the original store name so the version-1 instruction-only rows survive.
const STORE_NAME = 'instructionSets';
const DB_VERSION = 2;

export interface StoredResultRecord {
  resultId: string;
  // Version-1 rows contain only these three fields.
  instructionSet?: string;
  timestamp: number;
  metadata?: ResultMetadata;
  processorLinks?: CanonicalProcessorLinks;
}

export interface CachedResultContext {
  instructionSet: string | null;
  metadata: ResultMetadata | null;
  processorLinks: CanonicalProcessorLinks;
  timestamp: number;
}

export interface ResultContextUpdate {
  instructionSet?: string | null;
  metadata?: ResultMetadata | null;
  processorLinks?: CanonicalProcessorLinks;
}

export function normalizeStoredResultRecord(record: StoredResultRecord): CachedResultContext {
  return {
    instructionSet: record.instructionSet || record.metadata?.instructionSets?.value || null,
    metadata: record.metadata ?? null,
    processorLinks: mergeProcessorLinks(null, record.processorLinks),
    timestamp: record.timestamp,
  };
}

export function mergeStoredResultRecord(
  cacheKey: string,
  existing: StoredResultRecord | undefined,
  update: ResultContextUpdate,
  timestamp = Date.now(),
): StoredResultRecord {
  const metadata =
    update.metadata === undefined ? existing?.metadata : (update.metadata ?? undefined);
  const instructionSet =
    update.instructionSet === undefined
      ? (existing?.instructionSet ?? metadata?.instructionSets?.value)
      : (update.instructionSet ?? undefined);

  return {
    resultId: cacheKey,
    instructionSet,
    metadata,
    processorLinks: mergeProcessorLinks(existing?.processorLinks, update.processorLinks),
    timestamp,
  };
}

export class ResultsCache {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private database(): Promise<IDBDatabase> {
    this.dbPromise ??= this.initDB();
    return this.dbPromise;
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('GeekLens: Error opening IndexedDB', event);
        reject(new Error('Failed to open database'));
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'resultId' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        // Version 2 adds optional fields to each record. IndexedDB stores are
        // schemaless, so retaining the store is the complete safe migration:
        // legacy instructionSet rows remain readable and are enriched on use.
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
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
      const db = await this.database();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const cacheKey = resultCacheKey(generation, resultId);

      await new Promise<void>((resolve, reject) => {
        const getRequest = store.get(cacheKey);
        getRequest.onerror = (event) => {
          console.error('GeekLens: Error reading result before cache update', event);
          reject(new Error('Failed to read cached result'));
        };
        getRequest.onsuccess = () => {
          const existing = getRequest.result as StoredResultRecord | undefined;
          const putRequest = store.put(mergeStoredResultRecord(cacheKey, existing, update));
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = (event) => {
            console.error('GeekLens: Error storing result context', event);
            reject(new Error('Failed to store result context'));
          };
        };
      });
    } catch (error) {
      console.error('GeekLens: DB error storing result context', error);
      throw error;
    }
  }

  async getResultContext(
    generation: GeekbenchGeneration,
    resultId: string,
  ): Promise<CachedResultContext | null> {
    try {
      const db = await this.database();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      return await new Promise((resolve, reject) => {
        const request = store.get(resultCacheKey(generation, resultId));
        request.onsuccess = () => {
          const record = request.result as StoredResultRecord | undefined;
          resolve(record ? normalizeStoredResultRecord(record) : null);
        };
        request.onerror = (event) => {
          console.error('GeekLens: Error retrieving result context', event);
          reject(new Error('Failed to retrieve result context'));
        };
      });
    } catch (error) {
      console.error('GeekLens: DB error retrieving result context', error);
      return null;
    }
  }

  // Compatibility helpers for Geekbench 6 and existing callers.
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
