import type { ProcessorArchitecture, ProcessorVendor } from '../geekbench/resultPayload';

export interface ProcessorCatalogueEntry {
  key: string;
  displayName: string;
  vendor: ProcessorVendor;
  architecture: ProcessorArchitecture;
  pageUrl: string;
  processorPaths: readonly string[];
  macPaths: readonly string[];
  aliases: readonly string[];
  requiredConfiguration?: {
    physicalCores?: number;
    gpuCores?: number;
    modelIdentifier?: string;
  };
  hardware?: HardwareSpecification;
  coreComposition?: CoreComposition;
  l3CacheDispute?: ReportedValueDispute;
  scoreReferences?: readonly GeekbenchScoreReference[];
}

/** A value Geekbench reports that a reviewed source contradicts.
 *
 * The reported value is left exactly as Geekbench printed it and marked, rather
 * than replaced: the disagreement is the fact worth stating, and a quietly
 * substituted number would be indistinguishable from a measurement. `detail`
 * says what is wrong and what the source states instead. */
export interface ReportedValueDispute {
  detail: string;
  source: CatalogueSource;
}

/** One named group of cores, at the count the source states for the full part.
 *
 * `count` is nominal, so it is an upper bound rather than an observation: a
 * result may report fewer cores in this group when some are disabled. `label` is
 * recorded in the vendor's own wording and is never normalized across vendors.
 * Zen 5c is the case that makes this a correctness rule rather than a style
 * choice: it is the same microarchitecture at the same IPC as Zen 5, differing
 * in peak clock and L3 per CCX, so filing it under "efficiency" would state
 * something false. Intel's Low Power Efficient-cores are likewise not its
 * Efficient-cores, and Apple uses neither vocabulary.
 *
 * Within one vendor the wording is settled to the terms that vendor's current
 * range uses, rather than reproducing every phrasing its older announcements
 * happened to carry. Apple is the only range this applies to today: see
 * `APPLE_CORE_TIERS` for the three terms it is held to and what that costs. */
export interface CoreCompositionGroup {
  count: number;
  label: string;
}

/** What kinds of core a heterogeneous processor holds.
 *
 * The payload cannot supply this. Its per-cluster label only ever restates a
 * size (`6 Cores`), and neither cluster size nor cluster order identifies a
 * role: the 13900K's larger cluster is its E-cores, and vendors list clusters
 * fastest-first or slowest-first with no consistency between them.
 *
 * Groups are held apart rather than as one sentence so a reported cluster can be
 * matched to the group it belongs to. They stay in the source's own order, which
 * is the order they are presented in.
 */
export interface CoreComposition {
  groups: readonly CoreCompositionGroup[];
  source: CatalogueSource;
}

/** The composition as a sentence, used wherever the groups cannot be attached to
 * individual clusters. */
export function coreCompositionDescription(composition: CoreComposition): string {
  return composition.groups.map((group) => `${group.count} ${group.label}`).join(' + ');
}

export interface GeekbenchScoreReference {
  generation: 7;
  singleCore: number;
  multiCore: number;
  minimumUniqueResults: number;
}

export interface CatalogueSource {
  url: string;
  retrievedOn: string;
  publisher: 'Apple' | 'Lenovo' | 'Notebookcheck' | 'Qualcomm' | 'Wikipedia';
}

export interface HardwareSpecification {
  memoryType?: string;
  transferRateMTs?: number;
  busWidthBits?: number;
  bandwidthGBs: number;
  bandwidthQualifier: 'published' | 'up-to';
  source: CatalogueSource;
}
