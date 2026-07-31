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
    clusters: null,
    scaling: null,
    reference: null,
    memory: [],
  };
}

function settings(showProcessorSummary: boolean, overrides: Partial<Settings> = {}): Settings {
  return {
    showProcessorSummary,
    showTopologyScaling: false,
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
      'Frequency samples: minimum 4.45 GHz, mean 4.50 GHz, maximum 4.54 GHz.',
    );
    expect(document.querySelectorAll('[data-geeklens-preview-detail="frequency"]')).toHaveLength(1);
  });

  test('renders topology and score scaling without assigning cluster roles', async () => {
    globalThis.document = await fixture('geekbench7-single.html');
    const preview = model('Intel CPU', 'Intel', 'x86');
    preview.clusters = '20 cores · 20 threads · clusters: 8 + 12 cores';
    preview.scaling = 'MT/ST score ratio 7.25×';

    renderSingleProcessorContext(preview, settings(true, { showTopologyScaling: true }));

    const topology = document.querySelector('.geeklens-preview-topology');
    expect(topology?.textContent).toContain('20 cores · 20 threads · clusters: 8 + 12 cores');
    expect(topology?.textContent).toContain('MT/ST score ratio 7.25×');
    expect(topology?.textContent).not.toMatch(/performance|efficiency|P-core|E-core/i);
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

  test('uses readable per-result comparison scales and preserves a missing frequency side', async () => {
    globalThis.document = await fixture('geekbench7-comparison.html');
    const primary = withFrequency(model('AMD Ryzen 7 5800X3D', 'AMD', 'x86'), 4, 5);
    const baseline = withFrequency(model('Apple M1 Pro', 'Apple', 'ARM'), 2, 4);

    renderComparisonProcessorContext(
      [primary, baseline],
      settings(true, { showFrequencyDistribution: true }),
    );

    const charts = document.querySelectorAll('.geeklens-preview-distribution');
    expect(charts[0]?.getAttribute('style')).toContain('--min:0%');
    expect(charts[0]?.getAttribute('style')).toContain('--max:100%');
    expect(charts[1]?.getAttribute('style')).toContain('--min:0%');
    expect(charts[1]?.getAttribute('style')).toContain('--max:100%');

    globalThis.document = await fixture('geekbench7-comparison.html');
    renderComparisonProcessorContext(
      [primary, model('Qualcomm CPU', 'Qualcomm', 'ARM')],
      settings(true, { showFrequencyDistribution: true }),
    );
    const cells = document.querySelectorAll('[data-geeklens-preview-detail="frequency"] td');
    expect(cells[2]?.textContent).toBe('Not available');
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
