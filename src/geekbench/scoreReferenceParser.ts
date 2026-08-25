export const SCORE_REFERENCE_PARSER_VERSION = 1;

export interface ParsedScoreReference {
  path: string;
  singleCore: number;
  multiCore: number;
}

export type ScoreReferenceSourceFormat = 'processor' | 'mac-family';

const TABLES: Record<ScoreReferenceSourceFormat, readonly [string, string]> = {
  processor: ['single-core', 'multi-core'],
  'mac-family': ['family-64-single', 'family-64-multi'],
};

function canonicalPath(href: string, pathKind: 'processors' | 'macs'): string | null {
  try {
    const url = new URL(href, 'https://browser.geekbench.com');
    const path = url.pathname.replace(/\/$/, '');
    const parts = path.split('/');
    const validPath = parts.length === 3 && parts[1] === pathKind && Boolean(parts[2]);
    return url.origin === 'https://browser.geekbench.com' && validPath ? path : null;
  } catch {
    return null;
  }
}

function parseTable(
  document: Document,
  tableId: string,
  pathKind: 'processors' | 'macs',
): Map<string, number> | null {
  const table = document.querySelector(`#${tableId}`);
  if (!table || !table.querySelector('tbody')) return null;

  const values = new Map<string, number>();
  const rows = table.querySelectorAll('tbody tr');
  if (rows.length === 0) return null;
  for (const row of Array.from(rows)) {
    const links = row.querySelectorAll(`td.name a[href*="/${pathKind}/"]`);
    const scoreCells = row.querySelectorAll('td.score');
    if (links.length !== 1 || scoreCells.length !== 1) return null;
    const path = canonicalPath(links[0].getAttribute('href') ?? '', pathKind);
    const scoreText = scoreCells[0].textContent?.trim().replaceAll(',', '') ?? '';
    const score = Number(scoreText);
    if (!path || !Number.isFinite(score) || score <= 0 || values.has(path)) return null;
    values.set(path, score);
  }
  return values;
}

/** Parse one complete Geekbench 7 score source. Invalid snapshots publish no data. */
export function parseScoreReferenceDocument(
  document: Document,
  format: ScoreReferenceSourceFormat,
): ParsedScoreReference[] | null {
  const text = document.body?.textContent?.replaceAll(/\s+/g, ' ') ?? '';
  const isGeekbench7 =
    format === 'processor'
      ? text.includes('Geekbench 7')
      : text.includes('Geekbench 7 CPU scores are calibrated');
  if (!isGeekbench7) return null;

  const pathKind = format === 'processor' ? 'processors' : 'macs';
  const [singleId, multiId] = TABLES[format];
  const single = parseTable(document, singleId, pathKind);
  const multi = parseTable(document, multiId, pathKind);
  if (!single || !multi || single.size !== multi.size) return null;
  if ([...single.keys()].some((path) => !multi.has(path))) return null;

  return [...single].map(([path, singleCore]) => ({
    path,
    singleCore,
    multiCore: multi.get(path)!,
  }));
}
