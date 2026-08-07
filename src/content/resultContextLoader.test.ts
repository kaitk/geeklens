import { describe, expect, test } from 'bun:test';
import type { CachedResultContext, ResultContextUpdate } from '../cache/ResultsCache';
import { loadResultContext } from './resultContextLoader';

const cached: CachedResultContext = {
  instructionSet: 'cached instructions',
  metadata: null,
  processorLinks: { processorPath: '/processors/cached', macPath: '/macs/cached' },
  lastAccessedAt: 1,
};

describe('result context loader', () => {
  test('uses the injected source and gives newly discovered links precedence', async () => {
    const writes: ResultContextUpdate[] = [];
    const result = await loadResultContext({
      cache: {
        async getResultContext() {
          return cached;
        },
        async storeResultContext(_generation, _resultId, update) {
          writes.push(update);
        },
      },
      generation: 7,
      resultId: '123',
      processorLinks: { processorPath: '/processors/explicit', macPath: null },
      loadSource(current) {
        return {
          instructionSet: current?.instructionSet ?? null,
          metadata: current?.metadata ?? null,
        };
      },
    });

    expect(result?.processorLinks).toEqual({
      processorPath: '/processors/explicit',
      macPath: '/macs/cached',
    });
    expect(writes).toHaveLength(1);
    expect(writes[0]?.processorLinks).toEqual(result?.processorLinks);
  });

  test('returns a supplied cache hit without reading or writing when the strategy skips', async () => {
    let reads = 0;
    let writes = 0;
    const result = await loadResultContext({
      cache: {
        async getResultContext() {
          reads += 1;
          return null;
        },
        async storeResultContext() {
          writes += 1;
        },
      },
      generation: 6,
      resultId: '456',
      cached,
      loadSource: () => null,
    });

    expect(result).toBe(cached);
    expect(reads).toBe(0);
    expect(writes).toBe(0);
  });
});
