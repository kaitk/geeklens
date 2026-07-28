import { describe, expect, test } from 'bun:test';
import { parseGeekbenchGeneration, resultCacheKey } from './generation';

describe('parseGeekbenchGeneration', () => {
  test('recognizes supported CPU result paths', () => {
    expect(parseGeekbenchGeneration('/v6/cpu/11907485')).toBe(6);
    expect(parseGeekbenchGeneration('/v7/cpu/compare/1248')).toBe(7);
  });

  test('rejects unsupported and unrelated paths', () => {
    expect(parseGeekbenchGeneration('/v8/cpu/1')).toBeNull();
    expect(parseGeekbenchGeneration('/v7/gpu/1')).toBeNull();
  });
});

test('resultCacheKey namespaces result IDs by generation', () => {
  expect(resultCacheKey(6, '1248')).not.toBe(resultCacheKey(7, '1248'));
});
