import type { GeekbenchGeneration } from './generation';

export const BROWSER_HOST = 'browser.geekbench.com';

export const BROWSER_ORIGIN = `https://${BROWSER_HOST}`;

/**
 * Geekbench Browser URL shapes. These are an external interface: they are not
 * documented and are only known from observed behaviour, so keep every literal
 * in this file rather than inlining it at the call sites.
 *
 * See docs/geekbench7-sources.md for the evidence behind the payload endpoint.
 */

/**
 * Undocumented per-result JSON payload. Geekbench 5 uses its own `.gb5`
 * extension; Geekbench 6 and 7 both use `.gb6`. Geekbench 7 exposes the
 * detected instruction sets as metric 20000 here and nowhere in page HTML.
 * Requires an authenticated session, and appears to require that no comparison
 * baseline is selected.
 */
export function resultPayloadUrl(generation: GeekbenchGeneration, resultId: string): string {
  const extension = generation === 5 ? 'gb5' : 'gb6';
  return `${BROWSER_ORIGIN}/v${generation}/cpu/${encodeURIComponent(resultId)}.${extension}`;
}

/**
 * Comparison page for a single result. Requesting it without a baseline clears
 * the session's selected baseline.
 */
export function comparisonUrl(generation: GeekbenchGeneration, resultId: string): string {
  return `${BROWSER_ORIGIN}/v${generation}/cpu/compare/${encodeURIComponent(resultId)}/`;
}

/** Selects `resultId` as the session's comparison baseline. */
export function baselineUrl(generation: GeekbenchGeneration, resultId: string): string {
  return `${BROWSER_ORIGIN}/v${generation}/cpu/baseline/${encodeURIComponent(resultId)}/`;
}
