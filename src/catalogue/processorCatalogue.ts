/** Reviewed processor facts and the sources that state them.
 *
 * Publisher tiers, the hosts that block automated retrieval, and what to do with
 * a citation that has rotted are in `docs/processor-catalogue-sources.md`. Read
 * it before re-dating a `retrievedOn` or swapping a URL: the date means the page
 * was read and still stated the claim, so moving it forward without re-reading
 * removes the only check these facts have.
 */
import type { ProcessorCatalogueEntry } from './catalogue.types';
import {
  GENERATED_CATALOGUE,
  GENERATED_MAC_CATALOGUE,
  REVIEWED_PROCESSOR_IDENTITIES,
} from './processorIdentities';
import { REVIEWED_CORE_COMPOSITIONS } from './coreCompositions';
import { REVIEWED_L3_CACHE_DISPUTES } from './cacheDisputes';

export type {
  CatalogueSource,
  CoreComposition,
  CoreCompositionGroup,
  GeekbenchScoreReference,
  HardwareSpecification,
  ProcessorCatalogueEntry,
  ReportedValueDispute,
} from './catalogue.types';
export { coreCompositionDescription } from './catalogue.types';
export {
  SYSTEM_MEMORY_SPECIFICATIONS,
  type SystemMemorySpecification,
} from './systemMemorySpecifications';
export { MAC_CATALOGUE_SOURCE, PROCESSOR_CATALOGUE_SOURCE } from './catalogueSources';

/** Reviewed chart identities plus explicitly observed device catalogue links. */
export const PROCESSOR_CATALOGUE: readonly ProcessorCatalogueEntry[] = [
  ...GENERATED_CATALOGUE,
  ...GENERATED_MAC_CATALOGUE,
  ...REVIEWED_PROCESSOR_IDENTITIES,
].map((entry) => {
  const coreComposition = REVIEWED_CORE_COMPOSITIONS[entry.key];
  const l3CacheDispute = REVIEWED_L3_CACHE_DISPUTES[entry.key];
  if (!coreComposition && !l3CacheDispute) return entry;
  return {
    ...entry,
    ...(coreComposition ? { coreComposition } : {}),
    ...(l3CacheDispute ? { l3CacheDispute } : {}),
  };
});
