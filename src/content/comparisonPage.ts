import { mount } from 'svelte';
import browser from 'webextension-polyfill';
import { BENCHMARKS_V6, getV6SupportedInstructions } from '../isa/benchmarkMap';
import { categorizeInstructionSets } from '../isa/categories';
import { extractIndividualInstructions, type Instruction } from '../isa/instructions';
import { extractBenchmarkName, findBenchmarkTables, waitForElement } from './domUtils';
import SystemInstructionSetsComponent from './SystemInstructionSets.svelte';
import TableInstructionSetsComponent from './TableInstructionSets.svelte';

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'annotate') {
    annotateGeekbenchComparisonPage();
  }
});

// Check if user is logged in
function isUserLoggedIn(): boolean {
  const accountLink = document.querySelector('#navbarDropdownAccount');
  if (!accountLink) return false;

  const linkText = accountLink.textContent?.trim() || '';
  return linkText !== 'Account';
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

function showRedirectMessage(redirectUrl: string): void {
  const existingMessage = document.getElementById('geeklens-redirect');
  if (existingMessage) {
    existingMessage.remove();
  }

  // FIXME ugly hacks in a row, make the whole info badge into a svelte component later
  const redirectElement = document.createElement('div');
  redirectElement.id = 'geeklens-redirect';
  redirectElement.classList.add('gb-extension-info', 'gb-extension-redirect');

  // Create container for better formatting
  const container = document.createElement('div');
  container.style.maxWidth = '300px';
  redirectElement.appendChild(container);

  // Header text
  const header = document.createElement('p');
  header.textContent = 'Geekbench API redirect loop detected! To fix:';
  header.style.fontWeight = 'bold';
  header.style.marginBottom = '6px';
  container.appendChild(header);

  // Steps list
  const instructions = document.createElement('ol');
  instructions.style.margin = '0';
  instructions.style.paddingLeft = '20px';
  container.appendChild(instructions);

  // Step 1 with inline link
  const step1 = document.createElement('li');
  step1.style.marginBottom = '4px';

  const step1Text = document.createTextNode('Visit ');
  step1.appendChild(step1Text);

  const link = document.createElement('a');
  link.href = redirectUrl;
  link.textContent = 'this comparison link';
  link.style.color = 'white';
  link.style.textDecoration = 'underline';
  step1.appendChild(link);

  step1.appendChild(document.createTextNode(' (without baseline param)'));
  instructions.appendChild(step1);

  // Step 2
  const step2 = document.createElement('li');
  step2.textContent = 'Press "Back" to return to this page';
  instructions.appendChild(step2);
  // Step 3
  const step3 = document.createElement('li');
  step3.textContent = 'Refresh this page';
  instructions.appendChild(step3);


  document.body.appendChild(redirectElement);
}

// Fetch instruction sets from Geekbench API
async function fetchInstructionSets(resultId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://browser.geekbench.com/v6/cpu/${resultId}.gb6`, {
      cache: 'default',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'max-age=2592000' // cache for a month
      },
      redirect: 'manual',
    });

    console.warn('GOT response', response.statusText, response.status ,response.headers.get('Location'))
    // Check for redirect (302 Found)
    if ([301, 302, 307, 308].includes(response.status)) {
      const redirectUrl = response.headers.get('Location');
      if (redirectUrl) {
        console.warn('GeekLens: Geekbench API request demands a redirect to', redirectUrl, '. Adding clickable link.');
        showRedirectMessage(redirectUrl);
        return null;
      }
    }

    if(response.status === 0) {
      // FIXME a hack when fetch still follows the redirect so just the comparison url without the searchParam, that
      // https://browser.geekbench.com/v6/cpu/compare/ID1?baseline=ID2 ->  https://browser.geekbench.com/v6/cpu/compare/ID1
      // This is an ugly hack but fixes the issue of "redirect loop"
      const redirectUrl = window.location.href.split('?')[0]
      showRedirectMessage(redirectUrl);
    }

    // Handle non-redirect responses
    if (!response.ok) {
      console.error(`GeekLens: Failed to fetch data for result ${resultId}, status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const instructionMetric = data.metrics?.find((metric: any) => metric.id === 20000);

    if (instructionMetric) {
      return instructionMetric.value;
    }

    console.error(`GeekLens: No instruction sets found for result ${resultId}`);
    return null;
  } catch (error) {
    console.error(`GeekLens: Error fetching data for result ${resultId}:`, error);
    return null;
  }
}

// Main function to annotate the comparison page
async function annotateGeekbenchComparisonPage() {
  // Check if already annotated (but allow redirect messages to be shown)
  const alreadyAnnotated = document.getElementById('geeklens-info');
  if (alreadyAnnotated && !document.getElementById('geeklens-redirect')) {
    return; // page already annotated and not showing a redirect
  }

  console.log('GeekLens: Starting comparison annotation process');

  // Check if user is logged in
  if (!isUserLoggedIn()) {
    console.log('GeekLens: User not logged in, cannot fetch instruction sets');
    showLoginRequiredMessage();
    return;
  }

  // Add info badge
  const existingInfo = document.getElementById('geeklens-info');
  if (!existingInfo) {
    const infoElement = document.createElement('div');
    infoElement.id = 'geeklens-info';
    infoElement.classList.add('gb-extension-info');
    infoElement.textContent = 'GeekLens Active';
    document.body.appendChild(infoElement);
  }

  // Wait for benchmark tables to ensure page is fully rendered
  try {
    // Extract result IDs from URL
    const { baseline, primary } = extractResultIds();

    if (!primary || !baseline) {
      console.error('GeekLens: Could not extract primary or baseline result ID');
      return;
    }

    // Fetch instruction sets for both results
    const [primaryInstructions, baselineInstructions] = await Promise.all([
      fetchInstructionSets(primary),
      fetchInstructionSets(baseline),
      waitForElement('table.comparison-benchmark-table')
    ]);

    // Only continue with annotation if we have valid instruction sets
    if (primaryInstructions && baselineInstructions) {
      // Clear any redirect messages if we now have valid data
      const redirectMessage = document.getElementById('geeklens-redirect');
      if (redirectMessage) {
        redirectMessage.remove();
      }

      annotateSystemInstructionSets(primaryInstructions, baselineInstructions);

      const primaryInstructionSet = extractIndividualInstructions(primaryInstructions);
      const baselineInstructionSet = extractIndividualInstructions(baselineInstructions);
      // Annotate benchmark tables with instruction sets for each CPU
      annotateBenchmarkTables(primaryInstructionSet, baselineInstructionSet);
    }

  } catch (error) {
    console.error('GeekLens: Failed to annotate comparison page', error);
  }
}

function annotateSystemInstructionSets(primaryInstructions: string | null, baselineInstructions: string | null) {
  if(!primaryInstructions || !baselineInstructions) {
    console.error('GeekLens: Failed to fetch instruction sets');
    return;
  }

  const primaryGroups = categorizeInstructionSets(primaryInstructions);
  const baselineGroups = categorizeInstructionSets(baselineInstructions);

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

  // Mount the primary instruction sets component
  if(primaryInstructions) {
    const primaryContainer = document.createElement('div');
    primaryCell.appendChild(primaryContainer);

    mount(SystemInstructionSetsComponent, {
      target: primaryContainer,
      props: {
        instructionGroups: primaryGroups
      }
    });
  }

  // Mount the baseline instruction sets component
  if(baselineInstructions) {
    const baselineContainer = document.createElement('div');
    baselineCell.appendChild(baselineContainer);

    mount(SystemInstructionSetsComponent, {
      target: baselineContainer,
      props: {
        instructionGroups: baselineGroups
      }
    });
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

function showLoginRequiredMessage() {
  // Remove any existing messages
  const existingMessage = document.getElementById('geeklens-info');
  if (existingMessage) {
    existingMessage.remove();
  }

  const infoElement = document.createElement('div');
  infoElement.id = 'geeklens-info';
  infoElement.classList.add('gb-extension-info', 'gb-extension-warning');
  infoElement.textContent = 'GeekLens: Login required for comparison pages';
  document.body.appendChild(infoElement);
}

// Start the annotation process when the page is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', annotateGeekbenchComparisonPage);
} else {
  // Page already loaded
  annotateGeekbenchComparisonPage();
}

// Add styles for the info badge and redirect link
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
  
  .gb-extension-redirect {
    background-color: rgba(33, 150, 243, 0.9);
    cursor: pointer;
    padding: 8px 12px;
    bottom: 40px;
  }
  
  .gb-extension-redirect a {
    color: white;
    text-decoration: underline;
  }
  
  .gb-extension-redirect a:hover {
    text-decoration: none;
  }
`;

document.head.appendChild(style);
