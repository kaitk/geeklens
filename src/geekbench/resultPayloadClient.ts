import type { GeekbenchGeneration } from './generation';
import { extractInstructionSetsFromPayload } from './resultPayload';
import { resultPayloadUrl } from './urls';

/**
 * Fetches a result's `.gb6` payload and returns its instruction-set string.
 *
 * The endpoint requires an authenticated session, and appears to require that
 * no comparison baseline is selected — callers on comparison pages must wrap
 * this in `withClearedBaseline`. Signed-out visitors get a login response,
 * which surfaces here as a non-OK status or a payload without metric 20000.
 *
 * Deliberately sends no long-lived `Cache-Control`: successful lookups are
 * already cached in IndexedDB by result ID, whereas HTTP-caching this URL
 * risks pinning a login redirect against it for the life of the cache entry.
 */
export async function fetchInstructionSetsFromPayload(
  generation: GeekbenchGeneration,
  resultId: string,
): Promise<string | null> {
  const response = await fetch(resultPayloadUrl(generation, resultId), {
    credentials: 'same-origin',
  });

  if (!response.ok) {
    console.error(`GeekLens: Failed to fetch Geekbench ${generation} result ${resultId}`);
    return null;
  }

  return extractInstructionSetsFromPayload(await response.json(), generation);
}
