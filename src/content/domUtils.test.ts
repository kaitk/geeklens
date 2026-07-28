import { describe, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import { isGeekbenchSignedOut } from '../geekbench/authentication';
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
