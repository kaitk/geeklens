import { describe, expect, test } from 'bun:test';
import { baselineUrl, comparisonUrl, resultPayloadUrl } from './urls';

describe('Geekbench Browser URLs', () => {
  test('builds the generation-specific endpoints GeekLens depends on', () => {
    expect(resultPayloadUrl(7, '1356')).toBe('https://browser.geekbench.com/v7/cpu/1356.gb6');
    expect(comparisonUrl(6, '18845365')).toBe(
      'https://browser.geekbench.com/v6/cpu/compare/18845365/',
    );
    expect(baselineUrl(6, '18845419')).toBe(
      'https://browser.geekbench.com/v6/cpu/baseline/18845419/',
    );
  });

  test('keeps the payload endpoint distinct from the comparison endpoint', () => {
    expect(resultPayloadUrl(7, '1')).not.toContain('/compare/');
  });

  test('escapes result IDs taken from the page URL', () => {
    expect(resultPayloadUrl(7, 'a/b?c')).toBe('https://browser.geekbench.com/v7/cpu/a%2Fb%3Fc.gb6');
  });
});
