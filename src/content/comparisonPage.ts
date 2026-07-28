import { mount } from 'svelte';
import { getV6SupportedInstructions } from '../isa/benchmarkMap';
import { getV7SupportedInstructions } from '../isa/benchmarkMapV7';
import { categorizeInstructionSets } from '../isa/categories';
import { extractIndividualInstructions, type Instruction } from '../isa/instructions';
import { parseGeekbenchGeneration, type GeekbenchGeneration } from '../geekbench/generation';
import { extractInstructionSetsFromPayload } from '../geekbench/resultPayload';
import {
  comparisonInstructionStatus,
  initialInstructionStatus,
} from '../geekbench/instructionDataStatus';
import { isGeekbenchSignedOut } from '../geekbench/authentication';
import {
  extractBenchmarkName,
  findBenchmarkTables,
  findComparisonScoreRow,
  findInstructionSetValueCell,
  getComparisonVersions,
  waitForElement,
} from './domUtils';
import SystemInstructionSetsComponent from './SystemInstructionSets.svelte';
import TableInstructionSetsComponent from './TableInstructionSets.svelte';
import { resultsCache } from '../cache/ResultsCache';

function versionSupportsInstructionSets(version: string | null): boolean {
  if (!version) return false;

  // Extract version number (e.g., "Geekbench 6.4.0" -> "6.4.0")
  const match = version.match(/(\d+\.\d+\.\d+)/);
  if (!match) return false;

  const versionNumber = match[1];
  const [major, minor] = versionNumber.split('.').map(Number);
  return major > 6 || (major === 6 && minor >= 4);
}

// Extract result IDs from the URL
function extractResultIds(): { baseline?: string; primary?: string } {
  const url = new URL(window.location.href);
  const pathParts = url.pathname.split('/');

  // URL format: /v6/cpu/compare/[primary]?baseline=[baseline]
  const primary = pathParts[pathParts.length - 1];
  const baseline = url.searchParams.get('baseline') as string;

  return { baseline, primary };
}

// Fetch instruction sets from Geekbench
// currently not using API due to redirect issues
async function fetchInstructionSets(
  generation: GeekbenchGeneration,
  resultId: string,
  version: string | null,
): Promise<string | null> {
  try {
    // Check if version supports instruction sets
    if (version && !versionSupportsInstructionSets(version)) {
      console.log(
        `GeekLens: Skipping fetch for ${resultId}, version ${version} doesn't support instruction sets`,
      );
      return null;
    }

    // Try to get from cache first
    const cachedInstructions = await resultsCache.getInstructionSet(generation, resultId);
    if (cachedInstructions) {
      console.log(`GeekLens: Using cached instruction set for ${resultId}`);
      return cachedInstructions;
    }

    // If not in cache, fetch from the page
    console.log(`GeekLens: Fetching instruction set for ${resultId}`);
    // Using the exact compare url without a baseline as:
    // 1. API requires logging in
    // 2. Any other url redirects back to this page (that has no ISA info)
    // This allows getting the data, but the baseline has to be reapplied later
    const response = await fetch(
      generation === 7
        ? `https://browser.geekbench.com/v7/cpu/${encodeURIComponent(resultId)}.gb6`
        : `https://browser.geekbench.com/v6/cpu/compare/${encodeURIComponent(resultId)}/`,
      {
        cache: 'default',
        credentials: 'same-origin',
        headers: {
          'Cache-Control': 'max-age=2592000', // HTTP cache for a month
        },
      },
    );

    if (!response.ok) {
      console.error(`GeekLens: Failed to fetch data for result ${resultId}`);
      return null;
    }

    if (generation === 7) {
      const instructionSet = extractInstructionSetsFromPayload(await response.json(), 7);
      if (instructionSet) {
        await resultsCache.storeInstructionSet(7, resultId, instructionSet);
      }
      return instructionSet;
    }

    const htmlContent = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Find the table cell with instruction sets
    const valueCell = findInstructionSetValueCell(doc);
    if (valueCell?.classList.contains('value')) {
      const instructionSet = valueCell.textContent?.trim() || '';

      // Store in cache
      if (instructionSet) {
        resultsCache
          .storeInstructionSet(6, resultId, instructionSet)
          .catch((err) => console.error('Failed to store instruction set:', err));
      }

      return instructionSet;
    }

    console.error(`GeekLens: No instruction sets found for result ${resultId}`);
    return null;
  } catch (error) {
    console.error(`GeekLens: Error fetching data for result ${resultId}:`, error);
    return null;
  }
}

// needed to reapply baseline after fetching the comparison link (removes baseline as a side effect)
async function clearBaseline(generation: GeekbenchGeneration, primary: string) {
  const result = await fetch(
    `https://browser.geekbench.com/v${generation}/cpu/compare/${encodeURIComponent(primary)}/`,
    { credentials: 'same-origin' },
  );
  if (!result.ok) {
    console.warn('GeekLens: clearing baseline failed', result.statusText);
  }
}

async function reapplyBaseline(generation: GeekbenchGeneration, baseline: string) {
  const result = await fetch(
    `https://browser.geekbench.com/v${generation}/cpu/baseline/${encodeURIComponent(baseline)}/`,
    { credentials: 'same-origin' },
  );
  if (!result.ok) {
    console.warn(`GeekLens: reapplying baseline failed`, result.statusText);
  }
  console.log('GeekLens: ReapplyBaseline done');
}

// Main function to annotate the comparison page
export async function annotateGeekbenchComparisonPage() {
  const alreadyAnnotated = document.getElementById('geeklens-info');
  if (alreadyAnnotated) {
    return; // page already annotated
  }

  console.log('GeekLens: Starting comparison annotation process');

  try {
    const generation = parseGeekbenchGeneration(window.location.pathname);
    if (!generation) {
      showInfoMessage('GeekLens: Unsupported Geekbench version', 'warning');
      return;
    }
    const initialStatus = initialInstructionStatus(generation, isGeekbenchSignedOut());
    showInfoMessage(initialStatus.text, initialStatus.type);

    // Extract result IDs from URL
    const { baseline, primary } = extractResultIds();

    if (!primary || !baseline) {
      console.error('GeekLens: Could not extract primary or baseline result ID');
      return;
    }

    // Get Geekbench versions
    const { primary: primaryVersion, baseline: baselineVersion } = getComparisonVersions();

    const primaryFromCache = await resultsCache.getInstructionSet(generation, primary);
    const baselineFromCache = await resultsCache.getInstructionSet(generation, baseline);
    await waitForElement('table.comparison-benchmark-table');

    let primaryInstructions = primaryFromCache;
    let baselineInstructions = baselineFromCache;
    const needsFetch = !primaryInstructions || !baselineInstructions;

    if (generation === 7 && needsFetch) {
      // Geekbench's .gb6 result endpoint only works while no comparison baseline
      // is selected for the current session.
      await clearBaseline(generation, primary);
      primaryInstructions ||= await fetchInstructionSets(generation, primary, primaryVersion);
      baselineInstructions ||= await fetchInstructionSets(generation, baseline, baselineVersion);
    } else if (generation === 6) {
      [primaryInstructions, baselineInstructions] = await Promise.all([
        primaryInstructions || fetchInstructionSets(generation, primary, primaryVersion),
        baselineInstructions || fetchInstructionSets(generation, baseline, baselineVersion),
      ]);
    }

    if (
      (!primaryFromCache && primaryInstructions) ||
      (!baselineFromCache && baselineInstructions)
    ) {
      console.log('GeekLens: At least one actual fetch made, reapplying baseline');
      // non-blocking baseline reapply if needed
      reapplyBaseline(generation, baseline);
    }

    // If at least one CPU has instruction sets, we can proceed
    if (primaryInstructions || baselineInstructions) {
      annotateSystemInstructionSets(primaryInstructions, baselineInstructions);

      const primaryInstructionSet = primaryInstructions
        ? extractIndividualInstructions(primaryInstructions)
        : new Set<string>();
      const baselineInstructionSet = baselineInstructions
        ? extractIndividualInstructions(baselineInstructions)
        : new Set<string>();

      // Annotate benchmark tables with instruction sets for each CPU
      annotateBenchmarkTables(generation, primaryInstructionSet, baselineInstructionSet);

      const status = comparisonInstructionStatus(
        generation,
        Boolean(primaryInstructions),
        Boolean(baselineInstructions),
      );
      showInfoMessage(status.text, status.type);
    } else {
      const status = comparisonInstructionStatus(generation, false, false);
      showInfoMessage(status.text, status.type);
    }
  } catch (error) {
    console.error('GeekLens: Failed to annotate comparison page', error);
    showInfoMessage('GeekLens Error', 'warning');
  }
}

function annotateSystemInstructionSets(
  primaryInstructions: string | null,
  baselineInstructions: string | null,
) {
  if (!primaryInstructions && !baselineInstructions) {
    console.error('GeekLens: No instruction sets available');
    return;
  }

  const primaryGroups = primaryInstructions ? categorizeInstructionSets(primaryInstructions) : null;
  const baselineGroups = baselineInstructions
    ? categorizeInstructionSets(baselineInstructions)
    : null;

  const table = document.querySelector('table.system-information') as HTMLTableElement;
  if (!table) {
    console.error('GeekLens: System information table not found');
    return;
  }

  if (table.querySelector('tr[data-geeklens-instruction-sets]')) {
    return; // Already added
  }

  const newRow = document.createElement('tr');
  newRow.setAttribute('data-geeklens-instruction-sets', 'true');

  const labelCell = document.createElement('td');
  labelCell.textContent = 'Instruction Sets';
  newRow.appendChild(labelCell);

  const primaryCell = document.createElement('td');
  newRow.appendChild(primaryCell);

  // Create baseline instruction sets cell
  const baselineCell = document.createElement('td');
  newRow.appendChild(baselineCell);

  // Add the row to the table
  const tbody = table.querySelector('tbody') || table;
  tbody.appendChild(newRow);

  // Mount the primary instruction sets component if available
  if (primaryGroups) {
    const primaryContainer = document.createElement('div');
    primaryCell.appendChild(primaryContainer);

    mount(SystemInstructionSetsComponent, {
      target: primaryContainer,
      props: {
        instructionGroups: primaryGroups,
      },
    });
  } else {
    primaryCell.textContent = 'Not available';
  }

  // Mount the baseline instruction sets component if available
  if (baselineGroups) {
    const baselineContainer = document.createElement('div');
    baselineCell.appendChild(baselineContainer);

    mount(SystemInstructionSetsComponent, {
      target: baselineContainer,
      props: {
        instructionGroups: baselineGroups,
      },
    });
  } else {
    baselineCell.textContent = 'Not available';
  }
}

function annotateBenchmarkTables(
  generation: GeekbenchGeneration,
  primaryInstructions: Set<string>,
  baselineInstructions: Set<string>,
) {
  const benchmarkTables = findBenchmarkTables('table.comparison-benchmark-table');

  if (benchmarkTables.length === 0) {
    console.error('GeekLens: No benchmark tables found');
    return;
  }

  benchmarkTables.forEach((table) => {
    const primaryRows = Array.from(table.querySelectorAll('tr.document-graph'));
    const baselineRows = Array.from(table.querySelectorAll('tr.baseline-graph'));

    // Annotate primary CPU rows
    primaryRows.forEach((row) => annotateGraphRow(generation, row, primaryInstructions, false));

    // Annotate baseline CPU rows
    baselineRows.forEach((row) => annotateGraphRow(generation, row, baselineInstructions, true));
  });
}

function annotateGraphRow(
  generation: GeekbenchGeneration,
  row: Element,
  cpuInstructions: Set<string>,
  isBaseline: boolean,
) {
  // Get the previous score row to determine the benchmark
  const scoreRow = findComparisonScoreRow(row, isBaseline);
  if (!scoreRow) return;

  const benchmarkName = extractBenchmarkName(scoreRow);
  if (!benchmarkName) return;

  const v7Match =
    generation === 7 ? getV7SupportedInstructions(benchmarkName, cpuInstructions) : null;
  const supportedInstructions =
    generation === 6
      ? getV6SupportedInstructions(benchmarkName, cpuInstructions)
      : (v7Match?.instructions ?? []);
  if (supportedInstructions.length === 0) {
    return;
  }

  // Get the cell with the CPU name
  const cpuCell = row.querySelector('td:first-child');
  if (!cpuCell) {
    console.error(`GeekLens: No CPU cell found in row`);
    return;
  }

  // Check if already annotated
  if (cpuCell.querySelector('.gb-instruction-container')) {
    console.warn(`Already annotated`);
    return;
  }

  // Add the instruction badges
  addInstructionBadges(cpuCell, supportedInstructions, v7Match?.confidenceNote);
}

function addInstructionBadges(cell: Element, instructions: Instruction[], confidenceNote?: string) {
  const container = document.createElement('div');
  cell.appendChild(container);

  // Create and mount the Svelte component
  mount(TableInstructionSetsComponent, {
    target: container,
    props: {
      instructions: instructions,
      confidenceNote,
    },
  });
}

function showInfoMessage(text: string, type: 'info' | 'warning' = 'info') {
  // Remove any existing messages
  const existingMessage = document.getElementById('geeklens-info');
  if (existingMessage) {
    existingMessage.remove();
  }

  const infoElement = document.createElement('div');
  infoElement.id = 'geeklens-info';
  infoElement.classList.add('gb-extension-info');
  if (type === 'warning') {
    infoElement.classList.add('gb-extension-warning');
  }
  infoElement.textContent = text;
  document.body.appendChild(infoElement);
}
