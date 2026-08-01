export interface ProcessorContextViewModel {
  name: string;
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
  reference: {
    singleCore: number;
    multiCore: number;
    generation: 'Geekbench 7';
    minimumUniqueResults?: number;
  } | null;
  disputedL3Cache: { detail: string; source: { url: string; label: string } } | null;
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
