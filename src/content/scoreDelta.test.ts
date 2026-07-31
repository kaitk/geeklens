import { describe, expect, test } from 'bun:test';
import { scoreDelta } from './scoreDelta';

describe('scoreDelta', () => {
  test('computes signed absolute and percentage deltas without discarding precision', () => {
    expect(scoreDelta(3123, 3000)).toEqual({ absolute: 123, percentage: 4.1000000000000005 });
    expect(scoreDelta(2850, 3000)).toEqual({ absolute: -150, percentage: -5 });
  });

  test('rejects missing, zero, and malformed reference inputs', () => {
    expect(scoreDelta(null, 3000)).toBeNull();
    expect(scoreDelta(3000, null)).toBeNull();
    expect(scoreDelta(3000, 0)).toBeNull();
    expect(scoreDelta(Number.NaN, 3000)).toBeNull();
  });
});
