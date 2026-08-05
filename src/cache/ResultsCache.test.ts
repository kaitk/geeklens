import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { IDBFactory } from 'fake-indexeddb';
import { extractResultMetadata } from '../geekbench/resultPayload';
import {
  mergeStoredResultRecord,
  normalizeStoredResultRecord,
  ResultsCache,
  transactionDone,
  type StoredResultRecord,
} from './ResultsCache';

let databaseSequence = 0;
const originalDateNow = Date.now;
const originalIndexedDB = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');

function databaseName(): string {
  databaseSequence += 1;
  return `GeekLensCacheTest-${databaseSequence}`;
}

function openDatabase(name: string, version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function resultRecords(name: string): Promise<StoredResultRecord[]> {
  const db = await openDatabase(name);
  const transaction = db.transaction('results', 'readonly');
  const request = transaction.objectStore('results').getAll();
  const records = await new Promise<StoredResultRecord[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as StoredResultRecord[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return records;
}

async function waitForRecords(
  name: string,
  predicate: (records: StoredResultRecord[]) => boolean,
): Promise<StoredResultRecord[]> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const records = await resultRecords(name);
    if (predicate(records)) return records;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('Timed out waiting for IndexedDB cache maintenance');
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: new IDBFactory(),
  });
});

afterEach(() => {
  Date.now = originalDateNow;
  if (originalIndexedDB) {
    Object.defineProperty(globalThis, 'indexedDB', originalIndexedDB);
  } else {
    Reflect.deleteProperty(globalThis, 'indexedDB');
  }
});

describe('ResultsCache records', () => {
  test('uses result-oriented names and normalizes optional values', () => {
    const stored = mergeStoredResultRecord('v7:cpu:123', undefined, {}, 100);

    expect(stored.cacheKey).toBe('v7:cpu:123');
    expect(stored.lastAccessedAt).toBe(100);
    expect(normalizeStoredResultRecord(stored)).toEqual({
      instructionSet: null,
      metadata: null,
      processorLinks: { processorPath: null, macPath: null },
      lastAccessedAt: 100,
    });
  });

  test('preserves cached fields while updating its recency', () => {
    const existing = mergeStoredResultRecord(
      'v7:cpu:123',
      undefined,
      { instructionSet: 'sse2 avx2' },
      100,
    );

    const updated = mergeStoredResultRecord(
      existing.cacheKey,
      existing,
      { processorLinks: { processorPath: '/processors/example-cpu', macPath: null } },
      200,
    );

    expect(updated).toMatchObject({
      cacheKey: existing.cacheKey,
      instructionSet: 'sse2 avx2',
      processorLinks: { processorPath: '/processors/example-cpu', macPath: null },
      lastAccessedAt: 200,
    });
  });

  test('derives the compatibility instruction string from cached metadata', () => {
    const metadata = extractResultMetadata(
      {
        document_version: 7,
        metrics: [{ id: 20000, value: 'neon sme2' }],
      },
      7,
    );
    expect(metadata).not.toBeNull();
    if (!metadata) throw new Error('Expected valid fixture metadata');

    const stored = mergeStoredResultRecord('v7:cpu:456', undefined, { metadata }, 300);

    expect(stored.instructionSet).toBe('neon sme2');
    expect(normalizeStoredResultRecord(stored).metadata).toEqual(metadata);
  });

  test('new explicit links override stale links without erasing undiscovered kinds', () => {
    const existing = mergeStoredResultRecord(
      'v7:cpu:789',
      undefined,
      {
        processorLinks: {
          processorPath: '/processors/old-cpu',
          macPath: '/macs/known-mac',
        },
      },
      100,
    );

    const stored = mergeStoredResultRecord(
      existing.cacheKey,
      existing,
      {
        processorLinks: {
          processorPath: '/processors/canonical-cpu',
          macPath: null,
        },
      },
      200,
    );

    expect(stored.processorLinks).toEqual({
      processorPath: '/processors/canonical-cpu',
      macPath: '/macs/known-mac',
    });
  });
});

describe('ResultsCache IndexedDB behavior', () => {
  test('preserves the request error reported when a transaction aborts', async () => {
    const name = databaseName();
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('items', { keyPath: 'id' });
      store.createIndex('uniqueValue', 'value', { unique: true });
    };
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('items', 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore('items');
    store.put({ id: 1, value: 'duplicate' });
    store.put({ id: 2, value: 'duplicate' });

    await expect(done).rejects.toMatchObject({ name: 'ConstraintError' });
    db.close();
  });

  test('replaces the legacy store during the version-3 upgrade', async () => {
    const name = databaseName();
    const legacyRequest = indexedDB.open(name, 2);
    legacyRequest.onupgradeneeded = () => {
      const store = legacyRequest.result.createObjectStore('instructionSets', {
        keyPath: 'resultId',
      });
      store.put({ resultId: 'v7:cpu:old', instructionSet: 'sse2', timestamp: 1 });
    };
    const legacyDb = await new Promise<IDBDatabase>((resolve, reject) => {
      legacyRequest.onsuccess = () => resolve(legacyRequest.result);
      legacyRequest.onerror = () => reject(legacyRequest.error);
    });
    legacyDb.close();

    const cache = new ResultsCache({ databaseName: name });
    await cache.storeResultContext(7, 'new', { instructionSet: 'neon' });

    const db = await openDatabase(name);
    expect(Array.from(db.objectStoreNames)).toEqual(['results']);
    db.close();
    expect((await resultRecords(name)).map((record) => record.cacheKey)).toEqual(['v7:cpu:new']);
  });

  test('touches hits and evicts least-recently-used results to the low-water mark', async () => {
    const name = databaseName();
    const cache = new ResultsCache({
      databaseName: name,
      highWaterEntries: 3,
      lowWaterEntries: 2,
    });
    let now = 100;
    Date.now = () => now++;

    await cache.storeResultContext(7, 'a', { instructionSet: 'a' });
    await cache.storeResultContext(7, 'b', { instructionSet: 'b' });
    await cache.storeResultContext(7, 'c', { instructionSet: 'c' });
    expect((await cache.getResultContext(7, 'a'))?.instructionSet).toBe('a');
    await waitForRecords(name, (records) => records.some((record) => record.lastAccessedAt >= 103));

    await cache.storeResultContext(7, 'd', { instructionSet: 'd' });
    const remaining = await waitForRecords(name, (records) => records.length === 2);

    expect(remaining.map((record) => record.cacheKey).toSorted()).toEqual(['v7:cpu:a', 'v7:cpu:d']);
  });

  test('returns a cache hit even when its best-effort recency touch fails', async () => {
    const name = databaseName();
    const cache = new ResultsCache({ databaseName: name });
    await cache.storeResultContext(7, '123', { instructionSet: 'avx2' });
    const internals = cache as unknown as { touchResult: () => Promise<void> };
    internals.touchResult = async () => {
      throw new Error('touch failed');
    };
    const error = spyOn(console, 'error').mockImplementation(() => {});

    expect((await cache.getResultContext(7, '123'))?.instructionSet).toBe('avx2');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  test('drops a version-changed handle so a deleted cache can reopen', async () => {
    const name = databaseName();
    const cache = new ResultsCache({ databaseName: name });
    await cache.storeResultContext(7, 'before', { instructionSet: 'sse2' });
    await waitForRecords(name, (records) => records.length === 1);

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    await cache.storeResultContext(7, 'after', { instructionSet: 'neon' });

    expect((await resultRecords(name)).map((record) => record.cacheKey)).toEqual(['v7:cpu:after']);
  });

  test('rejects a blocked legacy upgrade instead of hanging page work', async () => {
    const name = databaseName();
    const legacyRequest = indexedDB.open(name, 2);
    legacyRequest.onupgradeneeded = () => {
      legacyRequest.result.createObjectStore('instructionSets', { keyPath: 'resultId' });
    };
    const legacyDb = await new Promise<IDBDatabase>((resolve, reject) => {
      legacyRequest.onsuccess = () => resolve(legacyRequest.result);
      legacyRequest.onerror = () => reject(legacyRequest.error);
    });
    const error = spyOn(console, 'error').mockImplementation(() => {});
    const cache = new ResultsCache({ databaseName: name });

    expect(await cache.getResultContext(7, '123')).toBeNull();
    expect(error).toHaveBeenCalledWith(
      'GeekLens: IndexedDB upgrade blocked by another tab',
      expect.anything(),
    );

    legacyDb.close();
    await cache.storeResultContext(7, 'after', { instructionSet: 'neon' });
    expect((await cache.getResultContext(7, 'after'))?.instructionSet).toBe('neon');
    error.mockRestore();
  });

  test('evicts and retries a quota-limited write without rejecting page rendering', async () => {
    const cache = new ResultsCache({ databaseName: databaseName() });
    const internals = cache as unknown as {
      putResultContext: () => Promise<void>;
      evictForQuota: () => Promise<void>;
    };
    let attempts = 0;
    let evictions = 0;
    internals.putResultContext = async () => {
      attempts += 1;
      if (attempts === 1) throw new DOMException('full', 'QuotaExceededError');
    };
    internals.evictForQuota = async () => {
      evictions += 1;
    };

    await expect(cache.storeResultContext(7, '123', { instructionSet: 'avx2' })).resolves.toBe(
      undefined,
    );
    expect({ attempts, evictions }).toEqual({ attempts: 2, evictions: 1 });
  });
});
