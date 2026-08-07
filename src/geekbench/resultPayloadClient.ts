import type { GeekbenchGeneration } from './generation';
import { extractResultMetadata, type ResultMetadata } from './resultPayload';
import { resultPayloadUrl } from './urls';

/**
 * Fetches and normalizes a result payload once for all metadata users.
 *
 * The endpoint requires an authenticated session and fails while a comparison
 * baseline is selected. Signed-out visitors get a login response, which
 * surfaces here as a non-OK status or a payload without metric 20000.
 *
 * Deliberately sends no long-lived `Cache-Control`: successful lookups are
 * already cached in IndexedDB by result ID, whereas HTTP-caching this URL
 * risks pinning a login redirect against it for the life of the cache entry.
 */
export async function fetchResultMetadataFromPayload(
  generation: GeekbenchGeneration,
  resultId: string,
): Promise<ResultMetadata | null> {
  const response = await fetch(resultPayloadUrl(generation, resultId), {
    credentials: 'same-origin',
  });

  if (!response.ok) {
    console.error(`GeekLens: Failed to fetch Geekbench ${generation} result ${resultId}`);
    return null;
  }

  return extractResultMetadata(await response.json(), generation);
}
