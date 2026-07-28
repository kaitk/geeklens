import { categorizeInstructionSets } from '../isa/categories';
import { extractIndividualInstructions } from '../isa/instructions';
import {
  parseGeekbenchGeneration,
  versionSupportsInstructionSets,
  type GeekbenchGeneration,
} from '../geekbench/generation';
import { fetchInstructionSetsFromPayload } from '../geekbench/resultPayloadClient';
import { comparisonUrl } from '../geekbench/urls';
import {
  comparisonInstructionStatus,
  initialInstructionStatus,
} from '../geekbench/instructionDataStatus';
import { isGeekbenchSignedOut } from '../geekbench/authentication';
import { workloadInstructions } from '../isa/workloadInstructions';
import {
  extractBenchmarkName,
  findBenchmarkTables,
  findComparisonScoreRow,
  findInstructionSetValueCell,
  getComparisonVersions,
  waitForElement,
} from './domUtils';
import { mountSystemInstructionSets, mountWorkloadBadges } from './mountBadges';
import { isPageAnnotated, showStatus } from './statusBanner';
import { resultsCache } from '../cache/ResultsCache';
import { withClearedComparisonBaseline } from './comparisonBaseline';

// Extract result IDs from the URL
function extractResultIds(): { baseline: string | null; primary: string | null } {
  const url = new URL(window.location.href);
  const pathParts = url.pathname.split('/');

  // URL format: /v6/cpu/compare/[primary]?baseline=[baseline]
  return {
    primary: pathParts[pathParts.length - 1] || null,
    baseline: url.searchParams.get('baseline'),
  };
}

/**
 * Geekbench 6 exposes instruction sets in result-page HTML.
 *
 * Using the exact compare url without a baseline as:
 * 1. API requires logging in
 * 2. Any other url redirects back to this page (that has no ISA info)
 */
async function fetchInstructionSetsFromHtml(
  generation: GeekbenchGeneration,
  resultId: string,
): Promise<string | null> {
  const response = await fetch(comparisonUrl(generation, resultId), {
    cache: 'default',
    credentials: 'same-origin',
    headers: {
      'Cache-Control': 'max-age=2592000', // HTTP cache for a month
    },
  });

  if (!response.ok) {
    console.error(`GeekLens: Failed to fetch data for result ${resultId}`);
    return null;
  }

  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  const valueCell = findInstructionSetValueCell(doc);
  if (!valueCell?.classList.contains('value')) {
    console.error(`GeekLens: No instruction sets found for result ${resultId}`);
    return null;
  }

  return valueCell.textContent?.trim() || null;
}

// currently not using API due to redirect issues
async function loadInstructionSets(
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
    const cached = await resultsCache.getInstructionSet(generation, resultId);
    if (cached) {
      console.log(`GeekLens: Using cached instruction set for ${resultId}`);
      return cached;
    }

    console.log(`GeekLens: Fetching instruction set for ${resultId}`);
    const instructionSet =
      generation === 7
        ? await fetchInstructionSetsFromPayload(generation, resultId)
        : await fetchInstructionSetsFromHtml(generation, resultId);

    if (instructionSet) {
      await resultsCache.storeInstructionSet(generation, resultId, instructionSet);
    }
    return instructionSet;
  } catch (error) {
    console.error(`GeekLens: Error fetching data for result ${resultId}:`, error);
    return null;
  }
}

// Main function to annotate the comparison page
export async function annotateGeekbenchComparisonPage() {
  if (isPageAnnotated()) {
    return; // page already annotated
  }

  console.log('GeekLens: Starting comparison annotation process');

  try {
    const generation = parseGeekbenchGeneration(window.location.pathname);
    if (!generation) {
      showStatus({ text: 'GeekLens: Unsupported Geekbench version', type: 'warning' });
      return;
    }
    const signedOut = isGeekbenchSignedOut();
    showStatus(initialInstructionStatus(generation, signedOut));

    // Extract result IDs from URL
    const { baseline, primary } = extractResultIds();

    if (!primary || !baseline) {
      console.error('GeekLens: Could not extract primary or baseline result ID');
      return;
    }

    // Get Geekbench versions
    const { primary: primaryVersion, baseline: baselineVersion } = getComparisonVersions();

    const primaryCached = await resultsCache.getInstructionSet(generation, primary);
    const baselineCached = await resultsCache.getInstructionSet(generation, baseline);
    await waitForElement('table.comparison-benchmark-table');

    if (generation === 7 && signedOut && (!primaryCached || !baselineCached)) {
      console.log('GeekLens: Signed out of Geekbench 7, skipping payload fetch');
    }

    let primaryInstructions = primaryCached;
    let baselineInstructions = baselineCached;
    const needsPrimaryFetch =
      !primaryInstructions &&
      (primaryVersion === null || versionSupportsInstructionSets(primaryVersion));
    const needsBaselineFetch =
      !baselineInstructions &&
      (baselineVersion === null || versionSupportsInstructionSets(baselineVersion));
    const needsFetch = needsPrimaryFetch || needsBaselineFetch;
    const cannotFetch = generation === 7 && signedOut;

    if (needsFetch && !cannotFetch) {
      await withClearedComparisonBaseline(generation, primary, baseline, async () => {
        [primaryInstructions, baselineInstructions] = await Promise.all([
          needsPrimaryFetch
            ? loadInstructionSets(generation, primary, primaryVersion)
            : primaryInstructions,
          needsBaselineFetch
            ? loadInstructionSets(generation, baseline, baselineVersion)
            : baselineInstructions,
        ]);
      });
    }

    // If at least one CPU has instruction sets, we can proceed
    if (primaryInstructions || baselineInstructions) {
      annotateSystemInstructionSets(primaryInstructions, baselineInstructions);

      // Annotate benchmark tables with instruction sets for each CPU
      annotateBenchmarkTables(
        generation,
        extractIndividualInstructions(primaryInstructions),
        extractIndividualInstructions(baselineInstructions),
      );
    }

    showStatus(
      comparisonInstructionStatus(
        generation,
        Boolean(primaryInstructions),
        Boolean(baselineInstructions),
        {
          primary:
            generation === 6 &&
            primaryVersion !== null &&
            !versionSupportsInstructionSets(primaryVersion),
          baseline:
            generation === 6 &&
            baselineVersion !== null &&
            !versionSupportsInstructionSets(baselineVersion),
        },
      ),
    );
  } catch (error) {
    console.error('GeekLens: Failed to annotate comparison page', error);
    showStatus({ text: 'GeekLens Error', type: 'warning' });
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

  // One cell per compared result, in the page's primary-then-baseline order.
  for (const instructionSets of [primaryInstructions, baselineInstructions]) {
    const cell = document.createElement('td');
    newRow.appendChild(cell);

    if (instructionSets) {
      mountSystemInstructionSets(cell, categorizeInstructionSets(instructionSets));
    } else {
      cell.textContent = 'Not available';
    }
  }

  // Add the row to the table
  const tbody = table.querySelector('tbody') || table;
  tbody.appendChild(newRow);
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
    // Annotate primary CPU rows
    table
      .querySelectorAll('tr.document-graph')
      .forEach((row) => annotateGraphRow(generation, row, primaryInstructions, false));

    // Annotate baseline CPU rows
    table
      .querySelectorAll('tr.baseline-graph')
      .forEach((row) => annotateGraphRow(generation, row, baselineInstructions, true));
  });
}

function annotateGraphRow(
  generation: GeekbenchGeneration,
  row: Element,
  cpuInstructions: Set<string>,
  isBaseline: boolean,
) {
  // Get the previous score row to determine the benchmark. Summary rows
  // (Single-/Multi-Core Score) have no `.scores` row and are skipped here.
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

  // Get the cell with the CPU name
  const cpuCell = row.querySelector('td:first-child');
  if (!cpuCell) {
    console.error(`GeekLens: No CPU cell found in row`);
    return;
  }

  // Check if already annotated
  if (cpuCell.querySelector('[data-geeklens-instructions]')) {
    console.warn(`Already annotated`);
    return;
  }

  mountWorkloadBadges(cpuCell, instructions, confidenceNote);
}
