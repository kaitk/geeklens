import { afterEach, describe, expect, test } from 'bun:test';
import { IDBFactory } from 'fake-indexeddb';
import {
  SCORE_REFERENCE_FAILURE_RETRY_MS,
  SCORE_REFERENCE_FRESH_MS,
  SCORE_REFERENCE_USABLE_MS,
  ScoreReferenceCache,
  scoreReferenceAge,
  scoreReferenceCacheKey,
  type StoredScoreReference,
} from './ScoreReferenceCache';

function reference(fetchedAt: number): StoredScoreReference {
  return {
    cacheKey: scoreReferenceCacheKey(7, 'cpu'),
    generation: 7,
    catalogueKey: 'cpu',
    singleCore: 100,
    multiCore: 200,
    fetchedAt,
    sourceUrl: 'https://browser.geekbench.com/processor-benchmarks',
    parserVersion: 1,
  };
}

afterEach(() => {
  delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
});

describe('score reference cache', () => {
  test('classifies fresh, obsolete, and expired atomic values', () => {
    const now = 1_000_000_000;
    expect(scoreReferenceAge(reference(now - SCORE_REFERENCE_FRESH_MS), now)).toBe('fresh');
    expect(scoreReferenceAge(reference(now - SCORE_REFERENCE_FRESH_MS - 1), now)).toBe('obsolete');
    expect(scoreReferenceAge(reference(now - SCORE_REFERENCE_USABLE_MS - 1), now)).toBe('expired');
  });

  test('stores references separately by catalogue key', async () => {
    globalThis.indexedDB = new IDBFactory();
    const cache = new ScoreReferenceCache('score-reference-test');
    await cache.storeSnapshot([
      reference(10),
      { ...reference(10), cacheKey: scoreReferenceCacheKey(7, 'other'), catalogueKey: 'other' },
    ]);
    expect((await cache.get(7, 'cpu'))?.singleCore).toBe(100);
    expect((await cache.get(7, 'other'))?.multiCore).toBe(200);
  });

  test('retries failures after five minutes and successes after 24 hours', async () => {
    globalThis.indexedDB = new IDBFactory();
    const cache = new ScoreReferenceCache('score-attempt-test');
    const source = 'https://browser.geekbench.com/processor-benchmarks';
    expect(await cache.claimSourceAttempt(source, 100)).toBeTrue();
    expect(
      await cache.claimSourceAttempt(source, 100 + SCORE_REFERENCE_FAILURE_RETRY_MS - 1),
    ).toBeFalse();
    expect(
      await cache.claimSourceAttempt(source, 100 + SCORE_REFERENCE_FAILURE_RETRY_MS),
    ).toBeTrue();
    await cache.markSourceSuccess(source, 1_000);
    expect(
      await cache.claimSourceAttempt(source, 1_000 + SCORE_REFERENCE_FRESH_MS - 1),
    ).toBeFalse();
    expect(await cache.claimSourceAttempt(source, 1_000 + SCORE_REFERENCE_FRESH_MS)).toBeTrue();
  });
});
