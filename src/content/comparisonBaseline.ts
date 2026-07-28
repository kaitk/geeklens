import type { GeekbenchGeneration } from '../geekbench/generation';
import { baselineUrl, comparisonUrl } from '../geekbench/urls';

type BaselineRequest = (
  url: string,
  init: RequestInit,
) => Promise<Pick<Response, 'ok' | 'statusText'>>;

/**
 * Temporarily clears Geekbench's session-wide comparison baseline and always
 * restores it after the supplied work settles.
 */
export async function withClearedComparisonBaseline<T>(
  generation: GeekbenchGeneration,
  primary: string,
  baseline: string,
  work: () => Promise<T>,
  request: BaselineRequest = fetch,
): Promise<T> {
  try {
    const clearResponse = await request(comparisonUrl(generation, primary), {
      credentials: 'same-origin',
    });
    if (!clearResponse.ok) {
      console.warn('GeekLens: clearing baseline failed', clearResponse.statusText);
    }

    return await work();
  } finally {
    await request(baselineUrl(generation, baseline), {
      credentials: 'same-origin',
    })
      .then((response) => {
        if (!response.ok) {
          console.warn('GeekLens: restoring baseline failed', response.statusText);
        }
      })
      .catch((error) => console.error('GeekLens: could not restore comparison baseline', error));
  }
}
