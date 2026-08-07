import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import type { CachedResultContext, ResultContextUpdate } from '../cache/ResultsCache';
import type { GeekbenchGeneration } from '../geekbench/generation';
import { extractResultMetadata, type ResultMetadata } from '../geekbench/resultPayload';
import { defaultSettings } from '../settings/settings';
import { annotateGeekbenchComparisonPage } from './comparisonPage';
import { annotateGeekbenchResults } from './singleResultPage';

const settings = {
  ...defaultSettings,
  showProcessorSummary: false,
  showCoreTopology: false,
  showMultiCoreScaling: false,
  showFrequencyDistribution: false,
  showMemoryDetails: false,
  showReferenceComparison: false,
};

const badgeMounts = {
  mountSystemInstructionSets(target: Element) {
    const marker = document.createElement('span');
    marker.dataset.geeklensSystemInfo = 'true';
    marker.textContent = 'fixture instruction badges';
    target.appendChild(marker);
  },
  mountWorkloadBadges(target: Element) {
    const marker = document.createElement('span');
    marker.dataset.geeklensInstructions = 'true';
    target.appendChild(marker);
  },
};

interface CacheWrite {
  generation: GeekbenchGeneration;
  resultId: string;
  update: ResultContextUpdate;
}

function context(
  instructionSet: string | null,
  cachedMetadata: ResultMetadata | null = null,
  overrides: Partial<CachedResultContext> = {},
): CachedResultContext {
  return {
    instructionSet,
    metadata: cachedMetadata,
    processorLinks: { processorPath: null, macPath: null },
    lastAccessedAt: 1,
    ...overrides,
  };
}

function cache(values: Record<string, CachedResultContext | null>) {
  const reads: string[] = [];
  const writes: CacheWrite[] = [];
  return {
    reads,
    writes,
    dependency: {
      async getResultContext(_generation: GeekbenchGeneration, resultId: string) {
        reads.push(resultId);
        return values[resultId] ?? null;
      },
      async storeResultContext(
        generation: GeekbenchGeneration,
        resultId: string,
        update: ResultContextUpdate,
      ) {
        writes.push({ generation, resultId, update });
      },
    },
  };
}

async function fixture(name: string, url: string): Promise<void> {
  const html = await Bun.file(new URL(`__fixtures__/${name}`, import.meta.url)).text();
  const parsed = parseHTML(html);
  Object.defineProperty(parsed.window, 'location', { configurable: true, value: new URL(url) });
  Object.assign(globalThis, {
    document: parsed.document,
    window: parsed.window,
    DOMParser: parsed.window.DOMParser,
    Element: parsed.window.Element,
    HTMLElement: parsed.window.HTMLElement,
    Node: parsed.window.Node,
    Text: parsed.window.Text,
  });
}

async function metadata(resultId: string): Promise<ResultMetadata> {
  const payload = await Bun.file(
    new URL(`../geekbench/__fixtures__/${resultId}.gb6.json`, import.meta.url),
  ).json();
  const value = extractResultMetadata(payload, 7);
  if (!value) throw new Error(`Invalid metadata fixture ${resultId}`);
  return value;
}

function signIn(): void {
  document.querySelector('a[href="/session/new"]')?.remove();
}

afterEach(() => {
  for (const key of ['document', 'window', 'DOMParser', 'Element', 'HTMLElement', 'Node', 'Text']) {
    delete (globalThis as Record<string, unknown>)[key];
  }
});

describe('single-result page adapter', () => {
  test('uses a cached Geekbench 6 context without requesting payload metadata', async () => {
    await fixture('geekbench6-single.html', 'https://browser.geekbench.com/v6/cpu/18845365');
    const cached = cache({ '18845365': context('sse2 avx2') });
    const requests: string[] = [];

    await annotateGeekbenchResults(settings, {
      ...badgeMounts,
      cache: cached.dependency,
      async fetchMetadata(_generation, resultId) {
        requests.push(resultId);
        return null;
      },
    });

    expect(cached.reads).toEqual(['18845365']);
    expect(requests).toEqual([]);
    expect(document.querySelector('[data-geeklens-system-info]')).not.toBeNull();
    expect(document.getElementById('geeklens-info')?.textContent).toBe('GeekLens Active');
  });

  test('skips a signed-out Geekbench 7 payload request and gives a new explicit link precedence', async () => {
    await fixture('geekbench7-single.html', 'https://browser.geekbench.com/v7/cpu/58949');
    const processorCell = document.querySelectorAll('table.system-table')[1]?.querySelector('td');
    processorCell?.insertAdjacentHTML(
      'beforeend',
      '<a href="/processors/new-explicit-link">catalogue</a>',
    );
    const cached = cache({
      '58949': context(null, null, {
        processorLinks: { processorPath: '/processors/older-link', macPath: null },
      }),
    });
    let requests = 0;

    await annotateGeekbenchResults(settings, {
      ...badgeMounts,
      cache: cached.dependency,
      async fetchMetadata() {
        requests += 1;
        return null;
      },
    });

    expect(requests).toBe(0);
    expect(cached.writes.at(-1)?.update.processorLinks?.processorPath).toBe(
      '/processors/new-explicit-link',
    );
    expect(document.getElementById('geeklens-info')?.querySelector('a')?.href).toContain(
      '/session/new',
    );
  });

  test('uses newly fetched Geekbench 7 payload instructions over a cached compatibility value', async () => {
    await fixture('geekbench7-single.html', 'https://browser.geekbench.com/v7/cpu/58949');
    signIn();
    const fetchedMetadata = await metadata('58949');
    const payloadInstructions = fetchedMetadata.instructionSets?.value;
    if (!payloadInstructions) throw new Error('Expected fixture instruction metadata');
    const cached = cache({ '58949': context('cached conflicting instructions') });
    const mounted: string[] = [];

    await annotateGeekbenchResults(settings, {
      ...badgeMounts,
      cache: cached.dependency,
      async fetchMetadata() {
        return fetchedMetadata;
      },
      mountSystemInstructionSets(_target, categories) {
        mounted.push(...Object.values(categories).flat());
      },
    });

    expect(mounted.toSorted()).toEqual(payloadInstructions.toUpperCase().split(' ').toSorted());
    expect(cached.writes.at(-1)?.update.instructionSet).toBe(payloadInstructions);
  });
});

describe('comparison page adapter', () => {
  test.each([
    [5, 'geekbench5-comparison.html'],
    [7, 'geekbench7-comparison.html'],
  ] as const)(
    'does not mutate the baseline for signed-out Geekbench %i',
    async (generation, name) => {
      await fixture(
        name,
        `https://browser.geekbench.com/v${generation}/cpu/compare/primary?baseline=baseline`,
      );
      if (generation === 5) {
        document
          .querySelector('nav')
          ?.insertAdjacentHTML('beforeend', '<a href="/session/new">Log In</a>');
      }
      const cached = cache({});
      let baselineWindows = 0;

      await annotateGeekbenchComparisonPage(settings, {
        ...badgeMounts,
        cache: cached.dependency,
        async fetchHtmlContext() {
          throw new Error('unexpected HTML request');
        },
        async fetchMetadata() {
          throw new Error('unexpected payload request');
        },
        async loadValidity() {
          throw new Error('unexpected validity request');
        },
        async withClearedBaseline(_generation, _primary, _baseline, work) {
          baselineWindows += 1;
          return work();
        },
      });

      expect(cached.reads).toEqual(['primary', 'baseline']);
      expect(baselineWindows).toBe(0);
    },
  );

  test('uses one clear/restore window for signed-out v6 HTML fallbacks and validity', async () => {
    await fixture(
      'geekbench6-comparison.html',
      'https://browser.geekbench.com/v6/cpu/compare/primary?baseline=baseline',
    );
    const cached = cache({});
    const events: string[] = [];
    const errors = spyOn(console, 'error').mockImplementation(() => {});

    await annotateGeekbenchComparisonPage(settings, {
      ...badgeMounts,
      cache: cached.dependency,
      async fetchHtmlContext(_generation, resultId) {
        events.push(`html:${resultId}`);
        if (resultId === 'baseline') throw new Error('one-sided failure');
        return {
          instructionSet: 'sse2 avx2',
          processorLinks: { processorPath: '/processors/fetched-primary', macPath: null },
        };
      },
      async fetchMetadata() {
        throw new Error('signed-out v6 must use HTML');
      },
      async loadValidity(_generation, resultId) {
        events.push(`validity:${resultId}`);
        return null;
      },
      async withClearedBaseline(_generation, _primary, _baseline, work) {
        events.push('clear');
        try {
          return await work();
        } finally {
          events.push('restore');
        }
      },
    });

    expect(events.filter((event) => event === 'clear')).toHaveLength(1);
    expect(events.filter((event) => event === 'restore')).toHaveLength(1);
    expect(events).toContain('html:primary');
    expect(events).toContain('html:baseline');
    expect(events).toContain('validity:primary');
    expect(events).toContain('validity:baseline');
    const cells = document.querySelectorAll(
      'table.system-information tr[data-geeklens-instruction-sets] td',
    );
    expect(cells).toHaveLength(3);
    expect(cells[2]?.textContent).toBe('Not available');
    expect(cached.writes.some((write) => write.resultId === 'primary')).toBe(true);
    expect(errors).toHaveBeenCalledWith(
      'GeekLens: Error fetching data for result baseline:',
      expect.any(Error),
    );
    errors.mockRestore();
  });

  test('gives fetched processor links precedence over comparison links and cached links', async () => {
    await fixture(
      'geekbench6-comparison.html',
      'https://browser.geekbench.com/v6/cpu/compare/primary?baseline=baseline',
    );
    const processorRow = Array.from(
      document.querySelectorAll('table.system-information tbody tr'),
    ).find((row) => row.firstElementChild?.textContent?.trim() === 'Processor');
    processorRow?.children[1]?.insertAdjacentHTML(
      'beforeend',
      '<a href="/processors/comparison-primary">catalogue</a>',
    );
    const cached = cache({
      primary: context(null, null, {
        processorLinks: { processorPath: '/processors/cached-primary', macPath: null },
      }),
      baseline: context('sse2'),
    });

    await annotateGeekbenchComparisonPage(settings, {
      ...badgeMounts,
      cache: cached.dependency,
      async fetchHtmlContext(_generation, resultId) {
        if (resultId !== 'primary') throw new Error('unexpected baseline fetch');
        return {
          instructionSet: 'sse2 avx2',
          processorLinks: { processorPath: '/processors/fetched-primary', macPath: null },
        };
      },
      async fetchMetadata() {
        throw new Error('signed-out v6 must use HTML');
      },
      async loadValidity() {
        return null;
      },
      async withClearedBaseline(_generation, _primary, _baseline, work) {
        return work();
      },
    });

    const primaryWrite = cached.writes.findLast((write) => write.resultId === 'primary');
    expect(primaryWrite?.update.processorLinks?.processorPath).toBe('/processors/fetched-primary');
  });

  test('fetches only the missing comparison lane inside the shared validity window', async () => {
    await fixture(
      'geekbench7-comparison.html',
      'https://browser.geekbench.com/v7/cpu/compare/58949?baseline=64820',
    );
    signIn();
    const primaryMetadata = await metadata('58949');
    const baselineMetadata = await metadata('64820');
    const primaryInstructions = primaryMetadata.instructionSets?.value;
    const baselineInstructions = baselineMetadata.instructionSets?.value;
    if (!primaryInstructions || !baselineInstructions) {
      throw new Error('Expected comparison fixture instruction metadata');
    }
    const cached = cache({ '58949': context('sse2 avx2', primaryMetadata), '64820': null });
    const fetched: string[] = [];
    const systemMounts: Array<{ lane: number; instructions: string }> = [];
    let baselineWindows = 0;

    await annotateGeekbenchComparisonPage(settings, {
      ...badgeMounts,
      cache: cached.dependency,
      async fetchHtmlContext() {
        throw new Error('v7 must not fetch HTML');
      },
      async fetchMetadata(_generation, resultId) {
        fetched.push(resultId);
        return baselineMetadata;
      },
      async loadValidity() {
        return null;
      },
      async withClearedBaseline(_generation, _primary, _baseline, work) {
        baselineWindows += 1;
        return work();
      },
      mountSystemInstructionSets(target, categories) {
        systemMounts.push({
          lane: Array.from(target.parentElement?.children ?? []).indexOf(target),
          instructions: Object.values(categories).flat().join(' '),
        });
        badgeMounts.mountSystemInstructionSets(target);
      },
    });

    expect(fetched).toEqual(['64820']);
    expect(baselineWindows).toBe(1);
    const row = document.querySelector('tr[data-geeklens-instruction-sets]');
    expect(row?.children).toHaveLength(3);
    expect(row?.children[1]?.textContent).not.toBe('Not available');
    expect(row?.children[2]?.textContent).not.toBe('Not available');
    expect(systemMounts.map(({ lane }) => lane)).toEqual([1, 2]);
    expect(systemMounts[0]?.instructions.split(' ').toSorted()).toEqual(
      primaryInstructions.toUpperCase().split(' ').toSorted(),
    );
    expect(systemMounts[1]?.instructions.split(' ').toSorted()).toEqual(
      baselineInstructions.toUpperCase().split(' ').toSorted(),
    );
  });
});
