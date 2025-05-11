import { instructionSets, categorizeInstructionSets } from '../data/instructionSets';
import { findBenchmarkTables, findCPUInfoTable, findInstructionSetsRow, extractBenchmarkName } from './domUtils';
import InstructionBadgeComponent from './InstructionBadge.svelte';
import SystemInstructionSetsComponent from './SystemInstructionSets.svelte';
import browser from 'webextension-polyfill';
import {mount} from "svelte";

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'annotate') {
        annotateGeekbenchResults();
    }
});



// Main function to annotate the Geekbench results
function annotateGeekbenchResults() {
    console.log('GeekLens: Starting annotation process');

    // Add a small info badge to show the extension is active
    const infoElement = document.createElement('div');
    infoElement.classList.add('gb-extension-info');
    infoElement.textContent = 'GeekLens Active';
    document.body.appendChild(infoElement);

    // Find all benchmark tables with a slight delay to ensure page is fully rendered
    setTimeout(() => {
        annotateBenchmarkTables();
        annotateSystemInstructionSets();
    }, 500);
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
            mount(InstructionBadgeComponent, {
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

    const currentText = valueCell.textContent?.trim() || '';

    // Categorize instruction sets
    const instructionGroups = categorizeInstructionSets(currentText);

    // Clear the current content
    valueCell.innerHTML = '';

    // Create a container for the Svelte component
    const container = document.createElement('div');
    valueCell.appendChild(container);

    console.warn('GOT GROUPS', instructionGroups)
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
