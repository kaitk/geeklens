import type { CachedResultContext } from '../cache/ResultsCache';
import { PROCESSOR_CATALOGUE, type ProcessorCatalogueEntry } from './processorCatalogue';

export type ProcessorIdentityMatch =
  | {
      kind: 'mac-path' | 'processor-path' | 'alias';
      catalogueKey: string;
      evidence: string;
      entry: ProcessorCatalogueEntry;
    }
  | {
      kind: 'unmatched';
      catalogueKey: null;
      evidence: string | null;
      reason:
        | 'missing-metadata'
        | 'missing-identity'
        | 'configuration-mismatch'
        | 'ambiguous-alias'
        | 'no-match';
    };

function normalizedAlias(value: string): string {
  return value.trim().replaceAll(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

function matchesConfiguration(
  context: CachedResultContext,
  entry: ProcessorCatalogueEntry,
): boolean {
  const required = entry.requiredConfiguration;
  if (!required) return true;
  if (
    required.physicalCores !== undefined &&
    context.metadata?.topology.physicalCores?.value !== required.physicalCores
  ) {
    return false;
  }
  if (required.gpuCores !== undefined) {
    // GPU topology is not normalized from result payloads yet. A device alias
    // requiring it cannot match until that exact evidence exists; canonical
    // Mac paths remain sufficient and bypass alias constraints.
    return false;
  }
  if (
    required.modelIdentifier !== undefined &&
    context.metadata?.processor.modelIdentifier?.value !== required.modelIdentifier
  ) {
    return false;
  }
  return true;
}

function matched(
  kind: 'mac-path' | 'processor-path' | 'alias',
  evidence: string,
  entry: ProcessorCatalogueEntry,
): ProcessorIdentityMatch {
  return { kind, catalogueKey: entry.key, evidence, entry };
}

export function resolveProcessorIdentity(
  context: CachedResultContext | null,
  catalogue: readonly ProcessorCatalogueEntry[] = PROCESSOR_CATALOGUE,
): ProcessorIdentityMatch {
  if (!context?.metadata) {
    return { kind: 'unmatched', catalogueKey: null, evidence: null, reason: 'missing-metadata' };
  }

  const { macPath, processorPath } = context.processorLinks;
  if (macPath) {
    const entry = catalogue.find((candidate) => candidate.macPaths.includes(macPath));
    if (entry) return matched('mac-path', macPath, entry);
  }
  if (processorPath) {
    const entry = catalogue.find((candidate) => candidate.processorPaths.includes(processorPath));
    if (entry) return matched('processor-path', processorPath, entry);
  }

  const name =
    context.metadata.processor.name?.value ??
    context.metadata.processor.rawName?.value ??
    context.metadata.processor.identifier?.value;
  if (!name) {
    return { kind: 'unmatched', catalogueKey: null, evidence: null, reason: 'missing-identity' };
  }

  const alias = normalizedAlias(name);
  const aliasCandidates = catalogue.filter((entry) =>
    entry.aliases.some((candidate) => normalizedAlias(candidate) === alias),
  );
  if (aliasCandidates.length === 0) {
    return { kind: 'unmatched', catalogueKey: null, evidence: name, reason: 'no-match' };
  }

  const configuredCandidates = aliasCandidates.filter((entry) =>
    matchesConfiguration(context, entry),
  );
  if (configuredCandidates.length === 0) {
    return {
      kind: 'unmatched',
      catalogueKey: null,
      evidence: name,
      reason: 'configuration-mismatch',
    };
  }
  if (configuredCandidates.length > 1) {
    return {
      kind: 'unmatched',
      catalogueKey: null,
      evidence: name,
      reason: 'ambiguous-alias',
    };
  }
  return matched('alias', name, configuredCandidates[0]);
}
