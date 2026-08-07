import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { DOMParser, parseHTML } from 'linkedom';
import { resultsCache } from '../cache/ResultsCache';
import {
  combinePayloadValidity,
  isResultValidityFresh,
  loadBrowserResultValidity,
  parseBrowserResultValidity,
  renderComparisonResultValidity,
} from './comparisonValidity';

async function validityFixture(name: string): Promise<Document> {
  const html = await Bun.file(new URL(`__fixtures__/${name}`, import.meta.url)).text();
  return parseHTML(html).document as unknown as Document;
}

beforeEach(() => {
  const { document } = parseHTML(`
    <table class="system-information"><tbody>
      <tr><td>Model</td><td>Primary model</td><td>Baseline model</td></tr>
      <tr><td>Processor</td><td>Primary</td><td>Baseline</td></tr>
    </tbody></table>
    <table class="comparison-benchmark-table"><tbody>
      <tr><td>Single-Core Score</td></tr>
      <tr class="document-graph"><td>Primary System</td></tr>
      <tr class="baseline-graph"><td>Baseline System</td></tr>
    </tbody></table>
    <table class="comparison-benchmark-table"><tbody>
      <tr><td>Multi-Core Score</td></tr>
      <tr class="document-graph"><td>Primary System</td></tr>
      <tr class="baseline-graph"><td>Baseline System</td></tr>
    </tbody></table>
  `);
  globalThis.document = document as unknown as Document;
});

describe('comparison result validity', () => {
  test('reads the exact timer invalidation from the captured Geekbench fixture', async () => {
    const document = await validityFixture('geekbench7-invalid-timers.html');
    expect(parseBrowserResultValidity(document)).toEqual({
      level: 'invalid',
      message: 'This benchmark result is invalid due to an issue with the timers on this system.',
    });
  });

  test('requires a recognizable result page before reporting valid', () => {
    const resultPage = parseHTML(
      '<div class="validation-widget validation-success">Valid</div>',
    ).document;
    const incompletePage = parseHTML('<table class="system-information"></table>').document;
    const challengePage = parseHTML('<main>Enable JavaScript and cookies</main>').document;

    expect(parseBrowserResultValidity(resultPage as unknown as Document)).toEqual({
      level: 'valid',
      message: 'Geekbench marks this benchmark result valid.',
    });
    expect(parseBrowserResultValidity(incompletePage as unknown as Document)).toBeNull();
    expect(parseBrowserResultValidity(challengePage as unknown as Document)).toBeNull();
  });

  test('expires HTML validity after seven days', () => {
    const validity = {
      level: 'valid' as const,
      message: 'Valid result.',
      checkedAt: 1_000,
      source: 'validation-widget-v2' as const,
    };
    expect(isResultValidityFresh(validity, 1_000 + 7 * 24 * 60 * 60 * 1000 - 1)).toBeTrue();
    expect(isResultValidityFresh(validity, 1_000 + 7 * 24 * 60 * 60 * 1000)).toBeFalse();
    expect(isResultValidityFresh({ ...validity, source: undefined } as never, 1_001)).toBeFalse();
  });

  test('revalidates HTTP state and keeps fetched validity when its cache write rejects', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<div class="validation-widget validation-success">Valid</div>'),
    );
    const parser = Object.getOwnPropertyDescriptor(globalThis, 'DOMParser');
    Object.defineProperty(globalThis, 'DOMParser', { configurable: true, value: DOMParser });
    const store = spyOn(resultsCache, 'storeResultContext').mockRejectedValue(
      new Error('cache unavailable'),
    );
    const error = spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(loadBrowserResultValidity(7, '123', null)).resolves.toMatchObject({
        level: 'valid',
        source: 'validation-widget-v2',
      });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://browser.geekbench.com/v7/cpu/123',
        expect.objectContaining({ cache: 'no-cache' }),
      );
      expect(error).toHaveBeenCalledWith(
        'GeekLens: Could not cache validity for result 123',
        expect.any(Error),
      );
    } finally {
      fetchMock.mockRestore();
      store.mockRestore();
      error.mockRestore();
      if (parser) Object.defineProperty(globalThis, 'DOMParser', parser);
      else Reflect.deleteProperty(globalThis, 'DOMParser');
    }
  });

  test('uses payload false only as an additional invalid signal', () => {
    const context = {
      metadata: { benchmark: { valid: { value: false } } },
    } as Parameters<typeof combinePayloadValidity>[1];

    expect(combinePayloadValidity({ level: 'valid', message: 'Valid result.' }, context)).toEqual({
      level: 'invalid',
      message: 'The Geekbench result payload marks this benchmark result invalid.',
    });
    expect(
      combinePayloadValidity({ level: 'invalid', message: 'Browser invalidation.' }, context),
    ).toEqual({ level: 'invalid', message: 'Browser invalidation.' });
  });

  test('preserves BOT warning invalidity from the captured Geekbench fixture', async () => {
    const document = await validityFixture('geekbench6-invalid-bot.html');
    expect(parseBrowserResultValidity(document)).toEqual({
      level: 'warning',
      message:
        'This benchmark result may be invalid due to binary modification tools that can run on this system.',
    });
  });

  test('shows the invalid lane without claiming a failed fetch is valid', () => {
    renderComparisonResultValidity([
      { level: 'invalid', message: 'This benchmark result is invalid due to timer trouble.' },
      null,
    ]);

    const row = document.querySelector('[data-geeklens-result-validity]');
    expect(
      Array.from(row?.querySelectorAll('td') ?? []).map((cell, index) =>
        index === 0
          ? cell.textContent?.trim()
          : cell.querySelector('.geeklens-result-validity-badge')?.firstChild?.textContent,
      ),
    ).toEqual([
      'Result Validity•This row was added by the GeekLens extension.',
      'Invalid',
      'Unavailable',
    ]);
    expect(
      row?.querySelector('.geeklens-preview-badge-amd .geeklens-result-validity-tooltip')
        ?.textContent,
    ).toBe('This benchmark result is invalid due to timer trouble.');
    expect(row?.previousElementSibling?.querySelector('td')?.textContent).toBe('Model');
    expect(row?.querySelectorAll('.geeklens-preview-badge')).toHaveLength(2);
    expect(row?.querySelector('.geeklens-preview-badge-amd')?.firstChild?.textContent).toBe(
      'Invalid',
    );
    expect(row?.querySelector('.geeklens-preview-badge-nvidia')).toBeNull();
    expect(document.querySelectorAll('[data-geeklens-summary-validity]')).toHaveLength(2);
    expect(
      Array.from(document.querySelectorAll('[data-geeklens-summary-validity]')).map(
        (badge) => badge.firstChild?.textContent,
      ),
    ).toEqual(['Invalid', 'Invalid']);
    expect(document.querySelector('tr.baseline-graph [data-geeklens-summary-validity]')).toBeNull();
  });

  test('does not add a row when neither result page reports invalidity', () => {
    renderComparisonResultValidity([{ level: 'valid', message: 'Valid result.' }, null]);
    expect(document.querySelector('[data-geeklens-result-validity]')).toBeNull();
  });

  test('does not add the row twice', () => {
    const values = [
      { level: 'valid', message: 'Valid result.' },
      { level: 'invalid', message: 'Invalid result.' },
    ] as const;
    renderComparisonResultValidity(values);
    renderComparisonResultValidity(values);
    expect(document.querySelectorAll('[data-geeklens-result-validity]')).toHaveLength(1);
    expect(document.querySelector('.geeklens-preview-badge-nvidia')?.firstChild?.textContent).toBe(
      'Valid',
    );
    expect(document.querySelector('.geeklens-preview-badge-amd')?.firstChild?.textContent).toBe(
      'Invalid',
    );
    expect(document.querySelectorAll('[data-geeklens-summary-validity]')).toHaveLength(2);
  });

  test('renders warning invalidity in yellow and puts messages on every row badge', () => {
    renderComparisonResultValidity([
      { level: 'warning', message: 'Possible BOT modification.' },
      { level: 'valid', message: 'Geekbench marks this result valid.' },
    ]);

    const badges = document.querySelectorAll(
      '[data-geeklens-result-validity] .geeklens-result-validity-badge',
    );
    expect(badges[0]?.classList.contains('geeklens-result-validity-warning')).toBeTrue();
    expect(badges[0]?.firstChild?.textContent).toBe('Invalid');
    expect(badges[0]?.querySelector('.geeklens-result-validity-tooltip')?.textContent).toBe(
      'Possible BOT modification.',
    );
    expect(badges[1]?.firstChild?.textContent).toBe('Valid');
    expect(badges[1]?.querySelector('.geeklens-result-validity-tooltip')?.textContent).toBe(
      'Geekbench marks this result valid.',
    );
    expect(
      document
        .querySelector('[data-geeklens-summary-validity]')
        ?.classList.contains('geeklens-result-validity-warning'),
    ).toBeTrue();
  });
});
