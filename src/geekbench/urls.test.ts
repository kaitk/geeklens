import { describe, expect, test } from 'bun:test';
import {
  baselineUrl,
  comparisonUrl,
  parseComparisonIds,
  parseResultId,
  resultPageUrl,
  resultPayloadUrl,
} from './urls';

describe('Geekbench Browser URLs', () => {
  test('builds the generation-specific endpoints GeekLens depends on', () => {
    expect(resultPayloadUrl(5, '18449406')).toBe(
      'https://browser.geekbench.com/v5/cpu/18449406.gb5',
    );
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
    expect(resultPayloadUrl(5, 'a/b?c')).toBe('https://browser.geekbench.com/v5/cpu/a%2Fb%3Fc.gb5');
    expect(resultPayloadUrl(7, 'a/b?c')).toBe('https://browser.geekbench.com/v7/cpu/a%2Fb%3Fc.gb6');
  });

  test('builds the rendered result page used for Browser-side validity', () => {
    expect(resultPageUrl(7, '98600')).toBe('https://browser.geekbench.com/v7/cpu/98600');
  });
});

describe('parseResultId', () => {
  test('parses result IDs for every supported generation', () => {
    expect(parseResultId('/v5/cpu/18449406')).toBe('18449406');
    expect(parseResultId('/v6/cpu/11907485/')).toBe('11907485');
    expect(parseResultId('/v7/cpu/opaque%2Fid')).toBe('opaque/id');
  });

  test('rejects missing, malformed, unsupported, and unrelated result paths', () => {
    expect(parseResultId('/v7/cpu/')).toBeNull();
    expect(parseResultId('/v7/cpu/bad%encoding')).toBeNull();
    expect(parseResultId('/v8/cpu/1')).toBeNull();
    expect(parseResultId('/v7/gpu/1')).toBeNull();
    expect(parseResultId('/v7/cpu/compare/1')).toBeNull();
    expect(parseResultId('/v7/cpu/1/extra')).toBeNull();
  });
});

describe('parseComparisonIds', () => {
  test('parses comparison IDs for every supported generation', () => {
    for (const generation of [5, 6, 7]) {
      expect(
        parseComparisonIds(
          new URL(
            `https://browser.geekbench.com/v${generation}/cpu/compare/primary/?baseline=baseline`,
          ),
        ),
      ).toEqual({ primary: 'primary', baseline: 'baseline' });
    }
  });

  test('treats IDs as opaque decoded strings', () => {
    expect(
      parseComparisonIds(
        new URL(
          'https://browser.geekbench.com/v7/cpu/compare/primary%2Fid/?baseline=baseline%2Fid',
        ),
      ),
    ).toEqual({ primary: 'primary/id', baseline: 'baseline/id' });
  });

  test('reads the baseline regardless of query parameter ordering', () => {
    expect(
      parseComparisonIds(
        new URL(
          'https://browser.geekbench.com/v6/cpu/compare/123/?foo=first&baseline=456&bar=last',
        ),
      ),
    ).toEqual({ primary: '123', baseline: '456' });
  });

  test('preserves a valid primary ID when the baseline is missing', () => {
    expect(
      parseComparisonIds(new URL('https://browser.geekbench.com/v7/cpu/compare/123/')),
    ).toEqual({ primary: '123', baseline: null });
  });

  test('rejects missing, malformed, unsupported, and unrelated comparison paths', () => {
    expect(
      parseComparisonIds(new URL('https://browser.geekbench.com/v7/cpu/compare/?baseline=2')),
    ).toEqual({ primary: null, baseline: null });
    expect(
      parseComparisonIds(new URL('https://browser.geekbench.com/v7/cpu/compare/bad%encoding')),
    ).toEqual({ primary: null, baseline: null });
    expect(
      parseComparisonIds(new URL('https://browser.geekbench.com/v8/cpu/compare/1?baseline=2')),
    ).toEqual({ primary: null, baseline: null });
    expect(
      parseComparisonIds(new URL('https://browser.geekbench.com/v7/gpu/compare/1?baseline=2')),
    ).toEqual({ primary: null, baseline: null });
    expect(
      parseComparisonIds(new URL('https://browser.geekbench.com/v7/cpu/1?baseline=2')),
    ).toEqual({ primary: null, baseline: null });
  });
});
