import {
  resultsCache,
  type CachedResultContext,
  type CachedResultValidity,
} from '../cache/ResultsCache';
import { isGeekbenchSignedOut } from '../geekbench/authentication';
import { parseGeekbenchGeneration, type GeekbenchGeneration } from '../geekbench/generation';
import {
  extractComparisonProcessorLinks,
  mergeProcessorLinks,
  type CanonicalProcessorLinks,
} from '../geekbench/processorLinks';
import { fetchResultMetadataFromPayload } from '../geekbench/resultPayloadClient';
import { parseComparisonIds } from '../geekbench/urls';
import { categorizeInstructionSets } from '../isa/categories';
import { extractIndividualInstructions, type Instruction } from '../isa/instructions';
import { workloadInstructions } from '../isa/workloadInstructions';
import { debugLog } from '../logger';
import type { Settings } from '../settings/settings';
import {
  annotationErrorStatus,
  completedAnnotationStatus,
  loadingStatus,
} from './annotationStatus';
import { withClearedComparisonBaseline } from './comparisonBaseline';
import {
  combinePayloadValidity,
  isResultValidityFresh,
  loadBrowserResultValidity,
  renderComparisonResultValidity,
} from './comparisonValidity';
import {
  extractBenchmarkName,
  findBenchmarkTables,
  findComparisonScoreRow,
  waitForElement,
} from './domUtils';
import { mountSystemInstructionSets, mountWorkloadBadges } from './mountBadges';
import {
  applyProcessorContextPreferences,
  renderComparisonProcessorContext,
} from './processorContext/render';
import { buildProcessorContextViewModel } from './processorContextViewModel';
import { markRowLabel } from './rowMarker';
import { isPageAnnotated, showStatus } from './statusBanner';

interface ComparisonPageDependencies {
  cache: Pick<typeof resultsCache, 'getResultContext' | 'storeResultContext'>;
  fetchMetadata: typeof fetchResultMetadataFromPayload;
  loadValidity: typeof loadBrowserResultValidity;
  mountSystemInstructionSets: typeof mountSystemInstructionSets;
  mountWorkloadBadges: typeof mountWorkloadBadges;
  withClearedBaseline: typeof withClearedComparisonBaseline;
}

interface ComparisonLane {
  resultId: string;
  context: CachedResultContext | null;
  processorLinks: CanonicalProcessorLinks;
}

interface ComparisonData {
  primaryContext: CachedResultContext | null;
  baselineContext: CachedResultContext | null;
  validity: readonly [CachedResultValidity | null, CachedResultValidity | null];
}

type MountSystemInstructionSets = (
  target: Element,
  instructionGroups: ReturnType<typeof categorizeInstructionSets>,
) => void;

type MountWorkloadBadges = (
  target: Element,
  instructions: Instruction[],
  confidenceNote?: string,
) => void;

const comparisonPageDependencies: ComparisonPageDependencies = {
  cache: resultsCache,
  fetchMetadata: fetchResultMetadataFromPayload,
  loadValidity: loadBrowserResultValidity,
  mountSystemInstructionSets,
  mountWorkloadBadges,
  withClearedBaseline: withClearedComparisonBaseline,
};

async function loadComparisonLaneMetadata(
  generation: GeekbenchGeneration,
  lane: ComparisonLane,
  dependencies: ComparisonPageDependencies,
): Promise<CachedResultContext | null> {
  try {
    const metadata = await dependencies.fetchMetadata(generation, lane.resultId);
    if (!metadata) return mergeContextLinks(lane.context, lane.processorLinks);

    const context: CachedResultContext = {
      metadata,
      processorLinks: mergeProcessorLinks(lane.context?.processorLinks, lane.processorLinks),
      validity: lane.context?.validity ?? null,
      lastAccessedAt: lane.context?.lastAccessedAt ?? Date.now(),
    };
    try {
      await dependencies.cache.storeResultContext(generation, lane.resultId, {
        metadata,
        processorLinks: lane.processorLinks,
      });
    } catch (error) {
      console.error(`GeekLens: Could not cache result details for ${lane.resultId}`, error);
    }
    return context;
  } catch (error) {
    console.error(`GeekLens: Error fetching data for result ${lane.resultId}:`, error);
    return mergeContextLinks(lane.context, lane.processorLinks);
  }
}

async function loadLaneValidity(
  generation: GeekbenchGeneration,
  lane: ComparisonLane,
  dependencies: ComparisonPageDependencies,
): Promise<CachedResultValidity | null> {
  const cached = lane.context?.validity ?? null;
  if (isResultValidityFresh(cached)) return cached;
  try {
    return await dependencies.loadValidity(generation, lane.resultId, cached);
  } catch (error) {
    console.error(`GeekLens: Could not load validity for result ${lane.resultId}`, error);
    return cached;
  }
}

async function acquireComparisonData(
  generation: GeekbenchGeneration,
  primary: ComparisonLane,
  baseline: ComparisonLane,
  signedOut: boolean,
  dependencies: ComparisonPageDependencies,
): Promise<ComparisonData> {
  const lanes = [primary, baseline] as const;
  const needsPayload = lanes.map((lane) => !signedOut && !lane.context?.metadata);
  const needsValidity = lanes.map((lane) => !isResultValidityFresh(lane.context?.validity));
  if (!needsPayload.some(Boolean) && !needsValidity.some(Boolean)) {
    return {
      primaryContext: mergeContextLinks(primary.context, primary.processorLinks),
      baselineContext: mergeContextLinks(baseline.context, baseline.processorLinks),
      validity: [primary.context?.validity ?? null, baseline.context?.validity ?? null],
    };
  }

  return dependencies.withClearedBaseline(
    generation,
    primary.resultId,
    baseline.resultId,
    async () => {
      const [contexts, validity] = await Promise.all([
        Promise.all(
          lanes.map((lane, index) =>
            needsPayload[index]
              ? loadComparisonLaneMetadata(generation, lane, dependencies)
              : mergeContextLinks(lane.context, lane.processorLinks),
          ),
        ),
        Promise.all(
          lanes.map((lane, index) =>
            needsValidity[index]
              ? loadLaneValidity(generation, lane, dependencies)
              : (lane.context?.validity ?? null),
          ),
        ),
      ]);
      return {
        primaryContext: contexts[0],
        baselineContext: contexts[1],
        validity: [validity[0], validity[1]],
      };
    },
  );
}

async function cacheProcessorLinks(
  generation: GeekbenchGeneration,
  lane: ComparisonLane,
  dependencies: ComparisonPageDependencies,
): Promise<void> {
  if (!lane.processorLinks.processorPath && !lane.processorLinks.macPath) return;
  try {
    await dependencies.cache.storeResultContext(generation, lane.resultId, {
      processorLinks: lane.processorLinks,
    });
  } catch (error) {
    console.error(`GeekLens: Could not cache processor links for ${lane.resultId}`, error);
  }
}

export async function annotateGeekbenchComparisonPage(
  settings: Settings,
  dependencies: ComparisonPageDependencies = comparisonPageDependencies,
) {
  if (isPageAnnotated()) return;

  debugLog('Starting comparison annotation process');
  const generation = parseGeekbenchGeneration(window.location.pathname);
  if (!generation) {
    showStatus(annotationErrorStatus('GeekLens: Unsupported Geekbench version'));
    return;
  }
  showStatus(loadingStatus);

  try {
    const signedOut = isGeekbenchSignedOut();
    const { baseline: baselineId, primary: primaryId } = parseComparisonIds(
      new URL(window.location.href),
    );
    if (!primaryId || !baselineId) {
      console.error('GeekLens: Could not extract primary or baseline result ID');
      showStatus(annotationErrorStatus('GeekLens: Malformed comparison page'));
      return;
    }

    const [primaryCached, baselineCached] = await Promise.all([
      dependencies.cache.getResultContext(generation, primaryId),
      dependencies.cache.getResultContext(generation, baselineId),
    ]);
    await waitForElement('table.comparison-benchmark-table');
    applyProcessorContextPreferences(settings);
    const processorLinks = extractComparisonProcessorLinks();
    const primary: ComparisonLane = {
      resultId: primaryId,
      context: primaryCached,
      processorLinks: processorLinks.primary,
    };
    const baseline: ComparisonLane = {
      resultId: baselineId,
      context: baselineCached,
      processorLinks: processorLinks.baseline,
    };

    await Promise.all([
      cacheProcessorLinks(generation, primary, dependencies),
      cacheProcessorLinks(generation, baseline, dependencies),
    ]);
    if (signedOut && (!primaryCached?.metadata || !baselineCached?.metadata)) {
      debugLog(`Signed out of Geekbench ${generation}, skipping payload fetch`);
    }

    const { primaryContext, baselineContext, validity } = await acquireComparisonData(
      generation,
      primary,
      baseline,
      signedOut,
      dependencies,
    );
    const primaryInstructions = primaryContext?.metadata?.instructionSets?.value ?? null;
    const baselineInstructions = baselineContext?.metadata?.instructionSets?.value ?? null;

    renderComparisonResultValidity([
      combinePayloadValidity(validity[0], primaryContext),
      combinePayloadValidity(validity[1], baselineContext),
    ]);
    const primaryProcessor = buildProcessorContextViewModel(primaryContext);
    const baselineProcessor = buildProcessorContextViewModel(baselineContext);
    if (primaryProcessor || baselineProcessor) {
      renderComparisonProcessorContext([primaryProcessor, baselineProcessor], settings);
    }

    if (settings.showIsaAnnotations && (primaryInstructions || baselineInstructions)) {
      const mountSystem: MountSystemInstructionSets = (target, instructionGroups) =>
        dependencies.mountSystemInstructionSets(target, instructionGroups, settings);
      const mountWorkload: MountWorkloadBadges = (target, instructions, confidenceNote) =>
        dependencies.mountWorkloadBadges(target, instructions, settings, confidenceNote);
      annotateSystemInstructionSets(primaryInstructions, baselineInstructions, mountSystem);
      annotateBenchmarkTables(
        generation,
        extractIndividualInstructions(primaryInstructions),
        extractIndividualInstructions(baselineInstructions),
        mountWorkload,
      );
    }

    showStatus(
      completedAnnotationStatus({
        hasDetails: Boolean(primaryContext?.metadata || baselineContext?.metadata),
        payloadComplete: Boolean(primaryContext?.metadata && baselineContext?.metadata),
        signedOut,
      }),
    );
  } catch (error) {
    console.error('GeekLens: Failed to annotate comparison page', error);
    showStatus(annotationErrorStatus());
  }
}

function mergeContextLinks(
  context: CachedResultContext | null,
  processorLinks: CanonicalProcessorLinks,
): CachedResultContext | null {
  if (!context) return null;
  return {
    ...context,
    processorLinks: mergeProcessorLinks(context.processorLinks, processorLinks),
  };
}

function annotateSystemInstructionSets(
  primaryInstructions: string | null,
  baselineInstructions: string | null,
  mountInstructionSets: MountSystemInstructionSets,
) {
  if (!primaryInstructions && !baselineInstructions) return;

  const table = document.querySelector('table.system-information') as HTMLTableElement;
  if (!table) {
    console.error('GeekLens: System information table not found');
    return;
  }
  if (table.querySelector('tr[data-geeklens-instruction-sets]')) return;

  const newRow = document.createElement('tr');
  newRow.setAttribute('data-geeklens-instruction-sets', 'true');
  const labelCell = document.createElement('td');
  labelCell.textContent = 'Instruction Sets';
  markRowLabel(labelCell, 'added');
  newRow.appendChild(labelCell);

  for (const instructionSets of [primaryInstructions, baselineInstructions]) {
    const cell = document.createElement('td');
    newRow.appendChild(cell);
    if (instructionSets) {
      mountInstructionSets(cell, categorizeInstructionSets(instructionSets));
    } else {
      cell.textContent = 'Not available';
    }
  }
  (table.querySelector('tbody') || table).appendChild(newRow);
}

function annotateBenchmarkTables(
  generation: GeekbenchGeneration,
  primaryInstructions: Set<string>,
  baselineInstructions: Set<string>,
  mountBadges: MountWorkloadBadges,
) {
  const benchmarkTables = findBenchmarkTables('table.comparison-benchmark-table');
  if (benchmarkTables.length === 0) {
    console.error('GeekLens: No benchmark tables found');
    return;
  }

  benchmarkTables.forEach((table) => {
    table
      .querySelectorAll('tr.document-graph')
      .forEach((row) => annotateGraphRow(generation, row, primaryInstructions, false, mountBadges));
    table
      .querySelectorAll('tr.baseline-graph')
      .forEach((row) => annotateGraphRow(generation, row, baselineInstructions, true, mountBadges));
  });
}

function annotateGraphRow(
  generation: GeekbenchGeneration,
  row: Element,
  cpuInstructions: Set<string>,
  isBaseline: boolean,
  mountBadges: MountWorkloadBadges,
) {
  const scoreRow = findComparisonScoreRow(row, isBaseline);
  if (!scoreRow) return;
  const benchmarkName = extractBenchmarkName(scoreRow);
  if (!benchmarkName) return;

  const { instructions, confidenceNote } = workloadInstructions(
    generation,
    benchmarkName,
    cpuInstructions,
  );
  if (instructions.length === 0) return;

  const cpuCell = row.querySelector('td:first-child');
  if (!cpuCell) {
    console.error('GeekLens: No CPU cell found in row');
    return;
  }
  if (cpuCell.querySelector('[data-geeklens-instructions]')) {
    debugLog('Already annotated');
    return;
  }
  mountBadges(cpuCell, instructions, confidenceNote);
}
