import { describe, expect, test } from 'bun:test';
import { extractInstructionSetsFromPayload, extractResultMetadata } from './resultPayload';
import { RESULT_PAYLOAD_FIXTURES } from './__fixtures__/manifest';

async function fixture(resultId: string): Promise<unknown> {
  return Bun.file(new URL(`__fixtures__/${resultId}.gb6.json`, import.meta.url)).json();
}

/** Minimal payload carrying only the two identity metrics vendor classification
 * reads, in the priority order the parser applies them. */
function vendorOf(processorName: string, systemName: string): string | undefined {
  return extractResultMetadata(
    {
      document_version: 7,
      platform: { architecture: 'aarch64' },
      metrics: [
        { id: 5, value: systemName },
        { id: 9, value: processorName },
      ],
    },
    7,
  )?.processor.vendor.value;
}

describe('extractInstructionSetsFromPayload', () => {
  test('extracts metric 20000 from a matching Geekbench payload', () => {
    const payload = {
      document_version: 7,
      metrics: [
        { id: 1, value: 'Windows AVX2' },
        { id: 20000, value: 'sse2 aesni avx2' },
      ],
    };

    expect(extractInstructionSetsFromPayload(payload, 7)).toBe('sse2 aesni avx2');
  });

  test('accepts numeric strings but rejects the wrong generation', () => {
    const payload = {
      document_version: '7',
      metrics: [{ id: '20000', value: ' avx2 ' }],
    };

    expect(extractInstructionSetsFromPayload(payload, 7)).toBe('avx2');
    expect(extractInstructionSetsFromPayload(payload, 6)).toBeNull();
  });

  test('rejects missing, empty, and malformed metrics', () => {
    expect(extractInstructionSetsFromPayload({ metrics: [] })).toBeNull();
    expect(extractInstructionSetsFromPayload({ metrics: [{ id: 20000, value: ' ' }] })).toBeNull();
    expect(extractInstructionSetsFromPayload(null)).toBeNull();
  });
});

describe('extractResultMetadata', () => {
  const fixtureCases = Object.entries(RESULT_PAYLOAD_FIXTURES).map(
    ([resultId, { architecture, vendor, cpu, generation }]) => ({
      resultId,
      architecture,
      vendor,
      processorName: cpu,
      generation,
    }),
  );

  test.each(fixtureCases)(
    'normalizes result $resultId as Geekbench $generation $architecture/$vendor',
    async ({ resultId, architecture, vendor, processorName, generation }) => {
      const metadata = extractResultMetadata(await fixture(resultId), generation);

      expect(metadata?.generation).toBe(generation);
      expect(metadata?.architecture.value).toBe(architecture);
      expect(metadata?.processor.vendor.value).toBe(vendor);
      expect(metadata?.processor.name?.value).toBe(processorName);
      expect(metadata?.scores.singleCore?.value).toBeGreaterThan(0);
      expect(metadata?.scores.multiCore?.value).toBeGreaterThan(0);
      expect(metadata?.benchmark.version?.value).toContain(`Geekbench ${generation}`);
    },
  );

  test('uses system identity as a lower-priority vendor fallback', async () => {
    const metadata = extractResultMetadata(await fixture('58949'), 7);

    expect(metadata?.processor.name).toEqual({ value: 'ARM ARMv8', source: 'metric:9' });
    expect(metadata?.processor.vendor).toEqual({ value: 'nvidia', source: 'metric:5' });
  });

  test('classifies mobile SoC vendors without hijacking their host systems', () => {
    expect(vendorOf('Samsung Exynos 2400', 'Samsung SM-S926B')).toBe('samsung');
    expect(vendorOf('MediaTek Dimensity 9400', 'Vivo X200')).toBe('mediatek');

    // A Samsung chassis with a non-Samsung processor must classify by the
    // processor: name candidates outrank the system-name fallback.
    expect(vendorOf('Intel Core Ultra 7 155H', 'SAMSUNG Galaxy Book4 Pro')).toBe('intel');
    expect(vendorOf('Snapdragon(R) X Elite - X1E80100', 'SAMSUNG Galaxy Book4 Edge')).toBe(
      'qualcomm',
    );
  });

  test('extracts DDR4 and DDR5 configuration with generation-aware channel widths', async () => {
    const amd = extractResultMetadata(await fixture('1248'), 7);
    const intel = extractResultMetadata(await fixture('64437'), 7);

    expect(amd?.memory).toMatchObject({
      type: { value: 'DDR4 SDRAM', source: 'metric:30' },
      clockMHz: { value: 1799, source: 'metric:75' },
      transferRateMTs: { value: 3598, source: 'metric:87' },
      channels: { value: 2, source: 'metric:76' },
      channelWidthBits: 64,
    });
    expect(amd?.memory.theoreticalBandwidthGBs).toBeCloseTo(57.568);
    expect(amd?.memory.capacityBytes?.value).toBe(32 * 1024 ** 3);

    expect(intel?.memory).toMatchObject({
      type: { value: 'DDR5 SDRAM', source: 'metric:30' },
      transferRateMTs: { value: 6400, source: 'metric:87' },
      channels: { value: 4, source: 'metric:76' },
      channelWidthBits: 32,
    });
    expect(intel?.memory.theoreticalBandwidthGBs).toBeCloseTo(102.4);

    // Both are 128-bit total: DDR4 as 2 x 64-bit channels, DDR5 as the 4 x
    // 32-bit subchannels a dual-channel DDR5 configuration exposes.
    expect(amd?.memory.busWidthBits).toBe(128);
    expect(intel?.memory.busWidthBits).toBe(128);
    expect(amd?.memory.reportedRateBelowJedecMinimum).toBeFalse();
    expect(intel?.memory.reportedRateBelowJedecMinimum).toBeFalse();
  });

  test('suppresses bandwidth when a reported rate falls below its own JEDEC floor', () => {
    // Soldered LPDDR5 is commonly reported under a desktop DDR5 label at its
    // ~800 MHz command clock, so the stated rate cannot describe DDR5 at all.
    const lpddr5 = extractResultMetadata(
      {
        document_version: 7,
        platform: { architecture: 'x86_64' },
        metrics: [
          { id: 30, value: 'DDR5 SDRAM' },
          { id: 75, value: '798 MHz', ivalue: 798 },
          { id: 76, value: '4', ivalue: 4 },
          { id: 87, value: '1596 MT/s', ivalue: 1596 },
        ],
      },
      7,
    );

    expect(lpddr5?.memory.reportedRateBelowJedecMinimum).toBeTrue();
    expect(lpddr5?.memory.theoreticalBandwidthGBs).toBeNull();
    // Width is a topology fact and stays trustworthy even when the rate is not.
    expect(lpddr5?.memory.busWidthBits).toBe(128);
  });

  test('keeps bandwidth for the lowest rate each DDR generation actually defines', () => {
    const ddr4 = extractResultMetadata(
      {
        document_version: 7,
        platform: { architecture: 'x86_64' },
        metrics: [
          { id: 30, value: 'DDR4 SDRAM' },
          { id: 76, value: '2', ivalue: 2 },
          { id: 87, value: '1600 MT/s', ivalue: 1600 },
        ],
      },
      7,
    );

    expect(ddr4?.memory.reportedRateBelowJedecMinimum).toBeFalse();
    expect(ddr4?.memory.theoreticalBandwidthGBs).toBeCloseTo(25.6);
  });

  test('keeps capacity when detailed memory configuration is absent', async () => {
    const apple = extractResultMetadata(await fixture('64820'), 7);

    expect(apple?.memory.capacityBytes?.value).toBe(24 * 1024 ** 3);
    expect(apple?.memory.type).toBeNull();
    expect(apple?.memory.transferRateMTs).toBeNull();
    expect(apple?.memory.theoreticalBandwidthGBs).toBeNull();
  });

  test('drops zero frequency samples and summarizes usable samples', async () => {
    const amd = extractResultMetadata(await fixture('1248'), 7);
    const qualcomm = extractResultMetadata(await fixture('59394'), 7);
    const riscv = extractResultMetadata(await fixture('4469'), 7);

    expect(amd?.frequency?.statistics).toMatchObject({
      count: 46,
      minMHz: 4446,
      medianMHz: 4526.5,
      maxMHz: 4538,
    });
    expect(amd?.frequency?.statistics.meanMHz).toBeCloseTo(4522.7, 1);
    expect(qualcomm?.frequency).toBeNull();
    expect(riscv?.frequency).toBeNull();
  });

  test('extracts all dynamic core clusters without assigning P/E roles', async () => {
    const google = extractResultMetadata(await fixture('64629'), 7);

    expect(google?.topology).toMatchObject({
      physicalCores: { value: 8, source: 'metric:13' },
      logicalThreads: { value: 8, source: 'metric:12' },
      clusters: [
        {
          index: 1,
          label: { value: '2 Cores @ 2.25 GHz', source: 'metric:46' },
          cores: { value: 2, source: 'metric:47' },
          minMHz: { value: 268, source: 'metric:48' },
          maxMHz: { value: 2250, source: 'metric:49' },
        },
        {
          index: 2,
          cores: { value: 5, source: 'metric:52' },
          minMHz: { value: 177, source: 'metric:53' },
          maxMHz: { value: 3050, source: 'metric:54' },
        },
        {
          index: 3,
          cores: { value: 1, source: 'metric:57' },
          minMHz: { value: 266, source: 'metric:58' },
          maxMHz: { value: 3780, source: 'metric:59' },
        },
      ],
    });
  });

  test('keeps pre-Arrow hybrid clusters and rejects zero-core placeholders', async () => {
    const raptorLake = extractResultMetadata(await fixture('61473'), 7);
    const zen2 = extractResultMetadata(await fixture('40339'), 7);
    const gracemont = extractResultMetadata(await fixture('62440'), 7);

    expect(raptorLake?.topology.clusters.map((cluster) => cluster.cores?.value)).toEqual([8, 16]);
    expect(zen2?.topology.clusters).toEqual([]);
    expect(gracemont?.topology.clusters).toEqual([]);
  });

  test('retains AVX-512 and AMX instruction strings across x86 generations', async () => {
    const iceLake = extractResultMetadata(await fixture('61506'), 7);
    const sapphireRapids = extractResultMetadata(await fixture('62238'), 7);
    const zen5 = extractResultMetadata(await fixture('64509'), 7);

    expect(iceLake?.instructionSets?.value).toContain('avx512-vnni');
    expect(sapphireRapids?.instructionSets?.value).toContain('amx-int8');
    expect(sapphireRapids?.instructionSets?.value).toContain('avx512-fp16');
    expect(zen5?.instructionSets?.value).toContain('avx512-f');
  });

  test('normalizes GHz and MHz through the same frequency parser', () => {
    const metadata = extractResultMetadata({
      document_version: 7,
      metrics: [
        { id: 30, value: 'DDR4 SDRAM' },
        { id: 75, value: '1.8 GHz' },
        { id: 76, value: '2' },
        { id: 87, value: '3600 MT/s' },
        { id: 45, value: '1' },
        { id: 46, value: '4 Cores' },
        { id: 47, value: '4' },
        { id: 48, value: '800MHz' },
        { id: 49, value: '4.2GHz' },
      ],
    });

    expect(metadata?.memory.clockMHz?.value).toBe(1800);
    expect(metadata?.topology.clusters[0]).toMatchObject({
      minMHz: { value: 800, source: 'metric:48' },
      maxMHz: { value: 4200, source: 'metric:49' },
    });
  });

  test('falls back from display name to raw name and then identifier', () => {
    const rawFallback = extractResultMetadata({
      document_version: 7,
      metrics: [
        { id: 8, value: 'Specific Raw CPU' },
        { id: 7, value: 'Generic Identifier' },
        { id: 5, value: 'Generic System' },
      ],
    });
    const identifierFallback = extractResultMetadata({
      document_version: 7,
      metrics: [
        { id: 7, value: 'Identifier Only' },
        { id: 5, value: 'Generic System' },
      ],
    });

    expect(rawFallback?.processor.name).toEqual({ value: 'Specific Raw CPU', source: 'metric:8' });
    expect(identifierFallback?.processor.name).toEqual({
      value: 'Identifier Only',
      source: 'metric:7',
    });
  });

  test('accepts a minimal generation-6 payload', () => {
    const metadata = extractResultMetadata(
      {
        document_version: 6,
        metrics: [{ id: 20000, value: 'sse2 avx2' }],
      },
      6,
    );

    expect(metadata?.generation).toBe(6);
    expect(metadata?.instructionSets?.value).toBe('sse2 avx2');
  });

  test('rejects invalid generations and malformed metric collections', () => {
    expect(extractResultMetadata(null)).toBeNull();
    expect(extractResultMetadata({ document_version: 7, metrics: {} })).toBeNull();
    expect(extractResultMetadata({ document_version: 8, metrics: [] })).toBeNull();
    expect(extractResultMetadata({ document_version: 7, metrics: [] }, 6)).toBeNull();
  });

  test('does not turn unknown, zero, or conflicting values into metadata', () => {
    const metadata = extractResultMetadata({
      document_version: 7,
      platform: { architecture: 'mips64' },
      processor_frequency: { frequencies: [0, -1, 'bad'] },
      metrics: [
        { id: 9, value: 'Generic Processor' },
        { id: 29, value: 'unknown', ivalue: 0 },
        { id: 30, value: 'LPDDR5X' },
        { id: 76, value: '8' },
        { id: 87, value: '8533 MT/s' },
      ],
      score: 0,
      multicore_score: 'bad',
      valid: 'unknown',
    });

    expect(metadata?.architecture.value).toBe('unknown');
    expect(metadata?.processor.vendor.value).toBe('unknown');
    expect(metadata?.frequency).toBeNull();
    expect(metadata?.scores).toEqual({ singleCore: null, multiCore: null });
    expect(metadata?.memory.capacityBytes).toBeNull();
    expect(metadata?.memory.channelWidthBits).toBeNull();
    expect(metadata?.memory.theoreticalBandwidthGBs).toBeNull();
    expect(metadata?.benchmark.valid).toBeNull();
  });
});
