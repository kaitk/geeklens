import {
  type CachedResultContext,
  type ResultContextUpdate,
  resultsCache,
} from '../cache/ResultsCache';
import type { GeekbenchGeneration } from '../geekbench/generation';
import { mergeProcessorLinks, type CanonicalProcessorLinks } from '../geekbench/processorLinks';

export type ResultContextCache = Pick<
  typeof resultsCache,
  'getResultContext' | 'storeResultContext'
>;

export interface ResultContextSource {
  instructionSet: string | null;
  metadata: CachedResultContext['metadata'];
  processorLinks?: CanonicalProcessorLinks;
}

export interface ResultContextLoadRequest {
  cache: ResultContextCache;
  generation: GeekbenchGeneration;
  resultId: string;
  cached?: CachedResultContext | null;
  processorLinks?: CanonicalProcessorLinks;
  loadSource: (
    cached: CachedResultContext | null,
  ) => Promise<ResultContextSource | null> | ResultContextSource | null;
}

/** Shared cache/source/merge policy. Session changes and page-specific fetch
 * choices stay with the adapter-provided source strategy. */
export async function loadResultContext({
  cache,
  generation,
  resultId,
  cached: suppliedCached,
  processorLinks: pageLinks,
  loadSource,
}: ResultContextLoadRequest): Promise<CachedResultContext | null> {
  const cached =
    suppliedCached === undefined
      ? await cache.getResultContext(generation, resultId)
      : suppliedCached;
  const source = await loadSource(cached);
  if (!source) return cached;

  const processorLinks = mergeProcessorLinks(
    mergeProcessorLinks(cached?.processorLinks, source.processorLinks),
    pageLinks,
  );
  const context: CachedResultContext = {
    instructionSet: source.instructionSet,
    metadata: source.metadata,
    processorLinks,
    validity: cached?.validity ?? null,
    lastAccessedAt: cached?.lastAccessedAt ?? Date.now(),
  };
  const update: ResultContextUpdate = {
    instructionSet: context.instructionSet,
    metadata: context.metadata,
    processorLinks,
  };

  if (
    update.metadata ||
    update.instructionSet ||
    processorLinks.processorPath ||
    processorLinks.macPath
  ) {
    await cache.storeResultContext(generation, resultId, update);
  }
  return context;
}
