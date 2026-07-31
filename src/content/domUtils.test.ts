import { describe, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import { isGeekbenchSignedOut } from '../geekbench/authentication';
import { getV6SupportedInstructions } from '../isa/benchmarkMap';
import { extractIndividualInstructions } from '../isa/instructions';
import {
  extractBenchmarkName,
  findBenchmarkTables,
  findComparisonScoreRow,
  findInstructionSetValueCell,
  findSystemTableByHeading,
  getComparisonVersions,
} from './domUtils';

async function fixture(name: string): Promise<Document> {
  const html = await Bun.file(new URL(`__fixtures__/${name}`, import.meta.url)).text();
  return parseHTML(html).document as unknown as Document;
}

describe('Geekbench 6 single-result selectors', () => {
  test('reads the instruction-set row that Geekbench 6 renders in page HTML', async () => {
    const document = await fixture('geekbench6-single.html');

    expect(isGeekbenchSignedOut(document)).toBe(true);
    expect(findSystemTableByHeading('CPU Information', document)).not.toBeNull();

    const valueCell = findInstructionSetValueCell(document);
    expect(valueCell).not.toBeNull();
    expect(valueCell?.classList.contains('value')).toBe(true);
    // "L1 Instruction Cache" sits in the same table and must not be matched.
    expect(valueCell?.textContent).not.toContain('KB');
  });

  test('tokenizes the rendered instruction-set string into workload badges', async () => {
    const document = await fixture('geekbench6-single.html');
    const instructions = extractIndividualInstructions(
      findInstructionSetValueCell(document)?.textContent ?? null,
    );

    expect(instructions.has('AVX512-VNNI')).toBe(true);
    expect(instructions.has('AVX-VNNI')).toBe(true);

    const names = (benchmark: string) =>
      getV6SupportedInstructions(benchmark, instructions).map((entry) => entry.name);

    expect(names('File Compression')).toEqual(['AESNI', 'VAES', 'SHANI']);
    expect(names('Photo Library')).toEqual(['AVX-VNNI', 'AVX512-VNNI']);
    expect(names('Navigation')).toEqual([]);
  });

  test('finds the benchmark table and workload names', async () => {
    const document = await fixture('geekbench6-single.html');
    const benchmarkTables = findBenchmarkTables('table.benchmark-table', document);
    expect(benchmarkTables).toHaveLength(1);

    const workloadRows = benchmarkTables[0].querySelectorAll<HTMLTableRowElement>('tr');
    expect(extractBenchmarkName(workloadRows[1])).toBe('File Compression');
    expect(extractBenchmarkName(workloadRows[3])).toBe('Photo Library');
  });
});

describe('Geekbench 7 processor catalogue link fixtures', () => {
  test('preserves explicit Mac and processor links when Geekbench provides them', async () => {
    const document = await fixture('geekbench7-mac-linked.html');

    expect(document.querySelector('a[href$="/macs/mac-mini-2024-10c-cpu"]')?.textContent).toBe(
      'Mac mini (2024)',
    );
    expect(document.querySelector('a[href$="/processors/apple-m4"]')?.textContent).toBe('Apple M4');
  });

  test('preserves the plain-text M5 shape as an expected missing-link case', async () => {
    const document = await fixture('geekbench7-mac-unlinked.html');
    const cpuName = Array.from(document.querySelectorAll('td.system-name')).find(
      (cell) => cell.textContent?.trim() === 'Name',
    )?.nextElementSibling;

    expect(cpuName?.textContent?.trim()).toBe('Apple M5 Max');
    expect(cpuName?.querySelector('a')).toBeNull();
    expect(document.querySelector('a[href*="/macs/"]')).toBeNull();
    expect(document.querySelector('a[href*="/processors/"]')).toBeNull();
  });
});

describe('Geekbench 6 comparison selectors', () => {
  test('finds versions and comparison tables from stored HTML', async () => {
    const document = await fixture('geekbench6-comparison.html');

    expect(isGeekbenchSignedOut(document)).toBe(true);
    expect(getComparisonVersions(document)).toEqual({
      primary: 'Geekbench 6.7.1',
      baseline: 'Geekbench 6.5.0',
    });
    expect(findBenchmarkTables('table.comparison-benchmark-table', document)).toHaveLength(3);
    expect(document.querySelector('table.system-information')).not.toBeNull();
  });

  test('confirms comparison pages carry no instruction-set row', async () => {
    const document = await fixture('geekbench6-comparison.html');
    expect(findInstructionSetValueCell(document)).toBeNull();
  });

  test('maps both graph rows back to their workload row', async () => {
    const document = await fixture('geekbench6-comparison.html');
    const primaryGraph = document.querySelector('tr.scores + tr.document-graph');
    const baselineGraph = primaryGraph?.nextElementSibling;

    expect(baselineGraph?.classList.contains('baseline-graph')).toBe(true);

    const primaryScore = findComparisonScoreRow(primaryGraph!, false);
    const baselineScore = findComparisonScoreRow(baselineGraph!, true);
    expect(primaryScore).toBe(baselineScore);
    expect(extractBenchmarkName(primaryScore!)).toBe('File Compression');
  });
});

describe('summary graph rows are excluded from annotation', () => {
  test.each([['geekbench6-comparison.html'], ['geekbench7-comparison.html']])(
    'ignores the Single-Core/Multi-Core summary rows in %s',
    async (name) => {
      const document = await fixture(name);
      // The first document-graph of each table follows the summary row, which
      // carries no `.scores` class and must not receive workload badges.
      const summaryGraph = document.querySelector('tr.document-graph')!;
      const summaryBaselineGraph = summaryGraph.nextElementSibling!;

      expect(summaryBaselineGraph.classList.contains('baseline-graph')).toBe(true);
      expect(findComparisonScoreRow(summaryGraph, false)).toBeNull();
      expect(findComparisonScoreRow(summaryBaselineGraph, true)).toBeNull();
    },
  );
});

describe('Geekbench 7 single-result selectors', () => {
  test('finds the CPU and benchmark tables from stored HTML', async () => {
    const document = await fixture('geekbench7-single.html');

    expect(isGeekbenchSignedOut(document)).toBe(true);
    expect(findSystemTableByHeading('CPU Information', document)).not.toBeNull();
    const benchmarkTables = findBenchmarkTables('table.benchmark-table', document);
    expect(benchmarkTables).toHaveLength(1);

    const workloadRows = benchmarkTables[0].querySelectorAll<HTMLTableRowElement>('tr');
    expect(extractBenchmarkName(workloadRows[1])).toBe('File Compression');
    expect(extractBenchmarkName(workloadRows[2])).toBe('Photo Library');
  });

  test('reflects that Geekbench 7 omits the instruction-set row', async () => {
    const document = await fixture('geekbench7-single.html');
    expect(findInstructionSetValueCell(document)).toBeNull();
  });
});

describe('Geekbench 7 comparison selectors', () => {
  test('finds versions and comparison tables from stored HTML', async () => {
    const document = await fixture('geekbench7-comparison.html');

    expect(isGeekbenchSignedOut(document)).toBe(true);
    expect(getComparisonVersions(document)).toEqual({
      primary: 'Geekbench 7.0.0',
      baseline: 'Geekbench 7.0.0',
    });
    expect(findBenchmarkTables('table.comparison-benchmark-table', document)).toHaveLength(3);
    expect(document.querySelector('table.system-information')).not.toBeNull();
  });

  test('maps both graph rows back to their workload row', async () => {
    const document = await fixture('geekbench7-comparison.html');
    const primaryGraph = document.querySelector('tr.scores + tr.document-graph');
    const baselineGraph = primaryGraph?.nextElementSibling;

    expect(primaryGraph).not.toBeNull();
    expect(baselineGraph?.classList.contains('baseline-graph')).toBe(true);

    const primaryScore = findComparisonScoreRow(primaryGraph!, false);
    const baselineScore = findComparisonScoreRow(baselineGraph!, true);
    expect(primaryScore).toBe(baselineScore);
    expect(extractBenchmarkName(primaryScore!)).toBe('File Compression');
  });
});
