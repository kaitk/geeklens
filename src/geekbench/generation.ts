export type GeekbenchGeneration = 6 | 7;

export function parseGeekbenchGeneration(pathname: string): GeekbenchGeneration | null {
  const match = pathname.match(/^\/v(\d+)\/cpu(?:\/|$)/);
  if (!match) return null;

  const generation = Number(match[1]);
  return generation === 6 || generation === 7 ? generation : null;
}

export function resultCacheKey(generation: GeekbenchGeneration, resultId: string): string {
  return `v${generation}:cpu:${resultId}`;
}
