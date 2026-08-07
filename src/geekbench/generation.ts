/**
 * Geekbench generations GeekLens supports.
 *
 * Adding a generation here covers URL parsing, content-script routing, and the
 * background action toggle. It deliberately does NOT cover `src/manifest.json`,
 * which is static JSON and must be updated by hand — see docs/architecture.md.
 */
export const SUPPORTED_GENERATIONS = [5, 6, 7] as const;

export type GeekbenchGeneration = (typeof SUPPORTED_GENERATIONS)[number];

const CPU_PATH = /^\/v(\d+)\/cpu(?:\/|$)/;

export function isSupportedGeneration(value: number): value is GeekbenchGeneration {
  return (SUPPORTED_GENERATIONS as readonly number[]).includes(value);
}

export function parseGeekbenchGeneration(pathname: string): GeekbenchGeneration | null {
  const match = pathname.match(CPU_PATH);
  if (!match) return null;

  const generation = Number(match[1]);
  return isSupportedGeneration(generation) ? generation : null;
}

export function isComparisonPath(pathname: string): boolean {
  return parseGeekbenchGeneration(pathname) !== null && /^\/v\d+\/cpu\/compare\//.test(pathname);
}

export function resultCacheKey(generation: GeekbenchGeneration, resultId: string): string {
  return `v${generation}:cpu:${resultId}`;
}

/**
 * Whether a result's reporting Geekbench version records instruction sets at
 * all. Geekbench started reporting them in 6.4, so older results are skipped
 * rather than fetched. Versions are read from the rendered comparison table,
 * so an unparseable value is treated as unsupported.
 */
export function versionSupportsInstructionSets(version: string | null): boolean {
  if (!version) return false;

  // Extract version number (e.g., "Geekbench 6.4.0" -> "6.4.0")
  const match = version.match(/(\d+\.\d+\.\d+)/);
  if (!match) return false;

  const [major, minor] = match[1].split('.').map(Number);
  return major > 6 || (major === 6 && minor >= 4);
}
