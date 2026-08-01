import type { CachedResultContext } from '../cache/ResultsCache';
import type {
  ProcessorArchitecture,
  ProcessorVendor,
  ResultMetadata,
} from '../geekbench/resultPayload';
import type { ProcessorContextViewModel } from './processorContextUi';
import { resolveProcessorIdentity } from '../catalogue/processorIdentity';
import type { ProcessorIdentityMatch } from '../catalogue/processorIdentity';
import { SYSTEM_MEMORY_SPECIFICATIONS } from '../catalogue/processorCatalogue';

const ARCHITECTURE_LABELS: Record<ProcessorArchitecture, string> = {
  x86: 'x86',
  arm: 'ARM',
  'risc-v': 'RISC-V',
  unknown: 'Unknown',
};

const VENDOR_LABELS: Record<ProcessorVendor, string> = {
  apple: 'Apple',
  amd: 'AMD',
  intel: 'Intel',
  qualcomm: 'Qualcomm',
  nvidia: 'NVIDIA',
  google: 'Google',
  samsung: 'Samsung',
  mediatek: 'MediaTek',
  unknown: 'Unknown',
};

function processorName(metadata: ResultMetadata): string | null {
  return (
    metadata.processor.name?.value ??
    metadata.processor.rawName?.value ??
    metadata.processor.identifier?.value ??
    null
  );
}

function frequency(metadata: ResultMetadata): ProcessorContextViewModel['frequency'] {
  const statistics = metadata.frequency?.statistics;
  if (!statistics) return null;
  return {
    minGHz: statistics.minMHz / 1000,
    q1GHz: statistics.q1MHz / 1000,
    medianGHz: statistics.medianMHz / 1000,
    meanGHz: statistics.meanMHz / 1000,
    q3GHz: statistics.q3MHz / 1000,
    maxGHz: statistics.maxMHz / 1000,
  };
}

function topology(metadata: ResultMetadata): ProcessorContextViewModel['topology'] {
  const cores = metadata.topology.physicalCores?.value ?? null;
  const threads = metadata.topology.logicalThreads?.value ?? null;
  const clusters = metadata.topology.clusters
    .map((cluster) => ({
      cores: cluster.cores?.value ?? 0,
      maxGHz: cluster.maxMHz ? cluster.maxMHz.value / 1000 : null,
    }))
    .filter((cluster) => cluster.cores > 0);
  const clusterTotal = clusters.reduce((sum, cluster) => sum + cluster.cores, 0);
  // A single cluster restates the core count, and a partial split contradicts
  // it; neither is worth drawing.
  const usable = clusters.length > 1 && (!cores || clusterTotal === cores) ? clusters : [];
  // Cluster order in the payload is vendor-defined: Apple and Intel list their
  // fastest cluster first, Tensor its slowest, and no vendor labels clusters as
  // performance or efficiency. Only a reported per-cluster maximum frequency
  // justifies reordering, so anything less keeps the payload order as captured.
  const ordered = usable.every((cluster) => cluster.maxGHz !== null)
    ? usable.toSorted((first, second) => second.maxGHz! - first.maxGHz!)
    : usable;

  if (cores === null && threads === null && ordered.length === 0) return null;
  return { cores, threads, clusters: ordered };
}

/** Core types are never inferred from the payload; only an exact catalogue match
 * can name them. An alias or configuration mismatch resolves to unmatched, which
 * leaves the topology row exactly as the payload described it. */
function coreComposition(
  identity: ProcessorIdentityMatch,
): ProcessorContextViewModel['coreComposition'] {
  if (identity.kind === 'unmatched' || !identity.entry.coreComposition) return null;
  const { description, source } = identity.entry.coreComposition;
  return {
    value: description,
    provenance: 'published',
    source: {
      url: source.url,
      label: `${source.publisher}, retrieved ${source.retrievedOn}`,
    },
  };
}

function scoreScaling(metadata: ResultMetadata): ProcessorContextViewModel['scaling'] {
  const single = metadata.scores.singleCore?.value;
  const multi = metadata.scores.multiCore?.value;
  if (!single || !multi || !Number.isFinite(single) || !Number.isFinite(multi)) return null;
  return { ratio: multi / single, singleCore: single, multiCore: multi };
}

function reference(
  metadata: ResultMetadata,
  identity: ProcessorIdentityMatch,
): ProcessorContextViewModel['reference'] {
  if (identity.kind === 'unmatched' || metadata.generation !== 7) return null;
  const score = identity.entry.scoreReferences?.find((candidate) => candidate.generation === 7);
  return score
    ? {
        singleCore: score.singleCore,
        multiCore: score.multiCore,
        generation: 'Geekbench 7',
        minimumUniqueResults: score.minimumUniqueResults,
      }
    : null;
}

function formatCapacity(bytes: number): string {
  const gibibytes = bytes / 1024 ** 3;
  return `${Number.isInteger(gibibytes) ? gibibytes : gibibytes.toFixed(1)} GB`;
}

function nominalTransferRate(rate: number): number {
  const rounded = Math.round(rate / 100) * 100;
  return Math.abs(rate - rounded) <= Math.max(10, rounded * 0.01) ? rounded : rate;
}

function memory(
  metadata: ResultMetadata,
  identity: ProcessorIdentityMatch,
): ProcessorContextViewModel['memory'] {
  const facts: ProcessorContextViewModel['memory'] = [];
  const payload = metadata.memory;
  const systemMemory = SYSTEM_MEMORY_SPECIFICATIONS.find(
    (specification) =>
      specification.systemName === metadata.processor.systemName?.value &&
      specification.processorName === processorName(metadata),
  );

  if (payload.capacityBytes) {
    facts.push({
      kind: 'capacity',
      value: formatCapacity(payload.capacityBytes.value),
      provenance: 'reported',
    });
  }
  if (systemMemory) {
    facts.push({
      kind: 'specification',
      value: `${systemMemory.memoryType}-${systemMemory.transferRateMTs}`,
      provenance: 'published',
      detail: `The payload reported ${payload.type?.value ?? 'an unknown type'} at ${payload.transferRateMTs?.value ?? 'an unknown rate'} MT/s.`,
      source: {
        url: systemMemory.source.url,
        label: `${systemMemory.source.publisher}, retrieved ${systemMemory.source.retrievedOn}`,
      },
    });
  } else if (payload.type || payload.transferRateMTs) {
    const type = payload.type?.value.replace(/\s+SDRAM$/i, '') ?? 'Memory';
    const exactRate = payload.transferRateMTs?.value;
    const displayedRate = exactRate ? nominalTransferRate(exactRate) : null;

    if (payload.reportedRateBelowJedecMinimum) {
      // The type/rate pair contradicts itself, so print neither as fact. This is
      // the general soldered-LPDDR case; an exact system entry above supersedes
      // it whenever one exists.
      facts.push({
        kind: 'specification',
        value: `${type}-class (rate unverified)`,
        provenance: 'reported',
        detail:
          `The payload reported ${type} at ${exactRate} MT/s, which is below the ` +
          `lowest rate ${type} is defined for. Soldered LPDDR is commonly reported ` +
          `this way, under a desktop label and at its command clock rather than its ` +
          `data rate. The true rate is not recoverable from this result.`,
      });
    } else {
      facts.push({
        kind: 'specification',
        value: `${type}${displayedRate ? `-${displayedRate}` : ''}`,
        provenance: 'reported',
        detail:
          exactRate && displayedRate !== exactRate
            ? `Exact payload value: ${exactRate} MT/s.`
            : undefined,
      });
    }
  }
  if (payload.busWidthBits) {
    // Present total interface width so payload-derived and catalogue-published
    // widths are directly comparable; keep the reported channel topology as a
    // secondary detail rather than a competing vocabulary.
    const channelKind = payload.channelWidthBits === 32 ? 'subchannels' : 'channels';
    facts.push({
      kind: 'interface',
      value: `${payload.busWidthBits}-bit bus`,
      provenance: 'reported',
      detail:
        payload.channels && payload.channelWidthBits
          ? `Reported as ${payload.channels.value} × ${payload.channelWidthBits}-bit ${channelKind}.`
          : undefined,
    });
  }
  if (!systemMemory && payload.theoreticalBandwidthGBs !== null) {
    facts.push({
      kind: 'bandwidth',
      value: `${payload.theoreticalBandwidthGBs.toFixed(1)} GB/s`,
      provenance: 'computed',
      detail:
        'Maximum bandwidth calculated from the reported memory rate and bus width; not measured.',
    });
  }

  if (identity.kind !== 'unmatched' && identity.entry.hardware) {
    const hardware = identity.entry.hardware;
    if (hardware.memoryType || hardware.transferRateMTs) {
      facts.push({
        kind: 'specification',
        value: `${hardware.memoryType ?? 'Memory'}${hardware.transferRateMTs ? `-${hardware.transferRateMTs}` : ''}`,
        provenance: 'published',
        source: {
          url: hardware.source.url,
          label: `${hardware.source.publisher}, retrieved ${hardware.source.retrievedOn}`,
        },
      });
    }
    if (hardware.busWidthBits) {
      facts.push({
        kind: 'interface',
        value: `${hardware.busWidthBits}-bit bus`,
        provenance: 'published',
        source: {
          url: hardware.source.url,
          label: `${hardware.source.publisher}, retrieved ${hardware.source.retrievedOn}`,
        },
      });
    }
    facts.push({
      kind: 'bandwidth',
      value: `${hardware.bandwidthQualifier === 'up-to' ? 'Up to ' : ''}${hardware.bandwidthGBs} GB/s`,
      provenance: 'published',
      source: {
        url: hardware.source.url,
        label: `${hardware.source.publisher}, retrieved ${hardware.source.retrievedOn}`,
      },
    });
  }
  return facts;
}

export function buildProcessorContextViewModel(
  context: CachedResultContext | null,
): ProcessorContextViewModel | null {
  if (!context?.metadata) return null;

  const name = processorName(context.metadata);
  if (!name) return null;
  const identity = resolveProcessorIdentity(context);

  return {
    name,
    vendor: VENDOR_LABELS[context.metadata.processor.vendor.value],
    vendorKey: context.metadata.processor.vendor.value,
    architecture: ARCHITECTURE_LABELS[context.metadata.architecture.value],
    cataloguePath: identity.kind === 'unmatched' ? null : identity.entry.pageUrl,
    frequency: frequency(context.metadata),
    topology: topology(context.metadata),
    coreComposition: coreComposition(identity),
    scaling: scoreScaling(context.metadata),
    reference: reference(context.metadata, identity),
    memory: memory(context.metadata, identity),
  };
}
