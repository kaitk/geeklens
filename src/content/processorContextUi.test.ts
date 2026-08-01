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
    vendor,
    vendorKey: vendor.toLowerCase(),
    architecture,
    cataloguePath: null,
    frequency: null,
    topology: null,
    scaling: null,
    reference: null,
    memory: [],
  };
}

function settings(showProcessorSummary: boolean, overrides: Partial<Settings> = {}): Settings {
  return {
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
  preview: ProcessorContextViewModel,
  minGHz: number,
  maxGHz: number,
): ProcessorContextViewModel {
  return {
    ...preview,
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
    const preview = model('AMD Ryzen 7 5800X3D', 'AMD', 'x86');

    renderSingleProcessorContext(preview, settings(true));
    renderSingleProcessorContext(preview, settings(true));

    const cell = document
      .querySelectorAll('table.system-table')[1]
      ?.querySelector('tbody tr td:last-child');
    expect(cell?.querySelectorAll('[data-geeklens-preview-processor]')).toHaveLength(1);
    expect(cell?.textContent).toContain('AMD');
    expect(cell?.textContent).toContain('Ryzen 7 5800X3D');
    expect(cell?.textContent).toContain('x86');
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
    const preview = withFrequency(model('AMD Ryzen 7 5800X3D', 'AMD', 'x86'), 4.446, 4.538);
    const enabled = settings(true, { showFrequencyDistribution: true });

    renderSingleProcessorContext(preview, enabled);
    renderSingleProcessorContext(preview, enabled);

    const row = document.querySelector('[data-geeklens-preview-detail="frequency"]');
    expect(row?.previousElementSibling?.firstElementChild?.textContent?.trim()).toBe('Topology');
    expect(row?.textContent).toContain('4.45–4.54 GHz · mean 4.50');
    expect(row?.querySelector('.geeklens-preview-distribution')?.getAttribute('aria-label')).toBe(
      'Frequency samples: minimum 4.45 GHz, median 4.49 GHz, mean 4.50 GHz, maximum 4.54 GHz.',
    );
    expect(document.querySelectorAll('[data-geeklens-preview-detail="frequency"]')).toHaveLength(1);
  });

  test('draws the cluster split proportionally without assigning cluster roles', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const preview = model('Intel CPU', 'Intel', 'x86');
    preview.topology = {
      cores: 20,
      threads: 28,
      clusters: [
        { cores: 8, maxGHz: 5.5 },
        { cores: 12, maxGHz: 4.2 },
      ],
    };

    renderSingleProcessorContext(
      preview,
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

  test('gates the topology row and the scaling note independently', async () => {
    const preview = model('Intel CPU', 'Intel', 'x86');
    preview.topology = { cores: 8, threads: 16, clusters: [] };
    preview.scaling = { ratio: 5.5, singleCore: 2000, multiCore: 11000 };
    const multiCoreTable =
      '<table class="table benchmark-table"><thead><tr><th class="name">Multi-Core Score</th><th class="score">11000</th></tr></thead><tbody></tbody></table>';

    globalThis.document = await fixture('geekbench7-single.html');
    document.body.insertAdjacentHTML('beforeend', multiCoreTable);
    renderSingleProcessorContext(preview, settings(true, { showCoreTopology: true }));
    expect(document.querySelector('.geeklens-preview-topology')).not.toBeNull();
    expect(document.querySelector('[data-geeklens-preview-scaling]')).toBeNull();

    globalThis.document = await fixture('geekbench7-single.html');
    document.body.insertAdjacentHTML('beforeend', multiCoreTable);
    renderSingleProcessorContext(preview, settings(true, { showMultiCoreScaling: true }));
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

  test('prints multi-core scaling beside the multi-core score, once', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    document.body.insertAdjacentHTML(
      'beforeend',
      '<table class="table benchmark-table"><thead><tr class="stacked-heading"><th class="name">Multi-Core Score</th><th class="score">14500</th></tr></thead><tbody></tbody></table>',
    );
    const preview = model('Intel CPU', 'Intel', 'x86');
    preview.scaling = { ratio: 7.25, singleCore: 2000, multiCore: 14500 };
    const enabled = settings(true, { showCoreTopology: true, showMultiCoreScaling: true });

    renderSingleProcessorContext(preview, enabled);
    renderSingleProcessorContext(preview, enabled);

    const notes = document.querySelectorAll('[data-geeklens-preview-scaling]');
    expect(notes).toHaveLength(1);
    expect(notes[0]?.parentElement?.className).toBe('score');
    expect(notes[0]?.firstChild?.textContent).toBe('7.25× single-core');
    expect(notes[0]?.getAttribute('aria-label')).toBe(
      'Multi-core score is 7.25× the single-core score of 2,000.',
    );
    expect(notes[0]?.querySelector('.geeklens-preview-scaling-tooltip')?.textContent).toContain(
      'poor comparison against the core count',
    );
    expect(document.querySelector('.geeklens-preview-topology')?.textContent).not.toContain('7.25');
  });

  test('places comparison scaling in each multi-core column', async () => {
    globalThis.document = await fixture('geekbench7-comparison.html');
    document
      .querySelector('table.comparison-benchmark-table tbody')
      ?.insertAdjacentHTML(
        'afterbegin',
        '<tr><td class="name">Multi-Core Score</td><td class="score">14500</td><td class="score">8000</td><td class="delta"></td></tr>',
      );
    const primary = model('Intel CPU', 'Intel', 'x86');
    primary.scaling = { ratio: 7.25, singleCore: 2000, multiCore: 14500 };
    const baseline = model('AMD CPU', 'AMD', 'x86');
    baseline.scaling = { ratio: 4.5, singleCore: 1778, multiCore: 8000 };

    renderComparisonProcessorContext(
      [primary, baseline],
      settings(true, { showCoreTopology: true, showMultiCoreScaling: true }),
    );

    expect(
      Array.from(document.querySelectorAll('[data-geeklens-preview-scaling]')).map(
        (note) => note.firstChild?.textContent,
      ),
    ).toEqual(['7.25× single-core', '4.50× single-core']);
    const row = document.querySelector('[data-geeklens-preview-detail="topology"]');
    expect(row?.firstElementChild?.textContent).toContain('Topology');
    expect(row?.textContent).not.toContain('×');
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

  test('uses one labeled shared comparison scale and preserves a missing frequency lane', async () => {
    globalThis.document = await fixture('geekbench7-comparison.html');
    const primary = withFrequency(model('AMD Ryzen 7 5800X3D', 'AMD', 'x86'), 4, 5);
    const baseline = withFrequency(model('Apple M1 Pro', 'Apple', 'ARM'), 2, 4);

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
    ).toEqual(['Ryzen 7 5800X3D', 'M1 Pro']);
    expect(row?.querySelector('.geeklens-preview-frequency-axis')?.textContent).toContain(
      'Shared scale2.00 GHz5.00 GHz',
    );
    // The readout stays beside each plot: a lane compressed by the shared scale
    // would otherwise be unreadable without hovering.
    expect(
      Array.from(row?.querySelectorAll('.geeklens-preview-frequency-values') ?? []).map(
        (values) => values.textContent,
      ),
    ).toEqual(['4.00–5.00 GHz · mean 4.60', '2.00–4.00 GHz · mean 3.20']);

    globalThis.document = await fixture('geekbench7-comparison.html');
    renderComparisonProcessorContext(
      [primary, model('Qualcomm Snapdragon X Elite', 'Qualcomm', 'ARM')],
      settings(true, { showFrequencyDistribution: true }),
    );
    const lanes = document.querySelectorAll('.geeklens-preview-frequency-lane');
    expect(lanes[1]?.textContent).toBe('Snapdragon X EliteNot available');
  });

  test('renders one memory fact per line with accessible provenance', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    document.body.insertAdjacentHTML(
      'beforeend',
      '<table class="system-table"><thead><tr><th>Memory Information</th></tr></thead><tbody><tr><td>Size</td><td>32 GB</td></tr></tbody></table>',
    );
    const preview = model('AMD Ryzen 7 5800X3D', 'AMD', 'x86');
    preview.memory = [
      { value: '32 GB', provenance: 'reported' },
      {
        value: 'DDR4-3600',
        provenance: 'reported',
        detail: 'Exact payload value: 3598 MT/s.',
      },
      { value: '57.6 GB/s theoretical peak', provenance: 'computed' },
      {
        value: '200 GB/s published maximum',
        provenance: 'published',
        source: { url: 'https://example.com/source', label: 'Example, retrieved 2026-08-01' },
      },
    ];

    renderSingleProcessorContext(preview, settings(true, { showMemoryDetails: true }));

    const lines = document.querySelectorAll('.geeklens-preview-memory-line');
    expect(lines).toHaveLength(4);
    expect(Array.from(lines).map((line) => line.firstElementChild?.textContent)).toEqual([
      '32 GB',
      'DDR4-3600',
      '57.6 GB/s theoretical peak',
      '200 GB/s published maximum',
    ]);
    const published = lines[3]?.querySelector('a.geeklens-preview-provenance');
    expect(
      lines[1]?.querySelector('.geeklens-preview-provenance')?.getAttribute('aria-label'),
    ).toContain('Exact payload value: 3598 MT/s.');
    const memoryTable = Array.from(document.querySelectorAll('table.system-table')).find(
      (table) => table.querySelector('th')?.textContent === 'Memory Information',
    );
    expect(memoryTable?.querySelector('tbody td')?.textContent).toBe('Details');
    expect(published?.getAttribute('href')).toBe('https://example.com/source');
    expect(published?.getAttribute('aria-label')).toContain(
      'Source: Example, retrieved 2026-08-01. Click to open source.',
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
    primary.memory = [{ value: '32 GB', provenance: 'reported' }];
    const baseline = model('Intel CPU', 'Intel', 'x86');
    baseline.memory = [{ value: '64 GB', provenance: 'reported' }];

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
    const preview = model('AMD Ryzen 7 5800X3D', 'AMD', 'x86');
    preview.cataloguePath = 'https://browser.geekbench.com/processors/amd-ryzen-7-5800x3d';
    preview.reference = {
      singleCore: 2000,
      multiCore: 10000,
      generation: 'Geekbench 7',
      minimumUniqueResults: 5,
    };

    renderSingleProcessorContext(preview, settings(true, { showReferenceComparison: true }));

    const references = document.querySelectorAll('[data-geeklens-preview-reference]');
    expect(references.length).toBeGreaterThan(0);
    expect(references[0]?.textContent).toContain('avg');
    expect(references[0]?.getAttribute('aria-label')).toContain('Open reference source');
  });
});
