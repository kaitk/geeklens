import { resultsCache, type CachedResultContext } from '../cache/ResultsCache';
import { isGeekbenchSignedOut } from '../geekbench/authentication';
import { parseGeekbenchGeneration, type GeekbenchGeneration } from '../geekbench/generation';
import { extractProcessorLinks, mergeProcessorLinks } from '../geekbench/processorLinks';
import { fetchResultMetadataFromPayload } from '../geekbench/resultPayloadClient';
import { parseResultId } from '../geekbench/urls';
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
import {
  extractBenchmarkName,
  findBenchmarkTables,
  findInstructionSetValueCell,
  findSystemTableByHeading,
  waitForElement,
} from './domUtils';
import { mountSystemInstructionSets, mountWorkloadBadges } from './mountBadges';
import {
  applyProcessorContextPreferences,
  renderSingleProcessorContext,
} from './processorContext/render';
import { buildProcessorContextViewModel } from './processorContextViewModel';
import { markRowLabel } from './rowMarker';
import { isPageAnnotated, showStatus } from './statusBanner';

interface SingleResultPageDependencies {
  cache: Pick<typeof resultsCache, 'getResultContext' | 'storeResultContext'>;
  fetchMetadata: typeof fetchResultMetadataFromPayload;
  mountSystemInstructionSets: typeof mountSystemInstructionSets;
  mountWorkloadBadges: typeof mountWorkloadBadges;
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

const singleResultPageDependencies: SingleResultPageDependencies = {
  cache: resultsCache,
  fetchMetadata: fetchResultMetadataFromPayload,
  mountSystemInstructionSets,
  mountWorkloadBadges,
};

export async function annotateGeekbenchResults(
  settings: Settings,
  dependencies: SingleResultPageDependencies = singleResultPageDependencies,
) {
  if (isPageAnnotated()) return;

  debugLog('Starting annotation process');
  const generation = parseGeekbenchGeneration(window.location.pathname);
  const resultId = parseResultId(window.location.pathname);
  if (!generation || !resultId) {
    showStatus(annotationErrorStatus('GeekLens: Unsupported or malformed result page'));
    return;
  }

  const signedOut = isGeekbenchSignedOut();
  showStatus(loadingStatus);

  try {
    await waitForElement('table.benchmark-table');
    applyProcessorContextPreferences(settings);

    const context = await loadSingleResultContext(generation, resultId, signedOut, dependencies);
    // Geekbench 6.4+ single-result pages are the only rendered HTML ISA source.
    // Older v6 pages have no row; Geekbench 7 uses payload metadata instead.
    const renderedInstructions =
      generation === 6 ? findInstructionSetValueCell()?.textContent?.trim() || null : null;
    const instructionSets =
      generation === 6
        ? renderedInstructions
        : generation === 7
          ? (context?.metadata?.instructionSets?.value ?? null)
          : null;
    const processorContext = buildProcessorContextViewModel(context);
    if (processorContext) renderSingleProcessorContext(processorContext, settings);

    if (settings.showIsaAnnotations && instructionSets) {
      const mountSystem: MountSystemInstructionSets = (target, instructionGroups) =>
        dependencies.mountSystemInstructionSets(target, instructionGroups, settings);
      const mountWorkload: MountWorkloadBadges = (target, instructions, confidenceNote) =>
        dependencies.mountWorkloadBadges(target, instructions, settings, confidenceNote);
      annotateSystemInstructionSets(generation, instructionSets, mountSystem);
      annotateBenchmarkTables(
        generation,
        extractIndividualInstructions(instructionSets),
        mountWorkload,
      );
    }

    showStatus(
      completedAnnotationStatus({
        hasDetails: Boolean(processorContext || instructionSets),
        payloadComplete: Boolean(context?.metadata),
        signedOut,
      }),
    );
  } catch (error) {
    console.error('GeekLens: Failed to annotate result page', error);
    showStatus(annotationErrorStatus());
  }
}

async function loadSingleResultContext(
  generation: GeekbenchGeneration,
  resultId: string,
  signedOut: boolean,
  dependencies: SingleResultPageDependencies,
): Promise<CachedResultContext | null> {
  const cached = await dependencies.cache.getResultContext(generation, resultId);
  const pageLinks = extractProcessorLinks();
  let metadata = cached?.metadata ?? null;
  let fetchedMetadata = false;

  // Signed-out Geekbench 5–7 payload requests disturb Geekbench's post-login
  // destination, so only an authenticated single-result page fills a cache miss.
  if (!metadata && !signedOut) {
    try {
      metadata = await dependencies.fetchMetadata(generation, resultId);
      fetchedMetadata = Boolean(metadata);
    } catch (error) {
      console.error(`GeekLens: Could not load result details for ${resultId}`, error);
    }
  } else if (!metadata && signedOut) {
    debugLog(`Signed out of Geekbench ${generation}, skipping payload fetch`);
  }

  const processorLinks = mergeProcessorLinks(cached?.processorLinks, pageLinks);
  const hasPageLinks = Boolean(pageLinks.processorPath || pageLinks.macPath);
  if (fetchedMetadata || hasPageLinks) {
    try {
      await dependencies.cache.storeResultContext(generation, resultId, {
        ...(fetchedMetadata ? { metadata } : {}),
        ...(hasPageLinks ? { processorLinks: pageLinks } : {}),
      });
    } catch (error) {
      console.error(`GeekLens: Could not cache result details for ${resultId}`, error);
    }
  }

  if (!cached && !metadata && !hasPageLinks) return null;
  return {
    metadata,
    processorLinks,
    validity: cached?.validity ?? null,
    lastAccessedAt: cached?.lastAccessedAt ?? Date.now(),
  };
}

function annotateSystemInstructionSets(
  generation: GeekbenchGeneration,
  instructionSets: string,
  mountInstructionSets: MountSystemInstructionSets,
) {
  const valueCell =
    generation === 6 ? findInstructionSetValueCell() : insertGeekbench7InstructionSetRow();
  if (!valueCell || valueCell.querySelector('[data-geeklens-system-info]')) return;

  if (generation === 6 && valueCell.previousElementSibling) {
    markRowLabel(valueCell.previousElementSibling, 'changed');
  }

  valueCell.textContent = '';
  mountInstructionSets(valueCell, categorizeInstructionSets(instructionSets));
}

function insertGeekbench7InstructionSetRow(): HTMLTableCellElement | null {
  const cpuTable = findSystemTableByHeading('CPU Information');
  if (!cpuTable) return null;

  const existing = cpuTable.querySelector<HTMLTableCellElement>(
    'tr[data-geeklens-instruction-sets] td.value',
  );
  if (existing) return existing;

  const row = document.createElement('tr');
  row.dataset.geeklensInstructionSets = 'true';
  const labelCell = document.createElement('td');
  labelCell.className = 'name';
  labelCell.textContent = 'Instruction Sets';
  markRowLabel(labelCell, 'added');
  const valueCell = document.createElement('td');
  valueCell.className = 'value';
  row.append(labelCell, valueCell);
  (cpuTable.querySelector('tbody') ?? cpuTable).appendChild(row);
  return valueCell;
}

function annotateBenchmarkTables(
  generation: GeekbenchGeneration,
  allSupportedInstructions: Set<string>,
  mountBadges: MountWorkloadBadges,
) {
  const benchmarkTables = findBenchmarkTables();
  if (benchmarkTables.length === 0) {
    console.error('GeekLens: No benchmark tables found');
    return;
  }

  benchmarkTables.forEach((table) => {
    Array.from(table.querySelectorAll('tr')).forEach((row) => {
      const benchmarkName = extractBenchmarkName(row);
      if (!benchmarkName) return;

      const { instructions, confidenceNote } = workloadInstructions(
        generation,
        benchmarkName,
        allSupportedInstructions,
      );
      if (instructions.length === 0) return;

      const benchmarkCell = row.querySelector('td:first-child');
      if (!benchmarkCell) {
        console.error(`GeekLens: No benchmark cell found for ${benchmarkName}`);
        return;
      }
      mountBadges(benchmarkCell, instructions, confidenceNote);
    });
  });
}
