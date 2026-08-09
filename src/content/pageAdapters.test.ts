import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import type {
  CachedResultContext,
  CachedResultValidity,
  ResultContextUpdate,
} from '../cache/ResultsCache';
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

const freshValidity: CachedResultValidity = {
  level: 'valid',
  message: 'Valid result.',
  checkedAt: Date.now(),
  source: 'validation-widget-v2',
};

interface CacheWrite {
  generation: GeekbenchGeneration;
  resultId: string;
  update: ResultContextUpdate;
}

function context(
  cachedMetadata: ResultMetadata | null,
  overrides: Partial<CachedResultContext> = {},
): CachedResultContext {
  return {
    metadata: cachedMetadata,
    processorLinks: { processorPath: null, macPath: null },
    validity: freshValidity,
    lastAccessedAt: 1,
    ...overrides,
  };
}

function cache(values: Record<string, CachedResultContext | null>, failWrites = false) {
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
        if (failWrites) throw new Error('cache unavailable');
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

async function metadata(
  resultId: string,
  generation: GeekbenchGeneration = 7,
): Promise<ResultMetadata> {
  const extension = generation === 5 ? 'gb5' : 'gb6';
  const payload = await Bun.file(
    new URL(`../geekbench/__fixtures__/${resultId}.${extension}.json`, import.meta.url),
  ).json();
  const value = extractResultMetadata(payload, generation);
  if (!value) throw new Error(`Invalid metadata fixture ${resultId}`);
  return value;
}

function signIn(): void {
  document.querySelector('a[href="/session/new"]')?.remove();
}

function banner(): HTMLElement {
  const value = document.getElementById('geeklens-info');
  if (!value) throw new Error('Expected status banner');
  return value;
}

afterEach(() => {
  for (const key of ['document', 'window', 'DOMParser', 'Element', 'HTMLElement', 'Node', 'Text']) {
    delete (globalThis as Record<string, unknown>)[key];
  }
});

describe('single-result page adapter', () => {
  test('uses a signed-out Geekbench 6 rendered ISA row without requesting a payload', async () => {
    await fixture('geekbench6-single.html', 'https://browser.geekbench.com/v6/cpu/18845365');
    const cached = cache({});
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
    expect(document.querySelector('[data-geeklens-system-info]')).not.toBeNull();
    expect(banner().textContent).toBe('GeekLens: Sign in to load result details');
    expect(banner().classList.contains('gb-extension-warning')).toBe(false);
  });

  test('does not invent HTML ISA data when a Geekbench 6 result has no rendered row', async () => {
    await fixture('geekbench6-single.html', 'https://browser.geekbench.com/v6/cpu/18845365');
    document
      .querySelector('td.name:nth-child(1)')
      ?.closest('table')
      ?.querySelectorAll('tr')
      .forEach((row) => {
        if (row.firstElementChild?.textContent?.trim() === 'Instruction Sets') row.remove();
      });
    const cached = cache({});
    let mounts = 0;

    await annotateGeekbenchResults(settings, {
      ...badgeMounts,
      cache: cached.dependency,
      async fetchMetadata() {
        throw new Error('signed-out result must not request a payload');
      },
      mountSystemInstructionSets() {
        mounts += 1;
      },
    });

    expect(mounts).toBe(0);
    expect(document.querySelector('[data-geeklens-system-info]')).toBeNull();
  });

  test('loads and caches authenticated payload metadata for processor context and Geekbench 7 ISA', async () => {
    await fixture('geekbench7-single.html', 'https://browser.geekbench.com/v7/cpu/58949');
    signIn();
    const fetchedMetadata = await metadata('58949');
    const cached = cache({});

    await annotateGeekbenchResults(settings, {
      ...badgeMounts,
      cache: cached.dependency,
      async fetchMetadata() {
        return fetchedMetadata;
      },
    });

    expect(cached.writes.some((write) => write.update.metadata === fetchedMetadata)).toBe(true);
    expect(document.querySelector('tr[data-geeklens-instruction-sets]')).not.toBeNull();
    expect(banner().textContent).toBe('GeekLens Active');
  });

  test('keeps a payload-backed page active without ISA and when ISA annotations are disabled', async () => {
    await fixture('geekbench6-single.html', 'https://browser.geekbench.com/v6/cpu/18845365');
    document.querySelectorAll('tr').forEach((row) => {
      if (row.firstElementChild?.textContent?.trim() === 'Instruction Sets') row.remove();
    });
    const cachedMetadata = await metadata('18873252', 6);
    const cached = cache({ '18845365': context(cachedMetadata) });

    await annotateGeekbenchResults(
      { ...settings, showIsaAnnotations: false },
      {
        ...badgeMounts,
        cache: cached.dependency,
        async fetchMetadata() {
          throw new Error('cache hit must not fetch');
        },
      },
    );

    expect(banner().textContent).toBe('GeekLens Active');
    expect(banner().classList.contains('gb-extension-warning')).toBe(false);
  });
});

describe('comparison page adapter', () => {
  test('uses signed-out cached payload metadata without requesting payload data', async () => {
    await fixture(
      'geekbench6-comparison.html',
      'https://browser.geekbench.com/v6/cpu/compare/58949?baseline=64820',
    );
    const primaryMetadata = await metadata('18864843', 6);
    const baselineMetadata = await metadata('18873252', 6);
    const cached = cache({
      '58949': context(primaryMetadata),
      '64820': context(baselineMetadata),
    });
    let baselineWindows = 0;

    await annotateGeekbenchComparisonPage(settings, {
      ...badgeMounts,
      cache: cached.dependency,
      async fetchMetadata() {
        throw new Error('signed-out comparison must not request payload data');
      },
      async loadValidity() {
        throw new Error('fresh validity must not reload');
      },
      async withClearedBaseline(_generation, _primary, _baseline, work) {
        baselineWindows += 1;
        return work();
      },
    });

    expect(baselineWindows).toBe(0);
    expect(document.querySelector('tr[data-geeklens-instruction-sets]')?.children).toHaveLength(3);
    expect(banner().textContent).toBe('GeekLens Active');
  });

  test('shows signed-out uncached comparisons as unavailable without an ISA source', async () => {
    await fixture(
      'geekbench6-comparison.html',
      'https://browser.geekbench.com/v6/cpu/compare/primary?baseline=baseline',
    );
    const cached = cache({});
    const events: string[] = [];

    await annotateGeekbenchComparisonPage(settings, {
      ...badgeMounts,
      cache: cached.dependency,
      async fetchMetadata() {
        throw new Error('signed-out comparison must not request payload data');
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

    expect(events).toEqual(['clear', 'validity:primary', 'validity:baseline', 'restore']);
    expect(document.querySelector('tr[data-geeklens-instruction-sets]')).toBeNull();
    expect(banner().textContent).toBe('GeekLens: Sign in to load result details');
    expect(banner().classList.contains('gb-extension-warning')).toBe(false);
  });

  test('loads only missing authenticated metadata within one clear/restore window and preserves lane order', async () => {
    await fixture(
      'geekbench7-comparison.html',
      'https://browser.geekbench.com/v7/cpu/compare/58949?baseline=64820',
    );
    signIn();
    const primaryMetadata = await metadata('58949');
    const baselineMetadata = await metadata('64820');
    const cached = cache({
      '58949': context(primaryMetadata),
      '64820': context(null, { validity: null }),
    });
    const fetched: string[] = [];
    const systemMounts: number[] = [];
    let baselineWindows = 0;

    await annotateGeekbenchComparisonPage(settings, {
      ...badgeMounts,
      cache: cached.dependency,
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
      mountSystemInstructionSets(target) {
        systemMounts.push(Array.from(target.parentElement?.children ?? []).indexOf(target));
        badgeMounts.mountSystemInstructionSets(target);
      },
    });

    expect(fetched).toEqual(['64820']);
    expect(baselineWindows).toBe(1);
    expect(systemMounts).toEqual([1, 2]);
    expect(banner().textContent).toBe('GeekLens Active');
  });

  test('renders a one-sided payload failure as limited rather than erroneous', async () => {
    await fixture(
      'geekbench7-comparison.html',
      'https://browser.geekbench.com/v7/cpu/compare/58949?baseline=64820',
    );
    signIn();
    const primaryMetadata = await metadata('58949');
    const cached = cache({});
    const errors = spyOn(console, 'error').mockImplementation(() => {});

    await annotateGeekbenchComparisonPage(settings, {
      ...badgeMounts,
      cache: cached.dependency,
      async fetchMetadata(_generation, resultId) {
        if (resultId === '64820') throw new Error('one-sided failure');
        return primaryMetadata;
      },
      async loadValidity() {
        return null;
      },
      async withClearedBaseline(_generation, _primary, _baseline, work) {
        return work();
      },
    });

    const cells = document.querySelectorAll(
      'table.system-information tr[data-geeklens-instruction-sets] td',
    );
    expect(cells).toHaveLength(3);
    expect(cells[2]?.textContent).toBe('Not available');
    expect(banner().textContent).toBe('GeekLens: Some result details unavailable');
    expect(banner().classList.contains('gb-extension-warning')).toBe(false);
    expect(errors).toHaveBeenCalledWith(
      'GeekLens: Error fetching data for result 64820:',
      expect.any(Error),
    );
    errors.mockRestore();
  });

  test('refreshes stale validity independently of signed-out cached ISA metadata', async () => {
    await fixture(
      'geekbench7-comparison.html',
      'https://browser.geekbench.com/v7/cpu/compare/58949?baseline=64820',
    );
    const primaryMetadata = await metadata('58949');
    const baselineMetadata = await metadata('64820');
    const cached = cache({
      '58949': context(primaryMetadata, { validity: null }),
      '64820': context(baselineMetadata, { validity: null }),
    });
    const validityRequests: string[] = [];
    let baselineWindows = 0;

    await annotateGeekbenchComparisonPage(settings, {
      ...badgeMounts,
      cache: cached.dependency,
      async fetchMetadata() {
        throw new Error('validity refresh must not trigger payload loading while signed out');
      },
      async loadValidity(_generation, resultId) {
        validityRequests.push(resultId);
        return freshValidity;
      },
      async withClearedBaseline(_generation, _primary, _baseline, work) {
        baselineWindows += 1;
        return work();
      },
    });

    expect(validityRequests).toEqual(['58949', '64820']);
    expect(baselineWindows).toBe(1);
    expect(banner().textContent).toBe('GeekLens Active');
  });

  test('caches newly discovered processor links best-effort without blocking annotation', async () => {
    await fixture(
      'geekbench7-comparison.html',
      'https://browser.geekbench.com/v7/cpu/compare/58949?baseline=64820',
    );
    const processorRow = Array.from(
      document.querySelectorAll('table.system-information tbody tr'),
    ).find((row) => row.firstElementChild?.textContent?.trim() === 'Processor');
    processorRow?.children[1]?.insertAdjacentHTML(
      'beforeend',
      '<a href="/processors/new-primary">catalogue</a>',
    );
    const primaryMetadata = await metadata('58949');
    const baselineMetadata = await metadata('64820');
    const cached = cache(
      {
        '58949': context(primaryMetadata, {
          processorLinks: { processorPath: '/processors/old-primary', macPath: '/macs/known' },
        }),
        '64820': context(baselineMetadata),
      },
      true,
    );
    const errors = spyOn(console, 'error').mockImplementation(() => {});

    await annotateGeekbenchComparisonPage(settings, {
      ...badgeMounts,
      cache: cached.dependency,
      async fetchMetadata() {
        throw new Error('cache hits must not fetch');
      },
      async loadValidity() {
        throw new Error('fresh validity must not fetch');
      },
      async withClearedBaseline(_generation, _primary, _baseline, work) {
        return work();
      },
    });

    expect(
      cached.writes.find((write) => write.resultId === '58949')?.update.processorLinks,
    ).toEqual({ processorPath: '/processors/new-primary', macPath: null });
    expect(banner().textContent).toBe('GeekLens Active');
    expect(errors).toHaveBeenCalledWith(
      'GeekLens: Could not cache processor links for 58949',
      expect.any(Error),
    );
    errors.mockRestore();
  });
});
