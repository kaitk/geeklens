import { describe, expect, test } from 'bun:test';
import type { CachedResultContext } from '../cache/ResultsCache';
import { extractResultMetadata } from '../geekbench/resultPayload';
import { buildProcessorContextViewModel } from './processorContextViewModel';

async function context(resultId: string, generation: 6 | 7 = 7): Promise<CachedResultContext> {
  const payload = await Bun.file(
    new URL(`../geekbench/__fixtures__/${resultId}.gb6.json`, import.meta.url),
  ).json();
  return {
    instructionSet: null,
    metadata: extractResultMetadata(payload, generation),
    processorLinks: { processorPath: null, macPath: null },
    lastAccessedAt: 1,
  };
}

describe('buildProcessorContextViewModel', () => {
  test.each([
    ['18864843', 'Apple M5 Max', 'Apple', 'ARM'],
    ['18873252', 'AMD Ryzen 9 9950X', 'AMD', 'x86'],
  ])('maps Geekbench 6 payload %s into shared processor context', async (id, name, vendor, isa) => {
    const viewModel = buildProcessorContextViewModel(await context(id, 6));

    expect(viewModel).toMatchObject({
      name,
      vendor,
      architecture: isa,
      frequency: expect.any(Object),
      topology: expect.any(Object),
      scaling: expect.any(Object),
    });
    expect(viewModel?.memory.length).toBeGreaterThan(0);
    expect(viewModel?.referenceGeneration).toBeNull();
    expect(viewModel?.reference).toBeNull();
  });

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

  test('maps totals, clusters, and the multi-core score ratio', async () => {
    const raptorLake = buildProcessorContextViewModel(await context('61473'));
    expect(raptorLake?.topology).toEqual({
      cores: 24,
      threads: 24,
      clusters: [
        { cores: 8, maxGHz: null, label: 'Performance-cores' },
        { cores: 16, maxGHz: null, label: 'Efficient-cores' },
      ],
    });
    expect(raptorLake?.scaling).toMatchObject({ ratio: expect.any(Number) });

    // A lone "0 Cores" cluster describes nothing and is dropped, totals survive.
    const zen2 = buildProcessorContextViewModel(await context('40339'));
    expect(zen2?.topology?.clusters).toEqual([]);
    expect(zen2?.topology?.cores).toBeGreaterThan(0);
  });

  test('orders unnamed clusters fastest first only when every one reports a maximum', async () => {
    // Tensor lists its clusters slowest first; Apple and Intel list theirs
    // fastest first. Reported maxima are the only thing that makes the order
    // comparable between the two. No catalogue entry names Tensor's cores, so
    // this is also the shape a cluster stays in when nothing can label it.
    expect(buildProcessorContextViewModel(await context('64629'))?.topology).toEqual({
      cores: 8,
      threads: 8,
      clusters: [
        { cores: 1, maxGHz: 3.78, label: null },
        { cores: 5, maxGHz: 3.05, label: null },
        { cores: 2, maxGHz: 2.25, label: null },
      ],
    });

    // Same part, stripped of the identity that names it: with no maxima to sort
    // on and no labels to order by, the payload's own order stands.
    const unnamed = await context('64820');
    unnamed.metadata!.processor.name = { value: 'Unlisted CPU', source: 'test' };
    unnamed.metadata!.processor.rawName = null;
    unnamed.metadata!.processor.identifier = null;
    expect(buildProcessorContextViewModel(unnamed)?.topology?.clusters).toEqual([
      { cores: 8, maxGHz: null, label: null },
      { cores: 4, maxGHz: null, label: null },
    ]);
  });

  test('names core types only from an exact catalogue match', async () => {
    // The payload cannot supply core types, so this is a published fact carrying
    // the source's own wording. M4 Pro's 8 + 4 split agrees with the clusters the
    // same fixture reports, which is the only cross-check available.
    expect(buildProcessorContextViewModel(await context('64820'))?.coreComposition).toEqual({
      value: '8 performance cores + 4 efficiency cores',
      provenance: 'published',
      source: {
        url: 'https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/',
        label: 'Apple, retrieved 2026-08-01',
      },
    });
    expect(buildProcessorContextViewModel(await context('1262'))?.coreComposition).toMatchObject({
      value: '8 performance cores + 2 efficiency cores',
      provenance: 'published',
    });

    // The 13900K states the case the payload cannot: its two reported clusters
    // are 8 and 16, and the larger one is the Efficient-core group.
    const raptorLake = buildProcessorContextViewModel(await context('61473'));
    expect(raptorLake?.coreComposition?.value).toBe('8 Performance-cores + 16 Efficient-cores');
    expect(raptorLake?.topology?.clusters).toEqual([
      { cores: 8, maxGHz: null, label: 'Performance-cores' },
      { cores: 16, maxGHz: null, label: 'Efficient-cores' },
    ]);

    const pantherLake = await context('61473');
    pantherLake.metadata!.processor.name = {
      value: 'Intel(R) Core(TM) Ultra X9 388H',
      source: 'test',
    };
    pantherLake.metadata!.topology.physicalCores = { value: 16, source: 'test' };
    expect(buildProcessorContextViewModel(pantherLake)?.coreComposition).toMatchObject({
      value: '4 Performance-cores + 8 Efficient-cores + 4 Low Power Efficient-cores',
      source: {
        url: 'https://en.wikipedia.org/wiki/Panther_Lake_(microprocessor)',
      },
    });

    // Matched entries without a reviewed composition, and unmatched results, both
    // leave the topology row exactly as the payload described it.
    expect(buildProcessorContextViewModel(await context('1248'))?.coreComposition).toBeNull();
    expect(buildProcessorContextViewModel(await context('58949'))?.coreComposition).toBeNull();
  });

  test('names Apple and Qualcomm clusters from their own reviewed splits', async () => {
    // M5 Max is the generation whose tier names changed: Apple pairs super cores
    // with a second tier it also calls performance cores, which an M4 Pro
    // performance core is not. The fixture reports 6 and 12, so both are named.
    const appleM5Max = buildProcessorContextViewModel(await context('64810'));
    expect(appleM5Max?.topology?.clusters).toEqual([
      { cores: 6, maxGHz: null, label: 'super cores' },
      { cores: 12, maxGHz: null, label: 'performance cores' },
    ]);
    expect(appleM5Max?.coreComposition).toEqual({
      value: '6 super cores + 12 performance cores',
      provenance: 'published',
      source: {
        url: 'https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/',
        label: 'Apple, retrieved 2026-08-01',
      },
    });

    // Qualcomm's X2 brief states the split as prime and performance cores, which
    // are its own tier names and not the Oryon generation before it. This part
    // reports its 12-core cluster first, as the brief lists it.
    const snapdragonX2 = buildProcessorContextViewModel(await context('59394'));
    expect(snapdragonX2?.topology?.clusters).toEqual([
      { cores: 12, maxGHz: null, label: 'Prime cores' },
      { cores: 6, maxGHz: null, label: 'Performance cores' },
    ]);
    expect(snapdragonX2?.coreComposition).toMatchObject({
      value: '12 Prime cores + 6 Performance cores',
      source: { label: 'Qualcomm, retrieved 2026-08-01' },
    });
  });

  test('states a uniform part as a sentence and leaves its clusters unnamed', async () => {
    // Snapdragon X1 resolves by the catalogue link on the result page rather
    // than by processor name: Geekbench reports these in a `Snapdragon(R) X
    // Elite - X1E80100 - ...` form that no reviewed alias covers.
    const cached = await context('59394');
    cached.processorLinks = {
      processorPath: '/processors/snapdragon-x-elite-x1e-80-100',
      macPath: null,
    };
    cached.metadata!.topology.physicalCores = { value: 12, source: 'test' };
    cached.metadata!.topology.clusters = [4, 4, 4].map((cores, index) => ({
      index: index + 1,
      label: null,
      cores: { value: cores, source: 'test' },
      minMHz: null,
      maxMHz: null,
    }));

    const viewModel = buildProcessorContextViewModel(cached);
    expect(viewModel?.coreComposition?.value).toBe('12 Qualcomm Oryon CPU cores');
    // One group cannot be assigned to three clusters, and there is nothing to
    // tell apart in a uniform design anyway.
    expect(viewModel?.topology?.clusters.map((cluster) => cluster.label)).toEqual([
      null,
      null,
      null,
    ]);
  });

  describe('matching reported clusters to named core groups', () => {
    /** The 13900K fixture, re-reported as `name` with the given cluster sizes. */
    async function reported(name: string, sizes: readonly number[]) {
      const cached = await context('61473');
      cached.metadata!.processor.name = { value: name, source: 'test' };
      cached.metadata!.topology.physicalCores = {
        value: sizes.reduce((sum, size) => sum + size, 0),
        source: 'test',
      };
      cached.metadata!.topology.clusters = sizes.map((cores, index) => ({
        index: index + 1,
        label: null,
        cores: { value: cores, source: 'test' },
        minMHz: null,
        maxMHz: null,
      }));
      return buildProcessorContextViewModel(cached)?.topology?.clusters ?? [];
    }

    const RAPTOR_LAKE_I9 = 'Intel Core i9-13900K';

    test('names both groups when the reported sizes match the part as it ships', async () => {
      expect(await reported(RAPTOR_LAKE_I9, [8, 16])).toMatchObject([
        { cores: 8, label: 'Performance-cores' },
        { cores: 16, label: 'Efficient-cores' },
      ]);
    });

    test('names groups from a count the catalogue only bounds', async () => {
      // Cores disabled in firmware to emulate a smaller part: 12 cannot be the
      // 8-core Performance group, so the assignment stays forced and the labels
      // carry the reported counts rather than the catalogue's.
      expect(await reported(RAPTOR_LAKE_I9, [8, 12])).toMatchObject([
        { cores: 8, label: 'Performance-cores' },
        { cores: 12, label: 'Efficient-cores' },
      ]);
      expect(await reported(RAPTOR_LAKE_I9, [2, 16])).toMatchObject([
        { cores: 2, label: 'Performance-cores' },
        { cores: 16, label: 'Efficient-cores' },
      ]);
    });

    test('orders named clusters by the source, whichever order they arrive in', async () => {
      expect(await reported(RAPTOR_LAKE_I9, [16, 8])).toMatchObject([
        { cores: 8, label: 'Performance-cores' },
        { cores: 16, label: 'Efficient-cores' },
      ]);
    });

    test('leaves clusters unnamed when more than one assignment fits', async () => {
      // Both groups of a 12900K are 8 cores, so nothing in the reported sizes
      // says which cluster is which.
      expect(await reported('Intel Core i9-12900K', [8, 8])).toMatchObject([
        { cores: 8, label: null },
        { cores: 8, label: null },
      ]);
      // The same 13900K split once enough E-cores are off to tie the two.
      expect(await reported(RAPTOR_LAKE_I9, [8, 8])).toMatchObject([
        { cores: 8, label: null },
        { cores: 8, label: null },
      ]);
    });

    test('leaves clusters unnamed when no assignment fits at all', async () => {
      // 20 exceeds both groups, so the identity and the report disagree about
      // what this part is; naming either cluster would state something false.
      expect(await reported(RAPTOR_LAKE_I9, [20, 4])).toMatchObject([
        { cores: 20, label: null },
        { cores: 4, label: null },
      ]);
    });

    test('leaves clusters unnamed when the report and the source disagree on group count', async () => {
      // Three reported clusters against the two groups Raptor Lake is described
      // in: there is no assignment to be unique about.
      expect(await reported(RAPTOR_LAKE_I9, [8, 8, 8])).toMatchObject([
        { cores: 8, label: null },
        { cores: 8, label: null },
        { cores: 8, label: null },
      ]);
    });

    test('names all three groups of a part described in three', async () => {
      expect(await reported('Intel Core Ultra 9 185H', [6, 8, 2])).toMatchObject([
        { cores: 6, label: 'Performance-cores' },
        { cores: 8, label: 'Efficient-cores' },
        { cores: 2, label: 'Low Power Efficient-cores' },
      ]);
    });
  });

  test('carries the L3 dispute for a matched asymmetric X3D part only', async () => {
    // The bundled 9950X3D reports a single "16 Cores" cluster and gives no
    // per-die cache split, so this objection can only come from the catalogue.
    const dispute = buildProcessorContextViewModel(await context('64509'))?.disputedL3Cache;
    expect(dispute).toEqual({
      detail:
        'Geekbench multiplies one die’s L3 by the die count, so this total is likely wrong: the two dies differ. This processor is published as 128 MB.',
      source: {
        url: 'https://en.wikipedia.org/wiki/Zen_5',
        label: 'Wikipedia, retrieved 2026-08-01',
      },
    });
    // Which die gets read is not stable: the same SKU has been observed as both
    // `96.0 MB x 2` and `32.0 MB x 2`, so the wording may not name one.
    expect(dispute?.detail).not.toMatch(/larger|smaller|96 MB on|32 MB on/);

    // Single-die X3D reports its L3 correctly, and an unmatched result has no
    // entry to dispute anything with.
    expect(buildProcessorContextViewModel(await context('1248'))?.disputedL3Cache).toBeNull();
    expect(buildProcessorContextViewModel(await context('58949'))?.disputedL3Cache).toBeNull();
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
      { kind: 'capacity', value: '32 GB', provenance: 'reported' },
      {
        kind: 'specification',
        value: 'DDR4-3600',
        provenance: 'reported',
        detail: 'Exact payload value: 3598 MT/s.',
      },
      {
        kind: 'interface',
        value: '128-bit bus',
        provenance: 'reported',
        detail: 'Reported as 2 × 64-bit channels.',
      },
      {
        kind: 'bandwidth',
        value: '57.6 GB/s',
        provenance: 'computed',
        detail:
          'Maximum bandwidth calculated from the reported memory rate and bus width; not measured.',
      },
    ]);
    expect(buildProcessorContextViewModel(await context('64437'))?.memory).toContainEqual(
      expect.objectContaining({
        kind: 'bandwidth',
        value: '102.4 GB/s',
        provenance: 'computed',
      }),
    );
  });

  test('adds published facts only for exact catalogue matches', async () => {
    const qualcomm = buildProcessorContextViewModel(await context('59394'));
    expect(qualcomm?.memory.map((fact) => [fact.value, fact.provenance])).toEqual([
      ['48 GB', 'reported'],
      ['LPDDR5x-9523', 'published'],
      ['192-bit bus', 'published'],
      ['228 GB/s', 'published'],
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
        value: 'Up to 200 GB/s',
        provenance: 'published',
      }),
    );
    // Apple publishes unified-memory bandwidth per chip but not type, rate, or
    // bus width, so a matched Apple identity adds exactly those two facts.
    const appleM5Max = buildProcessorContextViewModel(await context('64810'));
    expect(appleM5Max?.memory.map((fact) => [fact.value, fact.provenance])).toEqual([
      ['48 GB', 'reported'],
      ['Unified memory', 'published'],
      ['Up to 614 GB/s', 'published'],
    ]);

    // Absent identities still add nothing beyond the reported capacity.
    expect(buildProcessorContextViewModel(await context('58949'))?.memory).toEqual([
      { kind: 'capacity', value: '121.7 GB', provenance: 'reported' },
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
    expect(memory.some((fact) => fact.kind === 'bandwidth')).toBeFalse();
  });

  test('flags a self-contradicting rate instead of printing it for unlisted systems', async () => {
    // Same payload shape as the reviewed Lenovo capture but with no exact system
    // entry, which is the common case for soldered-LPDDR laptops.
    const cached = await context('1248');
    if (!cached.metadata) throw new Error('fixture metadata unavailable');
    cached.metadata.processor.name = { value: 'Unlisted LPDDR5 laptop', source: 'metric:9' };
    cached.metadata.memory.type = { value: 'DDR5 SDRAM', source: 'metric:30' };
    cached.metadata.memory.transferRateMTs = { value: 1596, source: 'metric:87' };
    cached.metadata.memory.channels = { value: 4, source: 'metric:76' };
    cached.metadata.memory.channelWidthBits = 32;
    cached.metadata.memory.busWidthBits = 128;
    cached.metadata.memory.reportedRateBelowJedecMinimum = true;
    cached.metadata.memory.theoreticalBandwidthGBs = null;

    const memory = buildProcessorContextViewModel(cached)?.memory ?? [];
    expect(memory.map((fact) => fact.value)).toEqual([
      '32 GB',
      'DDR5-class (rate unverified)',
      '128-bit bus',
    ]);
    // The old behaviour printed a confident 25.5 GB/s here, understating the
    // real figure by exactly the LPDDR5 4:1 WCK:CK ratio.
    expect(memory.some((fact) => fact.kind === 'bandwidth')).toBeFalse();
    expect(memory[1]?.detail).toContain('1596 MT/s');
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
    expect(amd?.referenceGeneration).toBe('Geekbench 7');
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
        lastAccessedAt: 1,
      }),
    ).toBeNull();
  });
});
