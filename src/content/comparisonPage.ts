import {mount} from 'svelte';
import browser from 'webextension-polyfill';
import {BENCHMARKS_V6, getV6SupportedInstructions} from '../isa/benchmarkMap';
import {categorizeInstructionSets} from '../isa/categories';
import {extractIndividualInstructions, type Instruction} from '../isa/instructions';
import {extractBenchmarkName, findBenchmarkTables, waitForElement} from './domUtils';
import SystemInstructionSetsComponent from './SystemInstructionSets.svelte';
import TableInstructionSetsComponent from './TableInstructionSets.svelte';
import {resultsCache} from "../cache/ResultsCache";

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'annotate') {
    annotateGeekbenchComparisonPage();
  }
});

// Needed as only 6.4.0 and newer actually has ISA info
function getGeekbenchVersions(): { primary: string | null; baseline: string | null } {
  const versionRows = document.querySelectorAll('tr.version');
  if (!versionRows || versionRows.length === 0) {
    return { primary: null, baseline: null };
  }

  // Find version cells
  const versionRow = versionRows[0]; // Take the first one if multiple exist
  const primaryVersionCell = versionRow.querySelector('td.document-version');
  const baselineVersionCell = primaryVersionCell?.nextElementSibling;

  const primaryVersion = primaryVersionCell?.textContent?.trim() || null;
  const baselineVersion = baselineVersionCell?.textContent?.trim() || null;

  return {
    primary: primaryVersion,
    baseline: baselineVersion
  };
}

function versionSupportsInstructionSets(version: string | null): boolean {
  if (!version) return false;

  // Extract version number (e.g., "Geekbench 6.4.0" -> "6.4.0")
  const match = version.match(/(\d+\.\d+\.\d+)/);
  if (!match) return false;

  const versionNumber = match[1];
  const [major, minor] = versionNumber.split('.').map(Number);
  return major > 6 || major === 6 && minor >= 4;
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
async function fetchInstructionSets(resultId: string, version: string | null): Promise<string | null> {
  try {
    // Check if version supports instruction sets
    if (version && !versionSupportsInstructionSets(version)) {
      console.log(`GeekLens: Skipping fetch for ${resultId}, version ${version} doesn't support instruction sets`);
      return null;
    }

    // Try to get from cache first
    const cachedInstructions = await resultsCache.getInstructionSet(resultId);
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
    const response = await fetch(`https://browser.geekbench.com/v6/cpu/compare/${resultId}/`, {
      cache: 'default',
      headers: {
        'Cache-Control': 'max-age=2592000' // HTTP cache for a month
      }
    });

    if (!response.ok) {
      console.error(`GeekLens: Failed to fetch data for result ${resultId}`);
      return null;
    }

    const htmlContent = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Find the table cell with instruction sets
    const instructionSetRows = Array.from(doc.querySelectorAll('table.system-table td.name'))
        .filter(el => el.textContent?.trim() === 'Instruction Sets');

    if (instructionSetRows.length > 0) {
      // Get the adjacent cell with the value
      const valueCell = instructionSetRows[0].nextElementSibling as HTMLElement;

      if (valueCell && valueCell.classList.contains('value')) {
        const instructionSet = valueCell.textContent?.trim() || '';

        // Store in cache
        if (instructionSet) {
          resultsCache.storeInstructionSet(resultId, instructionSet)
              .catch(err => console.error('Failed to store instruction set:', err));
        }

        return instructionSet;
      }
    }

    console.error(`GeekLens: No instruction sets found for result ${resultId}`);
    return null;
  } catch (error) {
    console.error(`GeekLens: Error fetching data for result ${resultId}:`, error);
    return null;
  }
}

// needed to reapply baseline after fetching the comparison link (removes baseline as a side effect)
async function reapplyBaseline(baseline: string) {
  const result = await fetch(`https://browser.geekbench.com/v6/cpu/baseline/${baseline}/`)
  if(!result.ok) {
    console.warn(`GeekLens: reapplying baseline failed`, result.statusText);
  }
  console.log('GeekLens: ReapplyBaseline done');
}

// Main function to annotate the comparison page
async function annotateGeekbenchComparisonPage() {
  const alreadyAnnotated = document.getElementById('geeklens-info');
  if (alreadyAnnotated) {
    return; // page already annotated
  }

  console.log('GeekLens: Starting comparison annotation process');
  showInfoMessage('GeekLens Fetching Data', 'warning');

  try {
    // Extract result IDs from URL
    const { baseline, primary } = extractResultIds();

    if (!primary || !baseline) {
      console.error('GeekLens: Could not extract primary or baseline result ID');
      return;
    }

    // Get Geekbench versions
    const { primary: primaryVersion, baseline: baselineVersion } = getGeekbenchVersions();

    const primaryFromCache = await resultsCache.getInstructionSet(primary);
    const baselineFromCache = await resultsCache.getInstructionSet(baseline);

    // Fetch instruction sets for both results, passing version info
    const [primaryInstructions, baselineInstructions] = await Promise.all([
      primaryFromCache || fetchInstructionSets(primary, primaryVersion),
      baselineFromCache || fetchInstructionSets(baseline, baselineVersion),
      waitForElement('table.comparison-benchmark-table')
    ]);


    if(!primaryFromCache && primaryInstructions || !baselineFromCache && baselineFromCache) {
      console.log('GeekLens: At least one actual fetch made, reapplying baseline')
      // non-blocking baseline reapply if needed
      reapplyBaseline(baseline);
    }

    // If at least one CPU has instruction sets, we can proceed
    if (primaryInstructions || baselineInstructions) {
      annotateSystemInstructionSets(primaryInstructions, baselineInstructions);

      const primaryInstructionSet = primaryInstructions ?
          extractIndividualInstructions(primaryInstructions) : new Set<string>();
      const baselineInstructionSet = baselineInstructions ?
          extractIndividualInstructions(baselineInstructions) : new Set<string>();

      // Annotate benchmark tables with instruction sets for each CPU
      annotateBenchmarkTables(primaryInstructionSet, baselineInstructionSet);

      showInfoMessage('GeekLens Active');
    } else {
      showInfoMessage('GeekLens: No instruction data available');
    }
  } catch (error) {
    console.error('GeekLens: Failed to annotate comparison page', error);
    showInfoMessage('GeekLens Error', 'warning');
  }
}

function annotateSystemInstructionSets(primaryInstructions: string | null, baselineInstructions: string | null) {
  if(!primaryInstructions && !baselineInstructions) {
    console.error('GeekLens: No instruction sets available');
    return;
  }

  const primaryGroups = primaryInstructions ?
      categorizeInstructionSets(primaryInstructions) : null;
  const baselineGroups = baselineInstructions ?
      categorizeInstructionSets(baselineInstructions) : null;

  const table = document.querySelector('table.system-information') as HTMLTableElement;
  if(!table) {
    console.error('GeekLens: System information table not found');
    return;
  }

  if(table.querySelector('tr[data-geeklens-instruction-sets]')) {
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
  if(primaryGroups) {
    const primaryContainer = document.createElement('div');
    primaryCell.appendChild(primaryContainer);

    mount(SystemInstructionSetsComponent, {
      target: primaryContainer,
      props: {
        instructionGroups: primaryGroups
      }
    });
  } else {
    primaryCell.textContent = 'Not available';
  }

  // Mount the baseline instruction sets component if available
  if(baselineGroups) {
    const baselineContainer = document.createElement('div');
    baselineCell.appendChild(baselineContainer);

    mount(SystemInstructionSetsComponent, {
      target: baselineContainer,
      props: {
        instructionGroups: baselineGroups
      }
    });
  } else {
    baselineCell.textContent = 'Not available';
  }
}

function annotateBenchmarkTables(primaryInstructions: Set<string>, baselineInstructions: Set<string>) {
  const benchmarkTables = findBenchmarkTables('table.comparison-benchmark-table');

  if (benchmarkTables.length === 0) {
    console.error('GeekLens: No benchmark tables found');
    return;
  }

  benchmarkTables.forEach(table => {
    const primaryRows = Array.from(table.querySelectorAll('tr.document-graph'));
    const baselineRows = Array.from(table.querySelectorAll('tr.baseline-graph'));

    // Annotate primary CPU rows
    primaryRows.forEach(row => annotateGraphRow(row, primaryInstructions, false));

    // Annotate baseline CPU rows
    baselineRows.forEach(row => annotateGraphRow(row, baselineInstructions, true));
  });
}

function annotateGraphRow(row: Element, cpuInstructions: Set<string>, isBaseline: boolean) {
  // Get the previous score row to determine the benchmark
  let scoreRow = row.previousElementSibling as HTMLTableRowElement | null;
  if (isBaseline) {
    // Baseline rows are 2 rows after the score row
    scoreRow = scoreRow?.previousElementSibling as HTMLTableRowElement | null;
  }

  if (!scoreRow || !scoreRow.classList.contains('scores')) {
    return;
  }

  const benchmarkName = extractBenchmarkName(scoreRow);
  if (!benchmarkName || !BENCHMARKS_V6[benchmarkName]?.instructions?.length) {
    return;
  }

  const supportedInstructions = getV6SupportedInstructions(benchmarkName, cpuInstructions);
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
  if (cpuCell.querySelector('.gb-extension-instruction-list')) {
    console.warn(`Already annotated`);
    return;
  }

  // Add the instruction badges
  addInstructionBadges(cpuCell, supportedInstructions);
}

function addInstructionBadges(cell: Element, instructions: Instruction[]) {
  const container = document.createElement('div');
  cell.appendChild(container);

  // Create and mount the Svelte component
  mount(TableInstructionSetsComponent, {
    target: container,
    props: {
      instructions: instructions
    }
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
  if(type === 'warning') {
    infoElement.classList.add( 'gb-extension-warning');
  }
  infoElement.textContent = text;
  document.body.appendChild(infoElement);
}

// Start the annotation process when the page is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', annotateGeekbenchComparisonPage);
} else {
  // Page already loaded
  annotateGeekbenchComparisonPage();
}

// Add styles for the info badge
const style = document.createElement('style');
style.textContent = `
  .gb-extension-info {
    position: fixed;
    bottom: 10px;
    right: 10px;
    padding: 5px 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    border-radius: 3px;
    font-size: 10px;
    z-index: 1000;
  }
  
  .gb-extension-warning {
    background-color: rgba(255, 152, 0, 0.8);
  }
  
`;

document.head.appendChild(style);
