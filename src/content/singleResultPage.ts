import { mount } from 'svelte';
import browser from 'webextension-polyfill';
import { BENCHMARKS_V6, getV6SupportedInstructions } from '../isa/benchmarkMap';
import { categorizeInstructionSets } from '../isa/categories';
import { extractBenchmarkName, findBenchmarkTables, waitForElement } from './domUtils';
import SystemInstructionSetsComponent from './SystemInstructionSets.svelte';
import TableInstructionSetsComponent from './TableInstructionSets.svelte';
import {resultsCache} from "../cache/ResultsCache";

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'annotate') {
        annotateGeekbenchResults();
    }
});

// Main function to annotate the Geekbench results
async function annotateGeekbenchResults() {

    if (document.getElementById('geeklens-info')) {
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
        await waitForElement('table.system-table');
        const groups = findAndAnnotateSystemInstructionSets();

        if(!groups) return;
        const supportedInstructions = new Set<string>();
        Object.values(groups).forEach(instructionList => {
            instructionList.forEach(instruction => {
                supportedInstructions.add(instruction.toUpperCase());
            });
        });
        annotateBenchmarkTables(supportedInstructions);
    } catch (error) {
        console.error('GeekLens: Failed to find benchmark tables', error);
    }
}


function findAndAnnotateSystemInstructionSets() {
    const cells = document.querySelectorAll('table.system-table tbody tr td.name')
    const valueCell = Array.from(cells)
        .find(td => td.textContent?.trim() === 'Instruction Sets')
        ?.nextElementSibling;

    if (!valueCell) {
        console.error('GeekLens: Instruction sets value cell not found');
        return;
    }


    const currentText = valueCell.textContent?.trim() || '';

    // Store the text in indexDB:
    const urlParts = window.location.pathname.split('/');
    const resultId = urlParts[urlParts.length - 1];

    // Store in IndexedDB
    if (resultId && currentText) {
        resultsCache.storeInstructionSet(resultId, currentText)
            .catch(err => console.error('Failed to store instruction set:', err));
    }

    // Categorize instruction sets
    const instructionGroups = categorizeInstructionSets(currentText);
    if (valueCell.querySelector('.gb-extension-enhanced')) {
        return instructionGroups;
    }


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

    return instructionGroups;
}

function annotateBenchmarkTables(allSupportedInstructions: Set<string>) {
    const benchmarkTables = findBenchmarkTables();

    if (benchmarkTables.length === 0) {
        console.error('GeekLens: No benchmark tables found');
        return;
    }

    benchmarkTables.forEach(table => {
        const rows = Array.from(table.querySelectorAll('tr'));

        rows.forEach(row => {
            const benchmarkName = extractBenchmarkName(row);
            if (!benchmarkName || !BENCHMARKS_V6[benchmarkName].instructions?.length) {
                return;
            }

            const supportedInstructions = getV6SupportedInstructions(benchmarkName, allSupportedInstructions);

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
                    instructions: supportedInstructions
                }
            })
        });
    });
}

// Start the annotation process when the page is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', annotateGeekbenchResults);
} else {
    // Page already loaded
    annotateGeekbenchResults();
}

// Add style for the info badge and fix overflow issue in RISC-V tables
const style = document.createElement('style');
style.textContent = `
  table.system-table td {
    word-break: break-all;
    overflow-wrap: break-word;
  }

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
