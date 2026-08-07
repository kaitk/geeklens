import { categorizeInstructionSets } from '../isa/categories';
import { parseGeekbenchGeneration, type GeekbenchGeneration } from '../geekbench/generation';
import {
  extractProcessorLinks,
  mergeProcessorLinks,
  type CanonicalProcessorLinks,
} from '../geekbench/processorLinks';
import { fetchResultMetadataFromPayload } from '../geekbench/resultPayloadClient';
import {
  initialInstructionStatus,
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
import { loadSettings } from '../settings/settings';
import { markRowLabel } from './rowMarker';
import {
  applyProcessorContextPreferences,
  renderSingleProcessorContext,
} from './processorContextUi';
import { buildProcessorContextViewModel } from './processorContextViewModel';

// Main function to annotate the Geekbench results
export async function annotateGeekbenchResults() {
  if (isPageAnnotated()) {
    return; // page already annotated
  }

  console.log('GeekLens: Starting annotation process');
  const generation = parseGeekbenchGeneration(window.location.pathname);
  const resultId = window.location.pathname.split('/').filter(Boolean).at(-1);
  if (!generation || !resultId) return;

  const signedOut = isGeekbenchSignedOut();
  showStatus(initialInstructionStatus(generation, signedOut));

  // Wait for benchmark tables to ensure page is fully rendered
  try {
    await waitForElement('table.benchmark-table');
    const settings = await loadSettings();
    applyProcessorContextPreferences(settings);
    const context = await getResultContext(generation, resultId, signedOut);
    const instructionSets = context?.instructionSet ?? null;
    const processorContext = buildProcessorContextViewModel(context);
    if (processorContext) renderSingleProcessorContext(processorContext, settings);
    if (!instructionSets) {
      showStatus(singleResultInstructionStatus(generation, false));
      return;
    }

    if (settings.showIsaAnnotations) {
      annotateSystemInstructionSets(generation, instructionSets);
      annotateBenchmarkTables(generation, extractIndividualInstructions(instructionSets));
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
): Promise<CachedResultContext | null> {
  const cached = await resultsCache.getResultContext(generation, resultId);
  const processorLinks = mergeProcessorLinks(cached?.processorLinks, extractProcessorLinks());

  // Geekbench 6 renders instruction sets into the page, so keep that as the
  // compatibility source even when its authenticated payload is unavailable.
  // The payload still supplies the processor-context metadata shared with v7.
  if (generation === 6) {
    const metadata =
      cached?.metadata ??
      (signedOut ? null : await fetchResultMetadataFromPayload(generation, resultId));
    const instructionSets =
      cached?.instructionSet ??
      findInstructionSetValueCell()?.textContent?.trim() ??
      metadata?.instructionSets?.value ??
      null;
    if (metadata || instructionSets || hasProcessorLinks(processorLinks)) {
      await resultsCache.storeResultContext(generation, resultId, {
        instructionSet: instructionSets,
        metadata,
        processorLinks,
      });
    }
    return {
      instructionSet: instructionSets,
      metadata,
      processorLinks,
      lastAccessedAt: cached?.lastAccessedAt ?? Date.now(),
    };
  }

  // A signed-out payload request is not merely doomed: Geekbench stores the
  // rejected path as the session's post-login destination, so a later sign-in
  // lands the user on raw `.gb6` JSON instead of the result page.
  if (signedOut && !cached?.metadata) {
    console.log('GeekLens: Signed out of Geekbench 7, skipping payload fetch');
  }
  const metadata =
    cached?.metadata ??
    (signedOut ? null : await fetchResultMetadataFromPayload(generation, resultId));
  const instructionSets = metadata?.instructionSets?.value ?? cached?.instructionSet ?? null;

  if (metadata || instructionSets || hasProcessorLinks(processorLinks)) {
    await resultsCache.storeResultContext(generation, resultId, {
      instructionSet: instructionSets,
      metadata,
      processorLinks,
    });
  }
  return {
    instructionSet: instructionSets,
    metadata,
    processorLinks,
    lastAccessedAt: cached?.lastAccessedAt ?? Date.now(),
  };
}

function hasProcessorLinks(links: CanonicalProcessorLinks): boolean {
  return Boolean(links.processorPath || links.macPath);
}

function annotateSystemInstructionSets(generation: GeekbenchGeneration, instructionSets: string) {
  const valueCell =
    generation === 6 ? findInstructionSetValueCell() : insertGeekbench7InstructionSetRow();
  if (!valueCell || valueCell.querySelector('[data-geeklens-system-info]')) return;

  // Geekbench 6 renders this row itself and we replace its contents; the
  // Geekbench 7 row above is one we inserted, and marks itself as added.
  if (generation === 6 && valueCell.previousElementSibling) {
    markRowLabel(valueCell.previousElementSibling, 'changed');
  }

  valueCell.textContent = '';
  mountSystemInstructionSets(valueCell, categorizeInstructionSets(instructionSets));
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

      mountWorkloadBadges(benchmarkCell, instructions, confidenceNote);
    });
  });
}
