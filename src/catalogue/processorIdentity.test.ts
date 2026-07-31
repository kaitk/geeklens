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
    expect(resolveProcessorIdentity(await context('64810'))).toMatchObject({
      kind: 'unmatched',
      reason: 'no-match',
      evidence: 'Apple M5 Max',
    });
    expect(resolveProcessorIdentity(await context('58949'))).toMatchObject({
      kind: 'unmatched',
      reason: 'no-match',
      evidence: 'ARM ARMv8',
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
    cached.metadata!.topology.physicalCores = { value: 8, source: 'test' };

    expect(resolveProcessorIdentity(cached)).toMatchObject({
      kind: 'unmatched',
      reason: 'configuration-mismatch',
    });
  });
});
