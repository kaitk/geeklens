import { describe, expect, test } from 'bun:test';
import { withClearedComparisonBaseline } from './comparisonBaseline';

const ok = { ok: true, statusText: 'OK' };

describe('withClearedComparisonBaseline', () => {
  test('clears before work and restores after it completes', async () => {
    const events: string[] = [];

    const result = await withClearedComparisonBaseline(
      7,
      'primary',
      'baseline',
      async () => {
        events.push('work');
        return 'instructions';
      },
      async (url) => {
        events.push(url);
        return ok;
      },
    );

    expect(result).toBe('instructions');
    expect(events).toEqual([
      'https://browser.geekbench.com/v7/cpu/compare/primary/',
      'work',
      'https://browser.geekbench.com/v7/cpu/baseline/baseline/',
    ]);
  });

  test('restores after work rejects', async () => {
    const requests: string[] = [];

    await expect(
      withClearedComparisonBaseline(
        6,
        'primary',
        'baseline',
        async () => {
          throw new Error('result request failed');
        },
        async (url) => {
          requests.push(url);
          return ok;
        },
      ),
    ).rejects.toThrow('result request failed');

    expect(requests).toEqual([
      'https://browser.geekbench.com/v6/cpu/compare/primary/',
      'https://browser.geekbench.com/v6/cpu/baseline/baseline/',
    ]);
  });

  test('attempts restoration when clearing rejects', async () => {
    const requests: string[] = [];

    await expect(
      withClearedComparisonBaseline(
        7,
        'primary',
        'baseline',
        async () => 'unused',
        async (url) => {
          requests.push(url);
          if (url.includes('/compare/')) throw new Error('clear failed');
          return ok;
        },
      ),
    ).rejects.toThrow('clear failed');

    expect(requests).toEqual([
      'https://browser.geekbench.com/v7/cpu/compare/primary/',
      'https://browser.geekbench.com/v7/cpu/baseline/baseline/',
    ]);
  });
});
