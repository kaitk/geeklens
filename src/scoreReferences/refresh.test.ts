import { describe, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import type { CachedResultContext } from '../cache/ResultsCache';
import { extractResultMetadata } from '../geekbench/resultPayload';
import { loadRuntimeScoreReference, type ScoreReferenceDependencies } from './refresh';
import type { StoredScoreReference } from './ScoreReferenceCache';

async function context(): Promise<CachedResultContext> {
  const payload = await Bun.file(
    new URL('../geekbench/__fixtures__/1248.gb6.json', import.meta.url),
  ).json();
  return {
    metadata: extractResultMetadata(payload, 7),
    processorLinks: {
      processorPath: '/processors/amd-ryzen-7-5800x3d',
      macPath: null,
    },
    lastAccessedAt: 1,
  };
}

function processorRow(score: number): string {
  return `<tr><td class="name"><a href="/processors/amd-ryzen-7-5800x3d">AMD Ryzen 7 5800X3D</a></td><td class="score">${score}</td></tr>`;
}

function processorChart(): string {
  return `<!doctype html><html><body><p>Geekbench 7</p><table id="single-core"><tbody>${processorRow(2019)}</tbody></table><table id="multi-core"><tbody>${processorRow(11785)}</tbody></table></body></html>`;
}

describe('runtime score reference loading', () => {
  test('fetches, stores, and returns a reference on the first cache miss', async () => {
    const records = new Map<string, StoredScoreReference>();
    let requests = 0;
    const dependencies: ScoreReferenceDependencies = {
      cache: {
        get: async (_, key) => records.get(`v7:${key}`) ?? null,
        claimSourceAttempt: async () => true,
        markSourceSuccess: async () => {},
        storeSnapshot: async (references) => {
          for (const reference of references) records.set(reference.cacheKey, reference);
        },
      },
      fetch: async () => {
        requests += 1;
        return new Response(processorChart());
      },
      now: () => 1_000_000,
      parseDocument: (html) => parseHTML(html).document as unknown as Document,
    };

    const reference = await loadRuntimeScoreReference(await context(), dependencies);

    expect(requests).toBe(1);
    expect(reference).toMatchObject({
      catalogueKey: 'amd-ryzen-7-5800x3d',
      singleCore: 2019,
      multiCore: 11785,
    });
  });

  test('rejects a Cloudflare challenge without storing it', async () => {
    let stores = 0;
    const dependencies: ScoreReferenceDependencies = {
      cache: {
        get: async () => null,
        claimSourceAttempt: async () => true,
        markSourceSuccess: async () => {},
        storeSnapshot: async () => {
          stores += 1;
        },
      },
      fetch: async () =>
        new Response(
          '<!doctype html><html><body>Enable JavaScript and cookies to continue<script src="/cdn-cgi/challenge-platform/test"></script></body></html>',
        ),
      now: () => 1_000_000,
      parseDocument: (html) => parseHTML(html).document as unknown as Document,
    };

    expect(await loadRuntimeScoreReference(await context(), dependencies)).toBeNull();
    expect(stores).toBe(0);
  });
});
