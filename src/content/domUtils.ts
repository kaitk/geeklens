export function waitForElement(selector: string, timeout = 5000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existingElement = document.querySelector(selector);
    if (existingElement) {
      resolve(existingElement);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
  });
}

export function findBenchmarkTables(
  selector = 'table.benchmark-table',
  root: ParentNode = document,
): HTMLTableElement[] {
  return Array.from(root.querySelectorAll(selector)) as HTMLTableElement[];
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

export function findInstructionSetValueCell(root: ParentNode = document): Element | null {
  const cells = root.querySelectorAll('table.system-table tbody tr td.name');
  return (
    Array.from(cells).find((cell) => cell.textContent?.trim() === 'Instruction Sets')
      ?.nextElementSibling ?? null
  );
}

export function findSystemTableByHeading(
  heading: string,
  root: ParentNode = document,
): HTMLTableElement | null {
  return (
    Array.from(root.querySelectorAll<HTMLTableElement>('table.system-table')).find(
      (table) => table.querySelector('th')?.textContent?.trim() === heading,
    ) ?? null
  );
}

export function findComparisonScoreRow(
  graphRow: Element,
  isBaseline: boolean,
): HTMLTableRowElement | null {
  let scoreRow = graphRow.previousElementSibling as HTMLTableRowElement | null;
  if (isBaseline) {
    scoreRow = scoreRow?.previousElementSibling as HTMLTableRowElement | null;
  }
  return scoreRow?.classList.contains('scores') ? scoreRow : null;
}
