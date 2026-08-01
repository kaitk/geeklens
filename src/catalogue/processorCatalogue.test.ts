import { describe, expect, test } from 'bun:test';
import { REVIEWED_L3_CACHE_DISPUTES } from './cacheDisputes';
import { REVIEWED_CORE_COMPOSITIONS } from './coreCompositions';
import {
  GENERATED_CATALOGUE,
  GENERATED_MAC_CATALOGUE,
  REVIEWED_PROCESSOR_IDENTITIES,
} from './processorIdentities';
import { PROCESSOR_CATALOGUE } from './processorCatalogue';
import { REVIEWED_HARDWARE } from './processorHardware';

const BASE_IDENTITIES = [
  ...GENERATED_CATALOGUE,
  ...GENERATED_MAC_CATALOGUE,
  ...REVIEWED_PROCESSOR_IDENTITIES,
];

function duplicates(values: readonly string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

describe('assembled processor catalogue integrity', () => {
  test('has unique keys and canonical paths', () => {
    expect(duplicates(PROCESSOR_CATALOGUE.map(({ key }) => key))).toEqual([]);
    expect(duplicates(PROCESSOR_CATALOGUE.flatMap(({ processorPaths }) => processorPaths))).toEqual(
      [],
    );
    expect(duplicates(PROCESSOR_CATALOGUE.flatMap(({ macPaths }) => macPaths))).toEqual([]);
  });

  test.each([
    ['hardware', Object.keys(REVIEWED_HARDWARE)],
    ['core composition', Object.keys(REVIEWED_CORE_COMPOSITIONS)],
    ['L3 dispute', Object.keys(REVIEWED_L3_CACHE_DISPUTES)],
  ] as const)('every reviewed %s key targets a base identity', (_label, keys) => {
    const baseKeys = new Set(BASE_IDENTITIES.map(({ key }) => key));
    expect(keys.filter((key) => !baseKeys.has(key))).toEqual([]);
  });

  test('assembly attaches overlays without creating or dropping identities', () => {
    expect(PROCESSOR_CATALOGUE.map(({ key }) => key)).toEqual(
      BASE_IDENTITIES.map(({ key }) => key),
    );
    for (const entry of PROCESSOR_CATALOGUE) {
      expect(entry.coreComposition).toBe(REVIEWED_CORE_COMPOSITIONS[entry.key]);
      expect(entry.l3CacheDispute).toBe(REVIEWED_L3_CACHE_DISPUTES[entry.key]);
    }
  });
});
