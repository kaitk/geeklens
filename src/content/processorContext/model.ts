import type { ProcessorStatus } from '../processorPresentation';

export interface ProcessorContextViewModel {
  /** Exact payload value retained for provenance and identity-related context. */
  name: string;
  /** Compact presentation-only form; never used as catalogue evidence. */
  displayName: string;
  status: ProcessorStatus | null;
  vendor: string;
  vendorKey: string;
  architecture: string;
  cataloguePath: string | null;
  frequency: {
    minGHz: number;
    q1GHz: number;
    medianGHz: number;
    meanGHz: number;
    q3GHz: number;
    maxGHz: number;
  } | null;
  topology: {
    cores: number | null;
    threads: number | null;
    /** Labels exist only when every reported cluster has one unambiguous match. */
    clusters: Array<{ cores: number; maxGHz: number | null; label: string | null }>;
  } | null;
  scaling: { ratio: number; singleCore: number; multiCore: number } | null;
  coreComposition: ProvenanceFact | null;
  /** Whether an average dataset applies to this result generation. */
  hasReferenceDataset: boolean;
  reference: {
    singleCore: number;
    multiCore: number;
    generation: 'Geekbench 7';
    minimumUniqueResults?: number;
  } | null;
  disputedL3Cache: { detail: string; source: { url: string; label: string } } | null;
  hasReportedMemoryTransferRate: boolean;
  memory: MemoryFact[];
}

export interface ProvenanceFact {
  value: string;
  provenance: 'reported' | 'computed' | 'published';
  detail?: string;
  source?: { url: string; label: string };
}

export interface MemoryFact extends ProvenanceFact {
  kind: 'capacity' | 'specification' | 'interface' | 'bandwidth';
}
