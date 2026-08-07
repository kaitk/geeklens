import { describe, expect, test } from 'bun:test';
import {
  SUPPORTED_GENERATIONS,
  isComparisonPath,
  parseGeekbenchGeneration,
  resultCacheKey,
  versionSupportsInstructionSets,
} from './generation';
import { BROWSER_HOST } from './urls';

describe('parseGeekbenchGeneration', () => {
  test('recognizes supported CPU result paths', () => {
    expect(parseGeekbenchGeneration('/v5/cpu/18449406')).toBe(5);
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
    expect(isComparisonPath('/v5/cpu/compare/18449406')).toBe(true);
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
  expect(resultCacheKey(5, '1248')).not.toBe(resultCacheKey(6, '1248'));
  expect(resultCacheKey(6, '1248')).not.toBe(resultCacheKey(7, '1248'));
});

test('manifest URL matches stay synchronized with supported generations', async () => {
  const manifest = await Bun.file(new URL('../manifest.json', import.meta.url)).json();
  const expectedMatches = SUPPORTED_GENERATIONS.map(
    (generation) => `*://${BROWSER_HOST}/v${generation}/cpu/*`,
  );

  expect(manifest.content_scripts).toHaveLength(1);
  expect(manifest.content_scripts[0].matches).toEqual(expectedMatches);
});
