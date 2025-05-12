import { mount } from 'svelte';
import browser from 'webextension-polyfill';
import { categorizeInstructionSets, instructionSets } from '../data/instructionSets';
import { extractBenchmarkName, findBenchmarkTables, findCPUInfoTable, findInstructionSetsRow, waitForElement } from './domUtils';
import TableInstructionSetsComponent from './TableInstructionSets.svelte';
import SystemInstructionSetsComponent from './SystemInstructionSets.svelte';

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'annotate') {
        annotateGeekbenchResults();
    }
});

// Main function to annotate the Geekbench results
async function annotateGeekbenchResults() {

    if(document.getElementById('geeklens-info')) {
        return; // page already annotated
    }

    console.log('GeekLens: Starting annotation process');

    // Add a small info badge to show the extension is active
    const infoElement = document.createElement('div');
    infoElement.id = 'geeklens-info'
    infoElement.classList.add('gb-extension-info');
    infoElement.textContent = 'GeekLens Active';
    document.body.appendChild(infoElement);

    // Wait for benchmark tables to ensure page is fully rendered
    try {
        await waitForElement('table.benchmark-table');
        annotateBenchmarkTables();
        annotateSystemInstructionSets();
    } catch (error) {
        console.error('GeekLens: Failed to find benchmark tables', error);
    }
}

// Function to annotate benchmark tables
function annotateBenchmarkTables() {
    const benchmarkTables = findBenchmarkTables();

    if (benchmarkTables.length === 0) {
        console.error('GeekLens: No benchmark tables found');
        return;
    }

    benchmarkTables.forEach(table => {
        const rows = Array.from(table.querySelectorAll('tr'));

        rows.forEach(row => {
            // Extract benchmark name safely
            const benchmarkName = extractBenchmarkName(row);

            // Skip if no benchmark name or no instruction sets for this benchmark
            if (!benchmarkName ||
                !instructionSets[benchmarkName] ||
                instructionSets[benchmarkName].length === 0) {
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
                    instructions: instructionSets[benchmarkName]
                }
            })
        });
    });
}

// Function to annotate system instruction sets
function annotateSystemInstructionSets() {
    const cpuInfoTable = findCPUInfoTable();
    if (!cpuInfoTable) {
        console.error('GeekLens: CPU info table not found');
        return;
    }

    const instructionSetsRow = findInstructionSetsRow(cpuInfoTable);
    if (!instructionSetsRow) {
        console.error('GeekLens: Instruction sets row not found');
        return;
    }

    // Get the cell containing instruction sets - more safely
    const cells = Array.from(instructionSetsRow.querySelectorAll('td, th'));
    if (cells.length < 2) {
        console.error('GeekLens: Instruction sets row does not have enough cells');
        return;
    }

    const valueCell = cells[1];
    if (!valueCell) {
        console.error('GeekLens: Value cell not found in instruction sets row');
        return;
    }

    if (valueCell.querySelector('.gb-extension-enhanced')) {
        return;
    }

    const currentText = valueCell.textContent?.trim() || '';

    // Categorize instruction sets
    const instructionGroups = categorizeInstructionSets(currentText);

    // Clear the current content
    valueCell.innerHTML = '';

    // Create a container for the Svelte component
    const container = document.createElement('div');
    valueCell.appendChild(container);

    // Create and mount the Svelte component
    mount(SystemInstructionSetsComponent, {
        target: container,
        props: {
            instructionGroups
        }
    })
}

// Start the annotation process when the page is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', annotateGeekbenchResults);
} else {
    // Page already loaded
    annotateGeekbenchResults();
}

// Add style for the info badge
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
`;

document.head.appendChild(style);
