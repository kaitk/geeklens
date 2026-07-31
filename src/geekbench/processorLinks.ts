const GEEKBENCH_ORIGIN = 'https://browser.geekbench.com';
const PROCESSOR_PATH = /^\/processors\/[a-z0-9][a-z0-9-]*\/?$/i;
const MAC_PATH = /^\/macs\/[a-z0-9][a-z0-9-]*\/?$/i;

export interface CanonicalProcessorLinks {
  processorPath: string | null;
  macPath: string | null;
}

export interface ComparisonProcessorLinks {
  primary: CanonicalProcessorLinks;
  baseline: CanonicalProcessorLinks;
}

export const EMPTY_PROCESSOR_LINKS: Readonly<CanonicalProcessorLinks> = {
  processorPath: null,
  macPath: null,
};

function canonicalPath(href: string, pattern: RegExp): string | null {
  try {
    const url = new URL(href, GEEKBENCH_ORIGIN);
    if (url.origin !== GEEKBENCH_ORIGIN || !pattern.test(url.pathname)) return null;
    return url.pathname.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function linksIn(root: ParentNode): CanonicalProcessorLinks {
  let processorPath: string | null = null;
  let macPath: string | null = null;

  for (const anchor of Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
    const href = anchor.getAttribute('href');
    if (!href) continue;
    processorPath ??= canonicalPath(href, PROCESSOR_PATH);
    macPath ??= canonicalPath(href, MAC_PATH);
    if (processorPath && macPath) break;
  }

  return { processorPath, macPath };
}

export function mergeProcessorLinks(
  existing: CanonicalProcessorLinks | null | undefined,
  discovered: CanonicalProcessorLinks | null | undefined,
): CanonicalProcessorLinks {
  return {
    processorPath: discovered?.processorPath ?? existing?.processorPath ?? null,
    macPath: discovered?.macPath ?? existing?.macPath ?? null,
  };
}

/** Extracts only explicit links from Geekbench's single-result system tables. */
export function extractProcessorLinks(root: ParentNode = document): CanonicalProcessorLinks {
  const tables = root.querySelectorAll('table.system-table');
  const links: CanonicalProcessorLinks = { ...EMPTY_PROCESSOR_LINKS };
  for (const table of Array.from(tables)) {
    const discovered = linksIn(table);
    links.processorPath ??= discovered.processorPath;
    links.macPath ??= discovered.macPath;
  }
  return links;
}

/**
 * Comparison system tables put primary and baseline values in columns two and
 * three. Scan every system row because Geekbench can link either Model or CPU.
 */
export function extractComparisonProcessorLinks(
  root: ParentNode = document,
): ComparisonProcessorLinks {
  const primary: CanonicalProcessorLinks = { ...EMPTY_PROCESSOR_LINKS };
  const baseline: CanonicalProcessorLinks = { ...EMPTY_PROCESSOR_LINKS };
  const table = root.querySelector('table.system-information');
  if (!table) return { primary, baseline };

  for (const row of Array.from(table.querySelectorAll('tbody tr'))) {
    const cells = row.querySelectorAll('td');
    for (const [index, target] of [primary, baseline].entries()) {
      const cell = cells[index + 1];
      if (!cell) continue;
      const discovered = linksIn(cell);
      target.processorPath ??= discovered.processorPath;
      target.macPath ??= discovered.macPath;
    }
  }

  return { primary, baseline };
}
