import { describe, expect, test } from 'bun:test';
import type { CachedResultContext } from '../cache/ResultsCache';
import { extractResultMetadata } from '../geekbench/resultPayload';
import { buildProcessorContextViewModel } from './processorContextViewModel';

async function context(resultId: string): Promise<CachedResultContext> {
  const payload = await Bun.file(
    new URL(`../geekbench/__fixtures__/${resultId}.gb6.json`, import.meta.url),
  ).json();
  return {
    instructionSet: null,
    metadata: extractResultMetadata(payload, 7),
    processorLinks: { processorPath: null, macPath: null },
    timestamp: 1,
  };
}

describe('buildProcessorContextViewModel', () => {
  test.each([
    ['1248', 'AMD Ryzen 7 5800X3D', 'AMD', 'x86'],
    ['64437', 'Intel(R) Core(TM) Ultra 5 250K Plus', 'Intel', 'x86'],
    ['1262', 'Apple M1 Pro', 'Apple', 'ARM'],
    ['58949', 'ARM ARMv8', 'NVIDIA', 'ARM'],
    ['4469', 'eswin,eic770x', 'Unknown', 'RISC-V'],
  ])('maps real result %s identity without fallback facts', async (id, name, vendor, isa) => {
    const viewModel = buildProcessorContextViewModel(await context(id));

    expect(viewModel).toMatchObject({ name, vendor, architecture: isa });
  });

  test('maps cached MHz statistics to exact GHz display values', async () => {
    const viewModel = buildProcessorContextViewModel(await context('1248'));

    expect(viewModel?.frequency).toMatchObject({
      minGHz: 4.446,
      q1GHz: 4.523,
      medianGHz: 4.5265,
      meanGHz: 4.522717391304348,
      q3GHz: 4.535,
      maxGHz: 4.538,
    });
  });

  test('keeps all-zero frequency captures unavailable', async () => {
    expect(buildProcessorContextViewModel(await context('59394'))?.frequency).toBeNull();
    expect(buildProcessorContextViewModel(await context('4469'))?.frequency).toBeNull();
  });

  test('maps totals, anonymous clusters, and the MT/ST score ratio', async () => {
    const raptorLake = buildProcessorContextViewModel(await context('61473'));
    expect(raptorLake?.clusters).toMatch(/^\d+ cores · \d+ threads · clusters: \d+ \+ \d+ cores$/);
    expect(raptorLake?.scaling).toMatch(/^MT\/ST score ratio \d+\.\d{2}×$/);

    const zen2 = buildProcessorContextViewModel(await context('40339'));
    expect(zen2?.clusters).not.toContain('0');
  });

  test('omits score scaling for missing, zero, and malformed scores', async () => {
    const cached = await context('1248');
    if (!cached.metadata) throw new Error('fixture metadata unavailable');
    cached.metadata.scores.multiCore = null;
    expect(buildProcessorContextViewModel(cached)?.scaling).toBeNull();
    cached.metadata.scores.multiCore = { value: 0, source: 'test' };
    expect(buildProcessorContextViewModel(cached)?.scaling).toBeNull();
    cached.metadata.scores.multiCore = { value: Number.NaN, source: 'test' };
    expect(buildProcessorContextViewModel(cached)?.scaling).toBeNull();
  });

  test('keeps reported and computed DDR memory facts separate', async () => {
    expect(buildProcessorContextViewModel(await context('1248'))?.memory).toEqual([
      { value: '32 GB', provenance: 'reported' },
      {
        value: 'DDR4-3600',
        provenance: 'reported',
        detail: 'Exact payload value: 3598 MT/s.',
      },
      { value: '2 × 64-bit channels', provenance: 'reported' },
      { value: '57.6 GB/s theoretical peak', provenance: 'computed' },
    ]);
    expect(buildProcessorContextViewModel(await context('64437'))?.memory).toContainEqual({
      value: '102.4 GB/s theoretical peak',
      provenance: 'computed',
    });
  });

  test('adds published facts only for exact catalogue matches', async () => {
    const qualcomm = buildProcessorContextViewModel(await context('59394'));
    expect(qualcomm?.memory.map((fact) => [fact.value, fact.provenance])).toEqual([
      ['48 GB', 'reported'],
      ['LPDDR5x-9523', 'published'],
      ['192-bit bus', 'published'],
      ['228 GB/s published bandwidth', 'published'],
    ]);
    expect(qualcomm?.memory[1]?.source).toMatchObject({
      url: expect.stringContaining('Snapdragon-X2-Elite-Product-Brief.pdf'),
      label: 'Qualcomm, retrieved 2026-08-01',
    });

    const apple = buildProcessorContextViewModel(await context('1262'));
    expect(apple?.memory).toContainEqual(
      expect.objectContaining({ value: 'LPDDR5-6400', provenance: 'published' }),
    );
    expect(apple?.memory).toContainEqual(
      expect.objectContaining({ value: '256-bit bus', provenance: 'published' }),
    );
    expect(apple?.memory).toContainEqual(
      expect.objectContaining({
        value: 'Up to 200 GB/s published maximum',
        provenance: 'published',
      }),
    );
    expect(buildProcessorContextViewModel(await context('64810'))?.memory).toEqual([
      { value: '48 GB', provenance: 'reported' },
    ]);
  });

  test('uses an exact system specification when the payload mislabels soldered LPDDR', async () => {
    const cached = await context('1248');
    if (!cached.metadata) throw new Error('fixture metadata unavailable');
    cached.metadata.processor.name = { value: 'AMD Ryzen 7 PRO 6850U', source: 'metric:9' };
    cached.metadata.processor.systemName = {
      value: 'LENOVO 21CQS02000',
      source: 'metric:5',
    };
    cached.metadata.memory.type = { value: 'DDR5 SDRAM', source: 'metric:30' };
    cached.metadata.memory.transferRateMTs = { value: 1596, source: 'metric:87' };
    cached.metadata.memory.channels = { value: 4, source: 'metric:76' };
    cached.metadata.memory.channelWidthBits = 32;
    cached.metadata.memory.theoreticalBandwidthGBs = 25.536;

    const memory = buildProcessorContextViewModel(cached)?.memory ?? [];
    expect(memory).toContainEqual(
      expect.objectContaining({
        value: 'LPDDR5-6400',
        provenance: 'published',
        detail: 'The payload reported DDR5 SDRAM at 1596 MT/s.',
      }),
    );
    expect(memory.some((fact) => fact.value.includes('theoretical peak'))).toBeFalse();
  });

  test('uses only validated cached catalogue links', async () => {
    const cached = await context('1262');
    cached.processorLinks = {
      processorPath: '/processors/apple-m4',
      macPath: '/macs/example-mac',
    };

    expect(buildProcessorContextViewModel(cached)?.cataloguePath).toBe(
      'https://browser.geekbench.com/macs/mac-mini-2024-10c-cpu',
    );
  });

  test('maps generation-matched chart averages only for exact catalogue matches', async () => {
    const amd = buildProcessorContextViewModel(await context('1248'));
    expect(amd?.reference).toMatchObject({
      generation: 'Geekbench 7',
      minimumUniqueResults: 5,
      singleCore: expect.any(Number),
      multiCore: expect.any(Number),
    });
    expect(buildProcessorContextViewModel(await context('58949'))?.reference).toBeNull();
    expect(buildProcessorContextViewModel(await context('18873252'))?.reference ?? null).toBeNull();
  });

  test('omits contexts with missing or malformed metadata', () => {
    expect(buildProcessorContextViewModel(null)).toBeNull();
    expect(
      buildProcessorContextViewModel({
        instructionSet: 'sse2',
        metadata: null,
        processorLinks: { processorPath: null, macPath: null },
        timestamp: 1,
      }),
    ).toBeNull();
  });
});
