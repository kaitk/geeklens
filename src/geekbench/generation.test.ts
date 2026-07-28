import { describe, expect, test } from 'bun:test';
import {
  isComparisonPath,
  parseGeekbenchGeneration,
  resultCacheKey,
  versionSupportsInstructionSets,
} from './generation';

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

describe('isComparisonPath', () => {
  test('routes comparison pages to the comparison adapter', () => {
    expect(isComparisonPath('/v6/cpu/compare/18845365')).toBe(true);
    expect(isComparisonPath('/v7/cpu/compare/1248')).toBe(true);
  });

  test('leaves single results and unsupported generations to fall through', () => {
    expect(isComparisonPath('/v7/cpu/1248')).toBe(false);
    expect(isComparisonPath('/v8/cpu/compare/1')).toBe(false);
    expect(isComparisonPath('/v7/gpu/compare/1')).toBe(false);
  });
});

describe('versionSupportsInstructionSets', () => {
  test('accepts Geekbench 6.4 and newer', () => {
    expect(versionSupportsInstructionSets('Geekbench 6.4.0')).toBe(true);
    expect(versionSupportsInstructionSets('Geekbench 6.7.1')).toBe(true);
    expect(versionSupportsInstructionSets('Geekbench 7.0.0')).toBe(true);
  });

  test('rejects older releases and unreadable values', () => {
    expect(versionSupportsInstructionSets('Geekbench 6.3.0')).toBe(false);
    expect(versionSupportsInstructionSets('Geekbench 6')).toBe(false);
    expect(versionSupportsInstructionSets(null)).toBe(false);
  });
});

test('resultCacheKey namespaces result IDs by generation', () => {
  expect(resultCacheKey(6, '1248')).not.toBe(resultCacheKey(7, '1248'));
});
