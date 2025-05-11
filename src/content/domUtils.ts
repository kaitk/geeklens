export function waitForElement(selector: string, timeout = 5000): Promise<Element> {
    return new Promise((resolve, reject) => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector) as Element);
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector) as Element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout waiting for element: ${selector}`));
        }, timeout);
    });
}

/**
 * Finds benchmark tables on the Geekbench results page
 *
 * The actual structure of the Geekbench page has tables for:
 * - Single-Core Score with benchmark rows
 * - Multi-Core Score with benchmark rows
 */
export function findBenchmarkTables(): HTMLTableElement[] {
    return Array.from(document.querySelectorAll('table.benchmark-table')) as HTMLTableElement[];
}

/**
 * Finds the CPU Information table on the Geekbench results page
 */
export function findCPUInfoTable(): HTMLTableElement | null {
    const allTables = Array.from(document.querySelectorAll('table')) as HTMLTableElement[];

    // Look for a table with a row containing "Instruction Sets"
    for (const table of allTables) {
        const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[];

        for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('td, th'));
            if (cells.length < 2) continue;

            const firstCell = cells[0];
            if (firstCell?.textContent?.trim() === "Instruction Sets") {
                return table;
            }
        }
    }

    // Alternative: look for a table with a preceding h2 containing "CPU Information"
    for (const table of allTables) {
        const prevElement = table.previousElementSibling;
        if (prevElement && prevElement.tagName === 'H2' &&
            prevElement.textContent?.trim().includes('CPU Information')) {
            return table;
        }
    }

    return null;
}

/**
 * Finds the row containing instruction sets in the CPU info table
 */
export function findInstructionSetsRow(table: HTMLTableElement): HTMLTableRowElement | null {
    const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[];

    for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td, th'));
        if (cells.length < 2) continue;

        const labelCell = cells[0];
        if (labelCell?.textContent?.trim() === "Instruction Sets") {
            return row;
        }
    }

    return null;
}

/**
 * Extracts the benchmark name from a benchmark row
 */
export function extractBenchmarkName(row: HTMLTableRowElement): string | null {
    // In the actual Geekbench page, the benchmark name is the text content
    // of the first cell, but need to clean it up
    const firstCell = row.querySelector('td');
    if (!firstCell) return null;

    // Get the text content and clean it up (remove scores and metrics)
    const text = firstCell.textContent?.trim() || '';
    // Extract just the benchmark name (e.g., "File Compression")
    const benchmarkName = text.split('\n')[0]?.trim();

    return benchmarkName || null;
}
