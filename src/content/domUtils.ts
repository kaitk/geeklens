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

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
  });
}


export function findBenchmarkTables(selector = 'table.benchmark-table'): HTMLTableElement[] {
  return Array.from(document.querySelectorAll(selector)) as HTMLTableElement[];
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
