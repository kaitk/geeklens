import { describe, expect, test } from 'bun:test';
import type { CachedResultContext } from '../cache/ResultsCache';
import { extractResultMetadata } from '../geekbench/resultPayload';
import {
  PROCESSOR_CATALOGUE,
  PROCESSOR_CATALOGUE_SOURCE,
  MAC_CATALOGUE_SOURCE,
  type ProcessorCatalogueEntry,
} from './processorCatalogue';
import { resolveProcessorIdentity } from './processorIdentity';

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

describe('resolveProcessorIdentity', () => {
  test('bundles the captured Geekbench 7 chart with explicit provenance', () => {
    expect(PROCESSOR_CATALOGUE.length).toBeGreaterThan(250);
    expect(PROCESSOR_CATALOGUE_SOURCE).toEqual({
      url: 'https://browser.geekbench.com/processor-benchmarks',
      retrievedOn: '2026-07-31',
      generation: 7,
      minimumUniqueResults: 5,
    });
    expect(MAC_CATALOGUE_SOURCE).toEqual({
      url: 'https://browser.geekbench.com/macs/mac-mini-2024-12c-cpu',
      retrievedOn: '2026-08-01',
      identityOnly: true,
      scoreGeneration: 'unresolved-conflicting-page-copy',
    });
    expect(PROCESSOR_CATALOGUE.filter((entry) => entry.macPaths.length > 0)).toHaveLength(15);
    expect(
      PROCESSOR_CATALOGUE.find((entry) => entry.key === 'mac-mac-mini-2024-12c-cpu'),
    ).toMatchObject({
      displayName: 'Mac mini (2024) — Apple M4 Pro',
      macPaths: ['/macs/mac-mini-2024-12c-cpu'],
      requiredConfiguration: { physicalCores: 12, gpuCores: 16 },
    });
  });

  test('attaches reviewed Intel hybrid layouts only to exact catalogue SKUs', () => {
    const compositions = Object.fromEntries(
      [
        'intel-core-i9-12900k',
        'intel-core-i7-14700k',
        'intel-core-ultra-9-185h',
        'intel-core-ultra-9-285h',
        'intel-core-ultra-7-258v',
      ].map((key) => [
        key,
        PROCESSOR_CATALOGUE.find((entry) => entry.key === key)?.coreComposition,
      ]),
    );

    expect(compositions).toMatchObject({
      'intel-core-i9-12900k': { description: '8 Performance-cores + 8 Efficient-cores' },
      'intel-core-i7-14700k': { description: '8 Performance-cores + 12 Efficient-cores' },
      'intel-core-ultra-9-185h': {
        description: '6 Performance-cores + 8 Efficient-cores + 2 Low Power Efficient-cores',
      },
      'intel-core-ultra-9-285h': {
        description: '6 Performance-cores + 8 Efficient-cores + 2 Low Power Efficient-cores',
      },
      'intel-core-ultra-7-258v': { description: '4 Performance-cores + 4 Efficient-cores' },
    });
    expect(
      PROCESSOR_CATALOGUE.find((entry) => entry.key === 'intel-core-i5-12400')?.coreComposition,
    ).toBeUndefined();
  });

  test('gives exact Mac and processor paths precedence over aliases', async () => {
    const cached = await context('1248');
    cached.processorLinks = {
      macPath: '/macs/mac-mini-2024-10c-cpu',
      processorPath: '/processors/amd-ryzen-7-5800x3d',
    };

    expect(resolveProcessorIdentity(cached)).toMatchObject({
      kind: 'mac-path',
      catalogueKey: 'mac-mac-mini-2024-10c-cpu',
      evidence: '/macs/mac-mini-2024-10c-cpu',
    });
  });

  test('matches chart names and reviewed payload aliases exactly', async () => {
    expect(resolveProcessorIdentity(await context('1248'))).toMatchObject({
      kind: 'alias',
      catalogueKey: 'amd-ryzen-7-5800x3d',
    });
    expect(resolveProcessorIdentity(await context('52173'))).toMatchObject({
      kind: 'alias',
      catalogueKey: 'intel-core-i9-10900k',
    });
    expect(resolveProcessorIdentity(await context('59394'))).toMatchObject({
      kind: 'alias',
      catalogueKey: 'snapdragon-x2-elite-extreme-x2e-94-100',
    });
  });

  test('returns explicit unmatched results for absent catalogue identities', async () => {
    expect(resolveProcessorIdentity(await context('4469'))).toMatchObject({
      kind: 'unmatched',
      reason: 'no-match',
      evidence: 'eswin,eic770x',
    });
    expect(resolveProcessorIdentity(await context('58949'))).toMatchObject({
      kind: 'unmatched',
      reason: 'no-match',
      evidence: 'ARM ARMv8',
    });
  });

  test('resolves reviewed Apple identities by family alias and exact core count', async () => {
    expect(resolveProcessorIdentity(await context('64810'))).toMatchObject({
      kind: 'alias',
      catalogueKey: 'apple-m5-max-18c',
      evidence: 'Apple M5 Max',
    });
    // The generated Mac entries sharing the `Apple M4 Pro` alias all require GPU
    // core counts that no payload supplies, so exactly one candidate survives.
    expect(resolveProcessorIdentity(await context('64820'))).toMatchObject({
      kind: 'alias',
      catalogueKey: 'apple-m4-pro-12c',
    });
  });

  test('resolves the reviewed Panther Lake result identity', async () => {
    const cached = await context('61473');
    cached.metadata!.processor.name = {
      value: 'Intel(R) Core(TM) Ultra X9 388H',
      source: 'test',
    };
    cached.metadata!.topology.physicalCores = { value: 16, source: 'test' };

    expect(resolveProcessorIdentity(cached)).toMatchObject({
      kind: 'alias',
      catalogueKey: 'intel-core-ultra-x9-388h',
      evidence: 'Intel(R) Core(TM) Ultra X9 388H',
      entry: {
        coreComposition: {
          description: '4 Performance-cores + 8 Efficient-cores + 4 Low Power Efficient-cores',
        },
      },
    });
  });

  test('rejects ambiguous aliases instead of selecting the first entry', async () => {
    const cached = await context('1248');
    const base = PROCESSOR_CATALOGUE.find((entry) => entry.key === 'amd-ryzen-7-5800x3d')!;
    const ambiguous: readonly ProcessorCatalogueEntry[] = [
      base,
      { ...base, key: 'duplicate', pageUrl: `${base.pageUrl}-duplicate` },
    ];

    expect(resolveProcessorIdentity(cached, ambiguous)).toMatchObject({
      kind: 'unmatched',
      reason: 'ambiguous-alias',
    });
  });

  test('requires configured aliases to satisfy their exact constraints', async () => {
    const cached = await context('1262');
    cached.metadata!.processor.name = { value: 'Apple M4', source: 'test' };
    // 8, 9, and 10 are the shipping M4 bins; 6 matches no configured entry.
    cached.metadata!.topology.physicalCores = { value: 6, source: 'test' };

    expect(resolveProcessorIdentity(cached)).toMatchObject({
      kind: 'unmatched',
      reason: 'configuration-mismatch',
    });
  });
});
