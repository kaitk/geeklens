import { beforeEach, describe, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import type { Settings } from '../settings/settings';
import {
  renderComparisonProcessorContext,
  renderSingleProcessorContext,
  type ProcessorContextViewModel,
} from './processorContextUi';

function model(name: string, vendor: string, architecture: string): ProcessorContextViewModel {
  return {
    name,
    displayName: name.replace(new RegExp(`^${vendor}\\s+`, 'i'), ''),
    status: null,
    vendor,
    vendorKey: vendor.toLowerCase(),
    architecture,
    cataloguePath: null,
    frequency: null,
    topology: null,
    scaling: null,
    coreComposition: null,
    hasReferenceDataset: true,
    reference: null,
    disputedL3Cache: null,
    hasReportedMemoryTransferRate: true,
    memory: [],
  };
}

function settings(showProcessorSummary: boolean, overrides: Partial<Settings> = {}): Settings {
  return {
    enabled: true,
    showProcessorSummary,
    showCoreTopology: false,
    showMultiCoreScaling: false,
    showFrequencyDistribution: false,
    showMemoryDetails: false,
    showReferenceComparison: false,
    showIsaAnnotations: true,
    coloredBadges: true,
    tooltips: true,
    mappingWarnings: true,
    ...overrides,
  };
}

function withFrequency(
  viewModel: ProcessorContextViewModel,
  minGHz: number,
  maxGHz: number,
): ProcessorContextViewModel {
  return {
    ...viewModel,
    frequency: {
      minGHz,
      q1GHz: minGHz + (maxGHz - minGHz) * 0.25,
      medianGHz: minGHz + (maxGHz - minGHz) * 0.5,
      meanGHz: minGHz + (maxGHz - minGHz) * 0.6,
      q3GHz: minGHz + (maxGHz - minGHz) * 0.75,
      maxGHz,
    },
  };
}

async function fixture(name: string): Promise<Document> {
  const html = await Bun.file(new URL(`__fixtures__/${name}`, import.meta.url)).text();
  return parseHTML(html).document as unknown as Document;
}

beforeEach(() => {
  delete (globalThis as { document?: Document }).document;
});

describe('processor context DOM integration', () => {
  test('replaces the native single-result processor cell once', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const viewModel = model('AMD Ryzen 7 5800X3D', 'AMD', 'x86');
    viewModel.cataloguePath = 'https://browser.geekbench.com/processors/amd-ryzen-7-5800x3d';

    renderSingleProcessorContext(viewModel, settings(true));
    renderSingleProcessorContext(viewModel, settings(true));

    const cell = document
      .querySelectorAll('table.system-table')[1]
      ?.querySelector('tbody tr td:last-child');
    expect(cell?.querySelectorAll('[data-geeklens-preview-processor]')).toHaveLength(1);
    expect(cell?.textContent).toContain('AMD');
    expect(cell?.textContent).toContain('Ryzen 7 5800X3D');
    expect(cell?.textContent).toContain('x86');
    const processorLink = cell?.querySelector('a.geeklens-preview-external-link');
    expect(processorLink?.querySelector('svg.geeklens-icon-info')).not.toBeNull();
    expect(processorLink?.querySelector('.geeklens-preview-source-tooltip')?.textContent).toBe(
      'Processor pagebrowser.geekbench.comClick to open in a new tab.',
    );
    expect(processorLink?.getAttribute('title')).toBeNull();
    expect(processorLink?.getAttribute('aria-label')).toBe('Open processor page in a new tab.');
  });

  test('shows the exact reported name only when the presentation was cleaned up', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const viewModel = model('AMD Ryzen 9 9950X3D2 16-Core Processor', 'AMD', 'x86');
    viewModel.displayName = 'Ryzen 9 9950X3D2';

    renderSingleProcessorContext(viewModel, settings(true));

    const name = document.querySelector('.geeklens-preview-reported-name');
    expect(name?.firstChild?.textContent).toBe('Ryzen 9 9950X3D2');
    expect(name?.getAttribute('tabindex')).toBe('0');
    expect(name?.getAttribute('aria-label')).toBe(
      'Ryzen 9 9950X3D2. Reported processor name: AMD Ryzen 9 9950X3D2 16-Core Processor',
    );
    expect(name?.querySelector('.geeklens-preview-source-tooltip')?.textContent).toBe(
      'Reported processor nameAMD Ryzen 9 9950X3D2 16-Core Processor',
    );

    globalThis.document = await fixture('geekbench7-single.html');
    renderSingleProcessorContext(model('Generic CPU', 'Unknown', 'x86'), settings(true));
    expect(document.querySelector('.geeklens-preview-reported-name')).toBeNull();
  });

  test('preserves primary/baseline order and a native missing side', async () => {
    globalThis.document = await fixture('geekbench7-comparison.html');

    renderComparisonProcessorContext(
      [model('Intel Core Ultra 5 245K', 'Intel', 'x86'), null],
      settings(true),
    );

    const cells = document.querySelectorAll('table.system-information tbody tr:nth-child(2) td');
    expect(cells[1]?.textContent).toContain('Intel');
    expect(cells[1]?.textContent).toContain('Core Ultra 5 245K');
    expect(cells[2]?.textContent).toContain('Baseline CPU');
    expect(cells[2]?.querySelector('[data-geeklens-preview-processor]')).toBeNull();
  });

  test('renders engineering-sample status as an accessible compact badge', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const viewModel = model('AMD Eng Sample: 100-000001535-05', 'AMD', 'x86');
    viewModel.displayName = '100-000001535-05';
    viewModel.status = 'engineering-sample';

    renderSingleProcessorContext(viewModel, settings(true));

    const badge = document.querySelector('.geeklens-preview-badge-status');
    expect(badge?.firstChild?.textContent).toBe('ES');
    expect(badge?.getAttribute('title')).toBeNull();
    expect(badge?.getAttribute('tabindex')).toBe('0');
    expect(badge?.getAttribute('aria-label')).toBe('Engineering sample');
    expect(badge?.querySelector('.geeklens-preview-status-tooltip')?.textContent).toBe(
      'Engineering sample',
    );
    expect(document.querySelector('.geeklens-preview-reported-name')?.firstChild?.textContent).toBe(
      '100-000001535-05',
    );
  });

  test('does not change native processor cells when the setting is disabled', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const cell = document
      .querySelectorAll('table.system-table')[1]
      ?.querySelector('tbody tr td:last-child');
    const original = cell?.textContent;

    renderSingleProcessorContext(model('Apple M1 Pro', 'Apple', 'ARM'), settings(false));

    expect(cell?.textContent).toBe(original);
    expect(cell?.querySelector('[data-geeklens-preview-processor]')).toBeNull();
  });

  test('adds one accessible frequency row below native topology', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const viewModel = withFrequency(model('AMD Ryzen 7 5800X3D', 'AMD', 'x86'), 4.446, 4.538);
    const enabled = settings(true, { showFrequencyDistribution: true });

    renderSingleProcessorContext(viewModel, enabled);
    renderSingleProcessorContext(viewModel, enabled);

    const row = document.querySelector('[data-geeklens-preview-detail="frequency"]');
    expect(row?.previousElementSibling?.firstElementChild?.textContent?.trim()).toBe('Topology');
    expect(row?.textContent).toContain('4.45–4.54 GHz');
    expect(row?.querySelector('.geeklens-preview-distribution')?.getAttribute('aria-label')).toBe(
      'Frequency samples: minimum 4.45 GHz, median 4.49 GHz, mean 4.50 GHz, maximum 4.54 GHz.',
    );
    expect(document.querySelectorAll('[data-geeklens-preview-detail="frequency"]')).toHaveLength(1);
  });

  test('draws the cluster split proportionally without assigning cluster roles', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const viewModel = model('Intel CPU', 'Intel', 'x86');
    viewModel.topology = {
      cores: 20,
      threads: 28,
      clusters: [
        { cores: 8, maxGHz: 5.5, label: null },
        { cores: 12, maxGHz: 4.2, label: null },
      ],
    };

    renderSingleProcessorContext(
      viewModel,
      settings(true, { showCoreTopology: true, showMultiCoreScaling: true }),
    );

    const topology = document.querySelector('.geeklens-preview-topology');
    expect(topology?.closest('tr')?.firstElementChild?.textContent).toContain('Topology');
    // The native cell reads "1 Processor, 16 Cores"; the socket count survives,
    // the payload's totals replace the rest.
    expect(topology?.querySelector('.geeklens-preview-topology-summary')?.textContent).toBe(
      '1 processor · 20 cores · 28 threads',
    );
    expect(
      Array.from(topology?.querySelectorAll('.geeklens-preview-topology-segment') ?? []).map(
        (segment) => segment.getAttribute('style'),
      ),
    ).toEqual(['flex-grow:8;opacity:1', 'flex-grow:12;opacity:0.75']);
    expect(
      Array.from(topology?.querySelectorAll('.geeklens-preview-topology-cluster') ?? []).map(
        (cluster) => cluster.textContent,
      ),
    ).toEqual(['8 cores · up to 5.50 GHz', '12 cores · up to 4.20 GHz']);
    expect(topology?.textContent).not.toMatch(/performance|efficiency|P-core|E-core/i);
    expect(topology?.textContent).not.toContain('×');
  });

  test('states core types as a sourced fact, without labelling any segment', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const viewModel = model('AMD CPU', 'AMD', 'x86');
    // Strix Point's shape: totals but no clusters, so the composition line is the
    // only place core types can appear at all.
    viewModel.topology = { cores: 12, threads: 24, clusters: [] };
    viewModel.coreComposition = {
      value: '4 Zen 5 + 8 Zen 5c',
      provenance: 'published',
      source: { url: 'https://example.com/amd', label: 'AMD, retrieved 2026-08-01' },
    };

    renderSingleProcessorContext(viewModel, settings(true, { showCoreTopology: true }));

    const composition = document.querySelector('[data-geeklens-preview-composition]');
    expect(composition?.firstElementChild?.textContent).toBe('4 Zen 5 + 8 Zen 5c');
    expect(document.querySelector('.geeklens-preview-topology-bar')).toBeNull();

    expect(composition?.querySelector('.geeklens-preview-provenance')).toBeNull();
    const source = composition?.querySelector('a.geeklens-preview-external-link');
    expect(source?.querySelector('svg.geeklens-icon-info')).not.toBeNull();
    expect(source?.getAttribute('href')).toBe('https://example.com/amd');
    expect(source?.querySelector('.geeklens-preview-source-tooltip')?.textContent).toBe(
      'Core composition sourceAMD, retrieved 2026-08-01Click to open in a new tab.',
    );
    expect(source?.getAttribute('aria-label')).toBe(
      'View core composition source: AMD, retrieved 2026-08-01. Opens in a new tab.',
    );
  });

  test('names the clusters in the legend instead of repeating them as a line', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const viewModel = model('Intel CPU', 'Intel', 'x86');
    // The 13900K's shape: named clusters carry the composition themselves, so
    // the sentence below the bar would be the same fact stated twice.
    viewModel.topology = {
      cores: 24,
      threads: 32,
      clusters: [
        { cores: 8, maxGHz: 5.5, label: 'Performance-cores' },
        { cores: 16, maxGHz: 4.3, label: 'Efficient-cores' },
      ],
    };
    viewModel.coreComposition = {
      value: '8 Performance-cores + 16 Efficient-cores',
      provenance: 'published',
      source: { url: 'https://example.com/intel', label: 'Wikipedia, retrieved 2026-08-01' },
    };

    renderSingleProcessorContext(viewModel, settings(true, { showCoreTopology: true }));

    const topology = document.querySelector('.geeklens-preview-topology');
    const entries = Array.from(
      topology?.querySelectorAll('.geeklens-preview-topology-cluster') ?? [],
    );
    expect(entries.map((entry) => entry.textContent)).toEqual([
      '8 Performance-cores',
      '16 Efficient-cores',
    ]);
    // The frequency stays reachable without spending a line on it.
    expect(entries.map((entry) => entry.getAttribute('title'))).toEqual([
      'up to 5.50 GHz',
      'up to 4.30 GHz',
    ]);

    // The sentence is gone, and the legend itself is what now carries it.
    expect(document.querySelector('.geeklens-preview-topology-composition')).toBeNull();
    expect(topology?.textContent).not.toContain('8 Performance-cores + 16 Efficient-cores');
    const composition = document.querySelector('[data-geeklens-preview-composition]');
    expect(composition?.className).toBe('geeklens-preview-topology-clusters');

    // One source for the whole composition, trailing the legend.
    const sources = topology?.querySelectorAll('a.geeklens-preview-external-link') ?? [];
    expect(sources.length).toBe(1);
    expect(sources[0]?.getAttribute('href')).toBe('https://example.com/intel');
    expect(sources[0]?.getAttribute('aria-label')).toBe(
      'View core composition source: Wikipedia, retrieved 2026-08-01. Opens in a new tab.',
    );
    expect(composition?.lastElementChild).toBe(sources[0]!);
  });

  test('keeps the composition line when only some clusters could be named', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const viewModel = model('Intel CPU', 'Intel', 'x86');
    viewModel.topology = {
      cores: 16,
      threads: 24,
      clusters: [
        { cores: 8, maxGHz: 5.5, label: 'Performance-cores' },
        { cores: 8, maxGHz: 4.3, label: null },
      ],
    };
    viewModel.coreComposition = {
      value: '8 Performance-cores + 8 Efficient-cores',
      provenance: 'published',
      source: { url: 'https://example.com/intel', label: 'Wikipedia, retrieved 2026-08-01' },
    };

    renderSingleProcessorContext(viewModel, settings(true, { showCoreTopology: true }));

    const line = document.querySelector('.geeklens-preview-topology-composition');
    expect(line?.firstElementChild?.textContent).toBe('8 Performance-cores + 8 Efficient-cores');
    expect(
      document
        .querySelector('.geeklens-preview-topology-clusters')
        ?.hasAttribute('data-geeklens-preview-composition'),
    ).toBe(false);
  });

  test('flags a disputed L3 total with one affordance, leaving the value alone', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const viewModel = model('AMD CPU', 'AMD', 'x86');
    viewModel.disputedL3Cache = {
      detail: 'Geekbench multiplies one die’s L3 by the die count. It is published as 128 MB.',
      source: { url: 'https://example.com/zen5', label: 'Wikipedia, retrieved 2026-08-01' },
    };

    renderSingleProcessorContext(viewModel, settings(true));

    const row = Array.from(document.querySelectorAll('table.system-table tbody tr')).find(
      (candidate) => candidate.firstElementChild?.textContent?.trim() === 'L3 Cache',
    );
    // The reported value is the whole point of the warning, so the number itself
    // is never rewritten — the warning is appended beside it.
    expect(row?.lastElementChild?.firstChild?.textContent).toBe('32.0 MB x 2');

    // One element carries both the objection and the source, and it is a warning
    // triangle rather than the neutral info icon used for agreed sources.
    const flags = row?.querySelectorAll('a, .geeklens-preview-row-marker') ?? [];
    expect(flags.length).toBe(1);
    const warning = flags[0]!;
    expect(warning.classList.contains('geeklens-preview-cache-dispute')).toBe(true);
    expect(warning.querySelector('svg.geeklens-icon-warning')).not.toBeNull();
    expect(warning.getAttribute('href')).toBe('https://example.com/zen5');
    expect(warning.getAttribute('aria-label')).toBe(
      'Reported L3 is likely wrong. Geekbench multiplies one die’s L3 by the die count. It is published as 128 MB. Source: Wikipedia, retrieved 2026-08-01. Opens in a new tab.',
    );
    expect(warning.querySelector('.geeklens-preview-source-tooltip')?.textContent).toBe(
      'Reported L3 is likely wrongGeekbench multiplies one die’s L3 by the die count. It is published as 128 MB.Wikipedia, retrieved 2026-08-01Click to open in a new tab.',
    );
  });

  test('leaves the L3 row alone when nothing disputes it', async () => {
    globalThis.document = await fixture('geekbench7-single.html');

    renderSingleProcessorContext(model('AMD CPU', 'AMD', 'x86'), settings(true));

    expect(document.querySelector('.geeklens-preview-cache-dispute')).toBeNull();
  });

  test('drops the dispute if the reported cache stops being a per-die total', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const viewModel = model('AMD CPU', 'AMD', 'x86');
    viewModel.disputedL3Cache = {
      detail: 'Geekbench multiplies one die’s L3 by the die count. It is published as 128 MB.',
      source: { url: 'https://example.com/zen5', label: 'Wikipedia, retrieved 2026-08-01' },
    };
    // What Geekbench would print once it reports one figure for the package.
    // There is then nothing left to dispute.
    const row = Array.from(document.querySelectorAll('table.system-table tbody tr')).find(
      (candidate) => candidate.firstElementChild?.textContent?.trim() === 'L3 Cache',
    );
    row!.lastElementChild!.textContent = '128 MB';

    renderSingleProcessorContext(viewModel, settings(true));

    expect(document.querySelector('[data-geeklens-row-marker="disputed"]')).toBeNull();
  });

  test('disputes only the affected lane of a shared comparison cache row', async () => {
    globalThis.document = await fixture('geekbench7-comparison.html');
    const primary = model('Intel Core i9-13900K', 'Intel', 'x86');
    const baseline = model('AMD Ryzen 9 9950X3D', 'AMD', 'x86');
    // Only the baseline is an asymmetric dual-die part. The primary reports
    // `36.0 MB x 1`, which is a single die and correct as printed.
    baseline.disputedL3Cache = {
      detail: 'Geekbench multiplies one die’s L3 by the die count. It is published as 128 MB.',
      source: { url: 'https://example.com/zen5', label: 'Wikipedia, retrieved 2026-08-01' },
    };

    renderComparisonProcessorContext([primary, baseline], settings(true));

    const row = Array.from(document.querySelectorAll('table.system-information tbody tr')).find(
      (candidate) => candidate.firstElementChild?.textContent?.trim() === 'L3 Cache',
    );
    const cells = Array.from(row?.children ?? []);
    expect(cells[1]?.querySelector('.geeklens-preview-cache-dispute')).toBeNull();
    expect(cells[2]?.querySelector('.geeklens-preview-cache-dispute')).not.toBeNull();
    expect(cells[1]?.textContent).toBe('36.0 MB x 1');
    expect(cells[2]?.firstChild?.textContent).toBe('96.0 MB x 2');
  });

  test('omits the composition line when no catalogue entry supplies one', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const viewModel = model('Intel CPU', 'Intel', 'x86');
    viewModel.topology = {
      cores: 8,
      threads: 8,
      clusters: [
        { cores: 4, maxGHz: 5, label: null },
        { cores: 4, maxGHz: 3, label: null },
      ],
    };

    renderSingleProcessorContext(viewModel, settings(true, { showCoreTopology: true }));

    expect(document.querySelector('[data-geeklens-preview-composition]')).toBeNull();
    expect(document.querySelector('.geeklens-preview-topology')?.textContent).not.toMatch(
      /performance|efficiency/i,
    );
  });

  test('gates the topology row and the scaling note independently', async () => {
    const viewModel = model('Intel CPU', 'Intel', 'x86');
    viewModel.topology = { cores: 8, threads: 16, clusters: [] };
    viewModel.scaling = { ratio: 5.5, singleCore: 2000, multiCore: 11000 };
    const multiCoreTable =
      '<table class="table benchmark-table"><thead><tr><th class="name">Multi-Core Score</th><th class="score">11000</th></tr></thead><tbody></tbody></table>';

    globalThis.document = await fixture('geekbench7-single.html');
    document.body.insertAdjacentHTML('beforeend', multiCoreTable);
    renderSingleProcessorContext(viewModel, settings(true, { showCoreTopology: true }));
    expect(document.querySelector('.geeklens-preview-topology')).not.toBeNull();
    expect(document.querySelector('[data-geeklens-preview-scaling]')).toBeNull();

    globalThis.document = await fixture('geekbench7-single.html');
    document.body.insertAdjacentHTML('beforeend', multiCoreTable);
    renderSingleProcessorContext(viewModel, settings(true, { showMultiCoreScaling: true }));
    expect(document.querySelector('.geeklens-preview-topology')).toBeNull();
    expect(document.querySelector('[data-geeklens-preview-scaling]')).not.toBeNull();
  });

  test('falls back to the native topology string when the payload carries no totals', async () => {
    globalThis.document = await fixture('geekbench7-single.html');

    renderSingleProcessorContext(
      model('Intel CPU', 'Intel', 'x86'),
      settings(true, { showCoreTopology: true, showMultiCoreScaling: true }),
    );

    expect(document.querySelector('.geeklens-preview-topology-summary')?.textContent).toBe(
      '1 Processor, 16 Cores',
    );
    expect(document.querySelector('.geeklens-preview-topology-bar')).toBeNull();
  });

  test('prints multi-core scaling in the graph column beside the multi-core score, once', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    document.body.insertAdjacentHTML(
      'beforeend',
      '<table class="table benchmark-table"><thead><tr class="stacked-heading"><th class="name">Multi-Core Score</th><th class="score">14500</th><th class="graph"></th></tr></thead><tbody></tbody></table>',
    );
    const viewModel = model('Intel CPU', 'Intel', 'x86');
    viewModel.scaling = { ratio: 7.25, singleCore: 2000, multiCore: 14500 };
    viewModel.cataloguePath = 'https://browser.geekbench.com/processors/intel-cpu';
    viewModel.reference = {
      singleCore: 1900,
      multiCore: 14000,
      generation: 'Geekbench 7',
    };
    const enabled = settings(true, {
      showCoreTopology: true,
      showMultiCoreScaling: true,
      showReferenceComparison: true,
    });

    renderSingleProcessorContext(viewModel, enabled);
    renderSingleProcessorContext(viewModel, enabled);

    const notes = document.querySelectorAll('[data-geeklens-preview-scaling]');
    expect(notes).toHaveLength(1);
    expect(notes[0]?.parentElement?.className).toBe('graph');
    expect(notes[0]?.firstChild?.textContent).toBe('7.25× single-core');
    expect(notes[0]?.getAttribute('aria-label')).toBe(
      'Multi-core score is 7.25× the single-core score of 2,000.',
    );
    expect(notes[0]?.querySelector('.geeklens-preview-scaling-tooltip')?.textContent).toContain(
      'poor comparison against the core count',
    );
    expect(
      notes[0]?.parentElement?.parentElement
        ?.querySelector('.score')
        ?.querySelector('[data-geeklens-preview-reference]'),
    ).not.toBeNull();
    expect(document.querySelector('.geeklens-preview-topology')?.textContent).not.toContain('7.25');
  });

  test('keeps single-result scaling below the reference average', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div class="score-container desktop"><div class="score">2000</div></div><div class="score-container desktop"><div class="score">14500</div></div>',
    );
    const viewModel = model('Intel CPU', 'Intel', 'x86');
    viewModel.scaling = { ratio: 7.25, singleCore: 2000, multiCore: 14500 };
    viewModel.cataloguePath = 'https://browser.geekbench.com/processors/intel-cpu';
    viewModel.reference = {
      singleCore: 1900,
      multiCore: 14000,
      generation: 'Geekbench 7',
    };

    renderSingleProcessorContext(
      viewModel,
      settings(true, {
        showMultiCoreScaling: true,
        showReferenceComparison: true,
      }),
    );

    const multiCoreScore = document.querySelectorAll('.score-container.desktop .score')[1];
    expect(
      multiCoreScore?.querySelector('[data-geeklens-preview-reference]')?.textContent,
    ).toContain('+3.6% vs avg');
    expect(
      multiCoreScore?.querySelector('[data-geeklens-preview-scaling]')?.firstChild?.textContent,
    ).toBe('7.25× single-core');
    expect(
      Array.from(multiCoreScore?.children ?? []).map((child) =>
        child.hasAttribute('data-geeklens-preview-scaling') ? 'scaling' : 'reference',
      ),
    ).toEqual(['reference', 'scaling']);
  });

  test('keeps comparison scaling beside scores without disturbing differences or averages', async () => {
    globalThis.document = await fixture('geekbench7-comparison.html');
    document
      .querySelector('table.comparison-benchmark-table tbody')
      ?.insertAdjacentHTML(
        'afterbegin',
        '<tr class="test-multi-core"><td class="name">Multi-Core Score</td><td class="score">14500</td><td class="score">8000</td><td class="delta">181.3%</td></tr>',
      );
    const primary = model('Intel CPU', 'Intel', 'x86');
    primary.scaling = { ratio: 7.25, singleCore: 2000, multiCore: 14500 };
    primary.cataloguePath = 'https://browser.geekbench.com/processors/intel-cpu';
    primary.reference = {
      singleCore: 1900,
      multiCore: 14000,
      generation: 'Geekbench 7',
    };
    const baseline = model('AMD CPU', 'AMD', 'x86');
    baseline.scaling = { ratio: 4.5, singleCore: 1778, multiCore: 8000 };
    baseline.cataloguePath = 'https://browser.geekbench.com/processors/amd-cpu';
    baseline.reference = {
      singleCore: 1700,
      multiCore: 7800,
      generation: 'Geekbench 7',
    };

    renderComparisonProcessorContext(
      [primary, baseline],
      settings(true, {
        showCoreTopology: true,
        showMultiCoreScaling: true,
        showReferenceComparison: true,
      }),
    );

    const scoreRow = document.querySelector('.test-multi-core');
    expect(
      Array.from(scoreRow?.querySelectorAll('[data-geeklens-preview-scaling]') ?? []).map(
        (note) => note.firstChild?.textContent,
      ),
    ).toEqual(['7.25× single-core', '4.50× single-core']);
    expect(scoreRow?.querySelector('.delta')?.textContent).toBe('181.3%');
    expect(scoreRow?.querySelectorAll('[data-geeklens-preview-reference]')).toHaveLength(2);
    expect(scoreRow?.querySelector('.geeklens-preview-scaling.is-score-aligned')).toBeNull();
    const row = document.querySelector('[data-geeklens-preview-detail="topology"]');
    expect(row?.firstElementChild?.textContent).toContain('Topology');
    expect(row?.textContent).not.toContain('×');
  });

  test('right-aligns comparison scaling when no average line is present', async () => {
    globalThis.document = await fixture('geekbench6-comparison.html');
    document
      .querySelector('table.comparison-benchmark-table tbody')
      ?.insertAdjacentHTML(
        'afterbegin',
        '<tr class="test-multi-core"><td class="name">Multi-Core Score</td><td class="score">14500</td><td class="score">8000</td><td class="delta">181.3%</td></tr>',
      );
    const primary = model('Intel CPU', 'Intel', 'x86');
    primary.hasReferenceDataset = false;
    primary.scaling = { ratio: 7.25, singleCore: 2000, multiCore: 14500 };
    const baseline = model('AMD CPU', 'AMD', 'x86');
    baseline.hasReferenceDataset = false;
    baseline.scaling = { ratio: 4.5, singleCore: 1778, multiCore: 8000 };

    renderComparisonProcessorContext(
      [primary, baseline],
      settings(true, {
        showMultiCoreScaling: true,
        showReferenceComparison: true,
      }),
    );

    const notes = document.querySelectorAll(
      '.test-multi-core .geeklens-preview-scaling.is-score-aligned',
    );
    expect(notes).toHaveLength(2);
    expect(document.querySelector('.test-multi-core [data-geeklens-preview-reference]')).toBeNull();
  });

  test('maps scaling by comparison column in every Geekbench 5 score table', async () => {
    globalThis.document = await fixture('geekbench5-comparison.html');
    const primary = model('AMD Ryzen 7 7700X', 'AMD', 'x86');
    primary.hasReferenceDataset = false;
    primary.scaling = { ratio: 6.5, singleCore: 2141, multiCore: 13921 };
    const baseline = model('AMD Ryzen 7 5800X3D', 'AMD', 'x86');
    baseline.hasReferenceDataset = false;
    baseline.scaling = { ratio: 7.11, singleCore: 1461, multiCore: 10389 };

    renderComparisonProcessorContext(
      [primary, baseline],
      settings(true, { showMultiCoreScaling: true }),
    );

    const multiCoreRows = Array.from(
      document.querySelectorAll('table.comparison-benchmark-table tr'),
    ).filter((row) =>
      (row.firstElementChild?.textContent?.trim() ?? '').startsWith('Multi-Core Score'),
    );
    expect(multiCoreRows).toHaveLength(2);
    for (const row of multiCoreRows) {
      expect(
        Array.from(row.querySelectorAll('[data-geeklens-preview-scaling]')).map(
          (note) => note.firstChild?.textContent,
        ),
      ).toEqual(['6.50× single-core', '7.11× single-core']);
    }
  });

  test('suppresses a single-result frequency row when data or the setting is absent', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    renderSingleProcessorContext(
      model('Apple M1 Pro', 'Apple', 'ARM'),
      settings(true, {
        showFrequencyDistribution: true,
      }),
    );
    expect(document.querySelector('[data-geeklens-preview-detail="frequency"]')).toBeNull();

    globalThis.document = await fixture('geekbench7-single.html');
    renderSingleProcessorContext(
      withFrequency(model('Apple M1 Pro', 'Apple', 'ARM'), 0.6, 3.2),
      settings(true),
    );
    expect(document.querySelector('[data-geeklens-preview-detail="frequency"]')).toBeNull();
  });

  test('uses one shared comparison scale and preserves a missing frequency lane', async () => {
    globalThis.document = await fixture('geekbench7-comparison.html');
    const primary = withFrequency(
      model('AMD Ryzen 7 5800X3D 8-Core Processor', 'AMD', 'x86'),
      4,
      5,
    );
    primary.displayName = 'Ryzen 7 5800X3D';
    const baseline = withFrequency(
      model('Intel(R) Core(TM) Ultra 9 290K Plus', 'Intel', 'x86'),
      2,
      4,
    );
    baseline.displayName = 'Core Ultra 9 290K Plus';

    renderComparisonProcessorContext(
      [primary, baseline],
      settings(true, { showFrequencyDistribution: true }),
    );

    // Both lanes share one domain, inset at each end so the result owning an
    // extreme is not drawn half outside the plot box.
    const charts = document.querySelectorAll('.geeklens-preview-distribution');
    expect(charts[0]?.getAttribute('style')).toContain('--min:65.33333333333333%');
    expect(charts[0]?.getAttribute('style')).toContain('--max:96.00000000000001%');
    expect(charts[1]?.getAttribute('style')).toContain('--min:4%');
    expect(charts[1]?.getAttribute('style')).toContain('--max:65.33333333333333%');
    const row = document.querySelector('[data-geeklens-preview-detail="frequency"]');
    expect((row?.querySelector('td:last-child') as HTMLTableCellElement | null)?.colSpan).toBe(2);
    expect(
      Array.from(row?.querySelectorAll('.geeklens-preview-frequency-lane-label') ?? []).map(
        (label) => label.textContent,
      ),
    ).toEqual(['Ryzen 7 5800X3D', 'Core Ultra 9 290K Plus']);
    expect(row?.querySelector('.geeklens-preview-frequency-axis')?.textContent).toBe(
      '2.00 GHz5.00 GHz',
    );
    // The readout stays beside each plot: a lane compressed by the shared scale
    // would otherwise be unreadable without hovering.
    expect(
      Array.from(row?.querySelectorAll('.geeklens-preview-frequency-values') ?? []).map(
        (values) => values.textContent,
      ),
    ).toEqual(['4.00–5.00 GHz', '2.00–4.00 GHz']);

    globalThis.document = await fixture('geekbench7-comparison.html');
    renderComparisonProcessorContext(
      [primary, model('Qualcomm Snapdragon X Elite', 'Qualcomm', 'ARM')],
      settings(true, { showFrequencyDistribution: true }),
    );
    const lanes = document.querySelectorAll('.geeklens-preview-frequency-lane');
    expect(lanes[1]?.textContent).toBe('Snapdragon X EliteNot available');
  });

  test('renders a compact memory summary with accessible details', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    document.body.insertAdjacentHTML(
      'beforeend',
      '<table class="system-table"><thead><tr><th>Memory Information</th></tr></thead><tbody><tr><td>Size</td><td>32 GB</td></tr></tbody></table>',
    );
    const viewModel = model('AMD Ryzen 7 5800X3D', 'AMD', 'x86');
    viewModel.memory = [
      { kind: 'capacity', value: '32 GB', provenance: 'reported' },
      {
        kind: 'specification',
        value: 'DDR4-3600',
        provenance: 'reported',
        detail: 'Exact payload value: 3598 MT/s.',
      },
      {
        kind: 'bandwidth',
        value: '57.6 GB/s',
        provenance: 'computed',
        detail:
          'Maximum bandwidth calculated from the reported memory rate and bus width; not measured.',
      },
      {
        kind: 'bandwidth',
        value: 'Up to 200 GB/s',
        provenance: 'published',
        source: { url: 'https://example.com/source', label: 'Example, retrieved 2026-08-01' },
      },
    ];

    renderSingleProcessorContext(viewModel, settings(true, { showMemoryDetails: true }));

    const memory = document.querySelector('[data-geeklens-preview-memory]');
    expect(memory?.querySelector('.geeklens-preview-memory-summary')?.textContent).toBe(
      '32 GB · DDR4-3600',
    );
    expect(document.querySelectorAll('.geeklens-preview-memory-info')).toHaveLength(1);
    expect(memory?.querySelector('.geeklens-preview-memory-bandwidth')?.textContent).toBe(
      'Published bandwidthUp to 200 GB/s',
    );
    expect(document.querySelector('.geeklens-preview-provenance')).toBeNull();
    const tooltip = memory?.querySelector('.geeklens-preview-memory-tooltip');
    expect(tooltip?.textContent).toContain('Calculated bandwidth57.6 GB/s');
    expect(tooltip?.textContent).toContain(
      'Maximum bandwidth calculated from the reported memory rate and bus width; not measured.',
    );
    expect(tooltip?.textContent).toContain('Published bandwidthUp to 200 GB/s');
    expect(tooltip?.textContent).toContain('Exact payload value: 3598 MT/s.');
    const published = tooltip?.querySelector('a.geeklens-preview-memory-source');
    const memoryTable = Array.from(document.querySelectorAll('table.system-table')).find(
      (table) => table.querySelector('th')?.textContent === 'Memory Information',
    );
    const memoryLabel = memoryTable?.querySelector('tbody td');
    expect(memoryLabel?.firstElementChild?.textContent).toBe('Details');
    expect(memoryLabel?.querySelector('[data-geeklens-row-marker="changed"]')).not.toBeNull();
    expect(published?.getAttribute('href')).toBe('https://example.com/source');
    expect(published?.getAttribute('aria-label')).toBe(
      'View source: Example, retrieved 2026-08-01. Opens in a new tab.',
    );
  });

  test('omits the bandwidth line when no bandwidth fact is available', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    document.body.insertAdjacentHTML(
      'beforeend',
      '<table class="system-table"><thead><tr><th>Memory Information</th></tr></thead><tbody><tr><td>Size</td><td>32 GB</td></tr></tbody></table>',
    );
    const viewModel = model('AMD Ryzen 7 5800X3D', 'AMD', 'x86');
    viewModel.memory = [{ kind: 'capacity', value: '32 GB', provenance: 'reported' }];

    renderSingleProcessorContext(viewModel, settings(true, { showMemoryDetails: true }));

    const memory = document.querySelector('[data-geeklens-preview-memory]');
    expect(memory?.querySelector('.geeklens-preview-memory-summary')?.textContent).toBe('32 GB');
    expect(memory?.querySelector('.geeklens-preview-memory-bandwidth')).toBeNull();
  });

  test('falls back to the calculated bandwidth when nothing is published', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    document.body.insertAdjacentHTML(
      'beforeend',
      '<table class="system-table"><thead><tr><th>Memory Information</th></tr></thead><tbody><tr><td>Size</td><td>32 GB</td></tr></tbody></table>',
    );
    const viewModel = model('AMD Ryzen 7 5800X3D', 'AMD', 'x86');
    viewModel.memory = [
      { kind: 'capacity', value: '32 GB', provenance: 'reported' },
      { kind: 'bandwidth', value: '57.6 GB/s', provenance: 'computed' },
    ];

    renderSingleProcessorContext(viewModel, settings(true, { showMemoryDetails: true }));

    expect(document.querySelector('.geeklens-preview-memory-bandwidth')?.textContent).toBe(
      'Calculated bandwidth57.6 GB/s',
    );
  });

  test('preserves comparison memory column order and respects the setting', async () => {
    globalThis.document = await fixture('geekbench7-comparison.html');
    document
      .querySelector('table.system-information tbody')
      ?.insertAdjacentHTML(
        'beforeend',
        '<tr><td>Memory</td><td>Primary native memory</td><td>Baseline native memory</td></tr>',
      );
    const primary = model('AMD CPU', 'AMD', 'x86');
    primary.memory = [{ kind: 'capacity', value: '32 GB', provenance: 'reported' }];
    const baseline = model('Intel CPU', 'Intel', 'x86');
    baseline.memory = [{ kind: 'capacity', value: '64 GB', provenance: 'reported' }];

    renderComparisonProcessorContext([primary, baseline], settings(true));
    let cells = document.querySelectorAll('table.system-information tbody tr:last-child td');
    expect(cells[1]?.textContent).toBe('Primary native memory');
    expect(cells[2]?.textContent).toBe('Baseline native memory');

    renderComparisonProcessorContext(
      [primary, baseline],
      settings(true, { showMemoryDetails: true }),
    );
    cells = document.querySelectorAll('table.system-information tbody tr:last-child td');
    expect(cells[1]?.textContent).toContain('32 GB');
    expect(cells[2]?.textContent).toContain('64 GB');
  });

  test('renders reference averages and signed deltas only when reference data exists', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const viewModel = model('AMD Ryzen 7 5800X3D', 'AMD', 'x86');
    viewModel.cataloguePath = 'https://browser.geekbench.com/processors/amd-ryzen-7-5800x3d';
    viewModel.reference = {
      singleCore: 2000,
      multiCore: 10000,
      generation: 'Geekbench 7',
      minimumUniqueResults: 5,
    };

    renderSingleProcessorContext(viewModel, settings(true, { showReferenceComparison: true }));

    const references = document.querySelectorAll('[data-geeklens-preview-reference]');
    expect(references.length).toBeGreaterThan(0);
    expect(references[0]?.textContent).toContain('avg');
    expect(references[0]?.getAttribute('aria-label')).toContain('Open reference source');
  });

  test('omits unavailable averages when the result generation has no average dataset', async () => {
    globalThis.document = await fixture('geekbench6-single.html');
    const viewModel = model('AMD Ryzen 9 9950X', 'AMD', 'x86');
    viewModel.hasReferenceDataset = false;

    renderSingleProcessorContext(viewModel, settings(true, { showReferenceComparison: true }));

    expect(document.querySelector('[data-geeklens-preview-reference]')).toBeNull();
    expect(document.body.textContent).not.toContain('avg unavailable');
  });

  test('renders processor context against the captured Geekbench 5 table shape', async () => {
    globalThis.document = await fixture('geekbench5-single.html');
    const viewModel = model('AMD Ryzen 7 7700X 8-Core Processor', 'AMD', 'x86');
    viewModel.hasReferenceDataset = false;
    viewModel.hasReportedMemoryTransferRate = false;
    viewModel.frequency = {
      minGHz: 5.365,
      q1GHz: 5.433,
      medianGHz: 5.441,
      meanGHz: 5.439,
      q3GHz: 5.448,
      maxGHz: 5.463,
    };
    viewModel.memory = [{ kind: 'capacity', value: '32 GB', provenance: 'reported' }];

    renderSingleProcessorContext(
      viewModel,
      settings(true, {
        showFrequencyDistribution: true,
        showMemoryDetails: true,
        showReferenceComparison: true,
      }),
    );

    expect(document.querySelector('[data-geeklens-preview-processor]')).not.toBeNull();
    expect(document.querySelector('[data-geeklens-preview-detail="frequency"]')).not.toBeNull();
    expect(document.querySelector('[data-geeklens-preview-memory]')?.textContent).toContain(
      '32 GB',
    );
    expect(
      Array.from(document.querySelectorAll('table.system-table')).find(
        (table) => table.querySelector('th')?.textContent?.trim() === 'Memory Information',
      )?.textContent,
    ).toContain('2993 MHz');
    expect(document.body.textContent).not.toContain('avg unavailable');
  });
});
