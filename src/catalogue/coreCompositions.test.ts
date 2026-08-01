import { describe, expect, test } from 'bun:test';
import { PROCESSOR_CATALOGUE } from './processorCatalogue';
import { REVIEWED_CORE_COMPOSITIONS } from './coreCompositions';

/** The tier names one catalogue entry records, in the source's own order. */
function labels(key: string): string[] {
  const entry = PROCESSOR_CATALOGUE.find((candidate) => candidate.key === key);
  if (!entry) throw new Error(`no catalogue entry for ${key}`);
  return (entry.coreComposition?.groups ?? []).map((group) => group.label);
}

describe('reviewed core compositions', () => {
  test('uses valid groups attached to existing catalogue identities', () => {
    const catalogueKeys = new Set(PROCESSOR_CATALOGUE.map((entry) => entry.key));

    for (const [key, composition] of Object.entries(REVIEWED_CORE_COMPOSITIONS)) {
      expect(catalogueKeys.has(key)).toBeTrue();
      expect(composition.groups.length).toBeGreaterThan(0);
      expect(new Set(composition.groups.map((group) => group.label)).size).toBe(
        composition.groups.length,
      );

      for (const group of composition.groups) {
        expect(Number.isInteger(group.count)).toBeTrue();
        expect(group.count).toBeGreaterThan(0);
        expect(group.label.trim()).not.toBe('');
      }
    }
  });

  test('keeps M5 Pro and M5 Max out of the earlier M-series terms', () => {
    expect(labels('apple-m5-pro-15c')).toEqual(['super cores', 'performance cores']);
    expect(labels('apple-m5-pro-18c')).toEqual(['super cores', 'performance cores']);
    expect(labels('apple-m5-max-18c')).toEqual(['super cores', 'performance cores']);
    // The base M5 pairs the same top core with efficiency cores instead, so it
    // is not simply the M5 wording applied family-wide.
    expect(labels('apple-m5-10c')).toEqual(['super cores', 'efficiency cores']);
    expect(labels('apple-m4-max-16c')).toEqual(['performance cores', 'efficiency cores']);
    expect(labels('apple-m1-pro-10c')).toEqual(['performance cores', 'efficiency cores']);
  });

  test('names a super core only where Apple ships one', () => {
    const superCored = PROCESSOR_CATALOGUE.filter(
      (entry) =>
        entry.vendor === 'apple' &&
        entry.coreComposition?.groups.some((group) => group.label === 'super cores'),
    ).map((entry) => entry.key);

    expect(superCored.every((key) => key.startsWith('apple-m5'))).toBeTrue();
    expect(superCored).toHaveLength(5);
  });

  test('records Snapdragon X as one uniform group and X2 as a split', () => {
    // X1 is a single Oryon tier, so this states that the part has no split
    // rather than naming one. The lone group cannot label a cluster, which is
    // the correct outcome: there is nothing to tell apart.
    expect(labels('snapdragon-x-elite-x1e-84-100')).toEqual(['Qualcomm Oryon CPU cores']);
    expect(labels('snapdragon-x-plus-x1p-42-100')).toEqual(['Qualcomm Oryon CPU cores']);
    expect(labels('snapdragon-x2-elite-x2e-88-100')).toEqual(['Prime cores', 'Performance cores']);
  });
});
