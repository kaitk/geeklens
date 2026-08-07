import { describe, expect, test } from 'bun:test';
import { needsComparisonResultFetch } from './comparisonFetch';

describe('needsComparisonResultFetch', () => {
  test('never fetches signed-out Geekbench 5 comparisons', () => {
    for (const version of ['Geekbench 5.4.5', null]) {
      expect(
        needsComparisonResultFetch({
          generation: 5,
          signedOut: true,
          hasMetadata: false,
          hasInstructions: false,
          version,
        }),
      ).toBeFalse();
    }
  });

  test('retains the signed-out Geekbench 6 HTML fallback only when usable', () => {
    expect(
      needsComparisonResultFetch({
        generation: 6,
        signedOut: true,
        hasMetadata: false,
        hasInstructions: false,
        version: 'Geekbench 6.7.1',
      }),
    ).toBeTrue();
    expect(
      needsComparisonResultFetch({
        generation: 6,
        signedOut: true,
        hasMetadata: false,
        hasInstructions: false,
        version: 'Geekbench 6.3.0',
      }),
    ).toBeFalse();
  });

  test('loads missing authenticated metadata without refetching cache hits', () => {
    expect(
      needsComparisonResultFetch({
        generation: 5,
        signedOut: false,
        hasMetadata: false,
        hasInstructions: false,
        version: 'Geekbench 5.4.5',
      }),
    ).toBeTrue();
    expect(
      needsComparisonResultFetch({
        generation: 7,
        signedOut: false,
        hasMetadata: true,
        hasInstructions: true,
        version: 'Geekbench 7.0.0',
      }),
    ).toBeFalse();
  });
});
