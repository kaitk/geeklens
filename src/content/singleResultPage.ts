import { mount } from 'svelte';
import { getV6SupportedInstructions } from '../isa/benchmarkMap';
import { getV7SupportedInstructions } from '../isa/benchmarkMapV7';
import { categorizeInstructionSets } from '../isa/categories';
import { parseGeekbenchGeneration, type GeekbenchGeneration } from '../geekbench/generation';
import { extractInstructionSetsFromPayload } from '../geekbench/resultPayload';
import {
  initialInstructionStatus,
  singleResultInstructionStatus,
} from '../geekbench/instructionDataStatus';
import { isGeekbenchSignedOut } from '../geekbench/authentication';
import { extractIndividualInstructions } from '../isa/instructions';
import {
  extractBenchmarkName,
  findBenchmarkTables,
  findInstructionSetValueCell,
  findSystemTableByHeading,
  waitForElement,
} from './domUtils';
import SystemInstructionSetsComponent from './SystemInstructionSets.svelte';
import TableInstructionSetsComponent from './TableInstructionSets.svelte';
import { resultsCache } from '../cache/ResultsCache';

// Main function to annotate the Geekbench results
export async function annotateGeekbenchResults() {
  if (document.getElementById('geeklens-info')) {
    return; // page already annotated
  }

  console.log('GeekLens: Starting annotation process');
  const generation = parseGeekbenchGeneration(window.location.pathname);
  const resultId = window.location.pathname.split('/').filter(Boolean).at(-1);
  if (!generation || !resultId) return;

  // Add a small info badge to show the extension is active
  const infoElement = document.createElement('div');
  infoElement.id = 'geeklens-info';
  infoElement.classList.add('gb-extension-info');
  const initialStatus = initialInstructionStatus(generation, isGeekbenchSignedOut());
  infoElement.textContent = initialStatus.text;
  infoElement.classList.toggle('gb-extension-warning', initialStatus.type === 'warning');
  document.body.appendChild(infoElement);

  // Wait for benchmark tables to ensure page is fully rendered
  try {
    await waitForElement('table.benchmark-table');
    const instructionSets = await getInstructionSets(generation, resultId);
    if (!instructionSets) {
      const status = singleResultInstructionStatus(generation, false);
      showInfoMessage(status.text, status.type);
      return;
    }

    annotateSystemInstructionSets(generation, instructionSets);
    annotateBenchmarkTables(generation, extractIndividualInstructions(instructionSets));
    const status = singleResultInstructionStatus(generation, true);
    showInfoMessage(status.text, status.type);
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

  let instructionSets: string | null;
  if (generation === 6) {
    instructionSets = findInstructionSetValueCell()?.textContent?.trim() || null;
  } else {
    instructionSets = await fetchGeekbench7InstructionSets(resultId);
  }

  if (instructionSets) {
    await resultsCache.storeInstructionSet(generation, resultId, instructionSets);
  }
  return instructionSets;
}

async function fetchGeekbench7InstructionSets(resultId: string): Promise<string | null> {
  const response = await fetch(
    `https://browser.geekbench.com/v7/cpu/${encodeURIComponent(resultId)}.gb6`,
    { credentials: 'same-origin' },
  );
  if (!response.ok) {
    console.error(`GeekLens: Failed to fetch Geekbench 7 result ${resultId}`);
    return null;
  }

  return extractInstructionSetsFromPayload(await response.json(), 7);
}

function annotateSystemInstructionSets(generation: GeekbenchGeneration, instructionSets: string) {
  const valueCell =
    generation === 6 ? findInstructionSetValueCell() : insertGeekbench7InstructionSetRow();
  if (!valueCell || valueCell.querySelector('.gb-system-info-container')) return;

  const instructionGroups = categorizeInstructionSets(instructionSets);

  valueCell.textContent = '';
  const container = document.createElement('div');
  valueCell.appendChild(container);
  mount(SystemInstructionSetsComponent, {
    target: container,
    props: {
      instructionGroups,
    },
  });
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

      const v7Match =
        generation === 7
          ? getV7SupportedInstructions(benchmarkName, allSupportedInstructions)
          : null;
      const supportedInstructions =
        generation === 6
          ? getV6SupportedInstructions(benchmarkName, allSupportedInstructions)
          : (v7Match?.instructions ?? []);

      if (supportedInstructions.length === 0) {
        return;
      }

      // Get the cell where we'll add the instruction set badges
      const benchmarkCell = row.querySelector('td:first-child');
      if (!benchmarkCell) {
        console.error(`GeekLens: No benchmark cell found for ${benchmarkName}`);
        return;
      }

      // Create a container for the Svelte component
      const container = document.createElement('div');
      benchmarkCell.appendChild(container);

      // Create and mount the Svelte component
      mount(TableInstructionSetsComponent, {
        target: container,
        props: {
          instructions: supportedInstructions,
          confidenceNote: v7Match?.confidenceNote,
        },
      });
    });
  });
}

function showInfoMessage(text: string, type: 'info' | 'warning' = 'info') {
  const infoElement = document.getElementById('geeklens-info');
  if (!infoElement) return;
  infoElement.textContent = text;
  infoElement.classList.toggle('gb-extension-warning', type === 'warning');
}
