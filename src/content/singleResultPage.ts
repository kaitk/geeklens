import { categorizeInstructionSets } from '../isa/categories';
import { parseGeekbenchGeneration, type GeekbenchGeneration } from '../geekbench/generation';
import { fetchInstructionSetsFromPayload } from '../geekbench/resultPayloadClient';
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
import { resultsCache } from '../cache/ResultsCache';

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
    const instructionSets = await getInstructionSets(generation, resultId);
    if (!instructionSets) {
      showStatus(singleResultInstructionStatus(generation, false));
      return;
    }

    annotateSystemInstructionSets(generation, instructionSets);
    annotateBenchmarkTables(generation, extractIndividualInstructions(instructionSets));
    showStatus(singleResultInstructionStatus(generation, true));
  } catch (error) {
    console.error('GeekLens: Failed to find benchmark tables', error);
  }
}

async function getInstructionSets(
  generation: GeekbenchGeneration,
  resultId: string,
): Promise<string | null> {
  const cached = await resultsCache.getInstructionSet(generation, resultId);
  if (cached) return cached;

  // Geekbench 6 renders the instruction sets into the page; Geekbench 7 omits
  // the row entirely and only exposes them in the authenticated JSON payload.
  const instructionSets =
    generation === 6
      ? findInstructionSetValueCell()?.textContent?.trim() || null
      : await fetchInstructionSetsFromPayload(generation, resultId);

  if (instructionSets) {
    await resultsCache.storeInstructionSet(generation, resultId, instructionSets);
  }
  return instructionSets;
}

function annotateSystemInstructionSets(generation: GeekbenchGeneration, instructionSets: string) {
  const valueCell =
    generation === 6 ? findInstructionSetValueCell() : insertGeekbench7InstructionSetRow();
  if (!valueCell || valueCell.querySelector('[data-geeklens-system-info]')) return;

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
