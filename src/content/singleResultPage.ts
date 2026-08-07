import { categorizeInstructionSets } from '../isa/categories';
import { parseGeekbenchGeneration, type GeekbenchGeneration } from '../geekbench/generation';
import { extractProcessorLinks } from '../geekbench/processorLinks';
import { fetchResultMetadataFromPayload } from '../geekbench/resultPayloadClient';
import { parseResultId } from '../geekbench/urls';
import {
  initialInstructionStatus,
  processorContextStatus,
  singleResultInstructionStatus,
} from '../geekbench/instructionDataStatus';
import { isGeekbenchSignedOut } from '../geekbench/authentication';
import { extractIndividualInstructions } from '../isa/instructions';
import { workloadInstructions } from '../isa/workloadInstructions';
import {
  extractBenchmarkName,
  findBenchmarkTables,
  findInstructionSetValueCell,
  findSystemTableByHeading,
  waitForElement,
} from './domUtils';
import { mountSystemInstructionSets, mountWorkloadBadges } from './mountBadges';
import { isPageAnnotated, showStatus } from './statusBanner';
import { resultsCache, type CachedResultContext } from '../cache/ResultsCache';
import type { Settings } from '../settings/settings';
import { markRowLabel } from './rowMarker';
import {
  applyProcessorContextPreferences,
  renderSingleProcessorContext,
} from './processorContextUi';
import { buildProcessorContextViewModel } from './processorContextViewModel';
import { debugLog } from '../logger';
import { loadResultContext } from './resultContextLoader';

interface SingleResultPageDependencies {
  cache: Pick<typeof resultsCache, 'getResultContext' | 'storeResultContext'>;
  fetchMetadata: typeof fetchResultMetadataFromPayload;
  mountSystemInstructionSets: typeof mountSystemInstructionSets;
  mountWorkloadBadges: typeof mountWorkloadBadges;
}

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
  if (isPageAnnotated()) {
    return; // page already annotated
  }

  debugLog('Starting annotation process');
  const generation = parseGeekbenchGeneration(window.location.pathname);
  const resultId = parseResultId(window.location.pathname);
  if (!generation || !resultId) return;

  const signedOut = isGeekbenchSignedOut();
  showStatus(initialInstructionStatus(generation, signedOut));

  // Wait for benchmark tables to ensure page is fully rendered
  try {
    await waitForElement('table.benchmark-table');
    applyProcessorContextPreferences(settings);
    const context = await getResultContext(generation, resultId, signedOut, dependencies);
    const instructionSets = context?.instructionSet ?? null;
    const processorContext = buildProcessorContextViewModel(context);
    if (processorContext) renderSingleProcessorContext(processorContext, settings);
    if (!instructionSets) {
      showStatus(
        generation === 5
          ? processorContextStatus(Boolean(processorContext), signedOut)
          : singleResultInstructionStatus(generation, false),
      );
      return;
    }

    if (settings.showIsaAnnotations) {
      annotateSystemInstructionSets(generation, instructionSets, settings, dependencies);
      annotateBenchmarkTables(
        generation,
        extractIndividualInstructions(instructionSets),
        settings,
        dependencies,
      );
    }
    showStatus(singleResultInstructionStatus(generation, true));
  } catch (error) {
    console.error('GeekLens: Failed to find benchmark tables', error);
  }
}

async function getResultContext(
  generation: GeekbenchGeneration,
  resultId: string,
  signedOut: boolean,
  dependencies: SingleResultPageDependencies,
): Promise<CachedResultContext | null> {
  return loadResultContext({
    cache: dependencies.cache,
    generation,
    resultId,
    processorLinks: extractProcessorLinks(),
    async loadSource(cached) {
      // A signed-out payload request changes Geekbench's post-login destination,
      // so payload-backed generations deliberately do not attempt it.
      if (signedOut && !cached?.metadata && generation !== 6) {
        debugLog(`Signed out of Geekbench ${generation}, skipping payload fetch`);
      }
      const metadata =
        cached?.metadata ??
        (signedOut ? null : await dependencies.fetchMetadata(generation, resultId));
      // The rendered v6 row is the compatibility source and remains stronger
      // than payload instruction data.
      const compatibilityInstructions =
        cached?.instructionSet ??
        (generation === 6 ? findInstructionSetValueCell()?.textContent?.trim() : null);
      const instructionSet =
        generation === 6
          ? (compatibilityInstructions ?? metadata?.instructionSets?.value ?? null)
          : (metadata?.instructionSets?.value ?? compatibilityInstructions ?? null);
      return { instructionSet, metadata };
    },
  });
}

function annotateSystemInstructionSets(
  generation: GeekbenchGeneration,
  instructionSets: string,
  settings: Settings,
  dependencies: SingleResultPageDependencies,
) {
  const valueCell =
    generation === 6 ? findInstructionSetValueCell() : insertGeekbench7InstructionSetRow();
  if (!valueCell || valueCell.querySelector('[data-geeklens-system-info]')) return;

  // Geekbench 6 renders this row itself and we replace its contents; the
  // Geekbench 7 row above is one we inserted, and marks itself as added.
  if (generation === 6 && valueCell.previousElementSibling) {
    markRowLabel(valueCell.previousElementSibling, 'changed');
  }

  valueCell.textContent = '';
  dependencies.mountSystemInstructionSets(
    valueCell,
    categorizeInstructionSets(instructionSets),
    settings,
  );
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
  settings: Settings,
  dependencies: SingleResultPageDependencies,
) {
  const benchmarkTables = findBenchmarkTables();

  if (benchmarkTables.length === 0) {
    console.error('GeekLens: No benchmark tables found');
    return;
  }

  benchmarkTables.forEach((table) => {
    const rows = Array.from(table.querySelectorAll('tr'));

    rows.forEach((row) => {
      const benchmarkName = extractBenchmarkName(row);
      if (!benchmarkName) return;

      const { instructions, confidenceNote } = workloadInstructions(
        generation,
        benchmarkName,
        allSupportedInstructions,
      );
      if (instructions.length === 0) return;

      // Get the cell where we'll add the instruction set badges
      const benchmarkCell = row.querySelector('td:first-child');
      if (!benchmarkCell) {
        console.error(`GeekLens: No benchmark cell found for ${benchmarkName}`);
        return;
      }

      dependencies.mountWorkloadBadges(benchmarkCell, instructions, settings, confidenceNote);
    });
  });
}
