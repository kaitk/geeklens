import { afterEach, describe, expect, mock, test } from 'bun:test';
import { fetchResultMetadataFromPayload } from './resultPayloadClient';

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
});

describe('fetchResultMetadataFromPayload', () => {
  test('makes one authenticated request and returns normalized metadata', async () => {
    const fetchMock = mock(async () =>
      Response.json({
        document_version: 7,
        platform: { architecture: 'x86_64' },
        metrics: [
          { id: 9, value: 'AMD Example CPU' },
          { id: 20000, value: 'sse2 avx2' },
        ],
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const metadata = await fetchResultMetadataFromPayload(7, '123');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://browser.geekbench.com/v7/cpu/123.gb6', {
      credentials: 'same-origin',
    });
    expect(metadata?.processor.name?.value).toBe('AMD Example CPU');
    expect(metadata?.instructionSets?.value).toBe('sse2 avx2');
  });

  test('returns null for HTTP failures and generation mismatches', async () => {
    console.error = mock(() => {});
    globalThis.fetch = mock(
      async () => new Response(null, { status: 404 }),
    ) as unknown as typeof fetch;
    expect(await fetchResultMetadataFromPayload(7, 'missing')).toBeNull();

    globalThis.fetch = mock(async () =>
      Response.json({ document_version: 6, metrics: [] }),
    ) as unknown as typeof fetch;
    expect(await fetchResultMetadataFromPayload(7, 'wrong-generation')).toBeNull();
  });
});
