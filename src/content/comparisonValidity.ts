import type { GeekbenchGeneration } from '../geekbench/generation';
import { resultPageUrl } from '../geekbench/urls';
import {
  resultsCache,
  type CachedResultContext,
  type CachedResultValidity,
} from '../cache/ResultsCache';
import { markRowLabel } from './rowMarker';

export const RESULT_VALIDITY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface BrowserResultValidity {
  level: 'valid' | 'warning' | 'invalid';
  message: string;
}

export function parseBrowserResultValidity(document: Document): BrowserResultValidity | null {
  const widget = document.querySelector('.validation-widget');
  const level = widget?.classList.contains('validation-error')
    ? 'invalid'
    : widget?.classList.contains('validation-warning')
      ? 'warning'
      : widget?.classList.contains('validation-success')
        ? 'valid'
        : null;
  if (!level) return null;

  const message = Array.from(document.querySelectorAll('.alert-error, .alert-warning'))
    .map((alert) => alert.textContent?.trim().replaceAll(/\s+/g, ' ') ?? '')
    .find((text) => /benchmark result (?:may be |is )invalid/i.test(text));
  return {
    level,
    message:
      message ??
      (level === 'valid'
        ? 'Geekbench marks this benchmark result valid.'
        : 'Geekbench marks this benchmark result invalid.'),
  };
}

export async function fetchBrowserResultValidity(
  generation: GeekbenchGeneration,
  resultId: string,
): Promise<BrowserResultValidity | null> {
  try {
    const response = await fetch(resultPageUrl(generation, resultId), {
      cache: 'default',
      credentials: 'same-origin',
    });
    if (!response.ok) return null;
    const document = new DOMParser().parseFromString(await response.text(), 'text/html');
    return parseBrowserResultValidity(document);
  } catch (error) {
    console.error(`GeekLens: Could not check validity for result ${resultId}`, error);
    return null;
  }
}

export function isResultValidityFresh(
  validity: CachedResultValidity | null | undefined,
  now = Date.now(),
): validity is CachedResultValidity {
  return Boolean(
    validity?.source === 'validation-widget-v2' &&
    now - validity.checkedAt < RESULT_VALIDITY_TTL_MS,
  );
}

export async function loadBrowserResultValidity(
  generation: GeekbenchGeneration,
  resultId: string,
  cached: CachedResultValidity | null | undefined,
): Promise<CachedResultValidity | null> {
  if (isResultValidityFresh(cached)) return cached;

  const fetched = await fetchBrowserResultValidity(generation, resultId);
  if (!fetched) return null;

  const validity = { ...fetched, checkedAt: Date.now(), source: 'validation-widget-v2' as const };
  await resultsCache.storeResultContext(generation, resultId, { validity });
  return validity;
}

/** A false payload flag is corroborating evidence; true cannot overrule a later HTML invalidation. */
export function combinePayloadValidity(
  htmlValidity: BrowserResultValidity | null,
  context: CachedResultContext | null,
): BrowserResultValidity | null {
  if (htmlValidity?.level === 'invalid' || context?.metadata?.benchmark.valid?.value !== false) {
    return htmlValidity;
  }
  return {
    level: 'invalid',
    message: 'The Geekbench result payload marks this benchmark result invalid.',
  };
}

function addValidityTooltip(badge: HTMLElement, label: string, message: string): void {
  badge.tabIndex = 0;
  badge.setAttribute('aria-label', `${label}. ${message}`);

  const tooltip = document.createElement('span');
  tooltip.className = 'geeklens-preview-row-tooltip geeklens-result-validity-tooltip';
  tooltip.textContent = message;
  badge.appendChild(tooltip);
}

/** Add validity only when Geekbench's result page marks at least one side invalid. */
export function renderComparisonResultValidity(
  values: readonly (BrowserResultValidity | null)[],
): void {
  if (!values.some((value) => value && value.level !== 'valid')) return;

  for (const table of Array.from(document.querySelectorAll('table.comparison-benchmark-table'))) {
    for (const [index, rowClass] of ['document-graph', 'baseline-graph'].entries()) {
      const value = values[index];
      if (!value || value.level === 'valid') continue;

      const nameCell = table.querySelector(`tr.${rowClass} > :first-child`);
      if (!nameCell || nameCell.querySelector('[data-geeklens-summary-validity]')) continue;

      const badge = document.createElement('span');
      badge.className = [
        'geeklens-preview-badge',
        value.level === 'warning'
          ? 'geeklens-result-validity-warning'
          : 'geeklens-preview-badge-amd',
        'geeklens-summary-validity-badge',
      ].join(' ');
      badge.dataset.geeklensSummaryValidity = 'true';
      badge.textContent = 'Invalid';
      addValidityTooltip(badge, 'Invalid', value.message);
      nameCell.append(' ', badge);
    }
  }

  const table = document.querySelector<HTMLTableElement>('table.system-information');
  if (!table || table.querySelector('[data-geeklens-result-validity]')) return;

  const row = document.createElement('tr');
  row.dataset.geeklensResultValidity = 'true';

  const label = document.createElement('td');
  label.textContent = 'Result Validity';
  markRowLabel(label);
  row.appendChild(label);

  for (const value of values) {
    const cell = document.createElement('td');
    cell.className = 'geeklens-result-validity-cell';
    const badge = document.createElement('span');
    badge.className = [
      'geeklens-preview-badge',
      'geeklens-result-validity-badge',
      value?.level === 'invalid'
        ? 'geeklens-preview-badge-amd'
        : value?.level === 'warning'
          ? 'geeklens-result-validity-warning'
          : value
            ? 'geeklens-preview-badge-nvidia'
            : '',
    ]
      .filter(Boolean)
      .join(' ');
    badge.textContent = value?.level === 'valid' ? 'Valid' : value ? 'Invalid' : 'Unavailable';
    addValidityTooltip(
      badge,
      badge.textContent,
      value?.message ?? 'GeekLens could not determine this result’s validity.',
    );
    cell.appendChild(badge);
    row.appendChild(cell);
  }

  const body = table.querySelector('tbody') ?? table;
  const modelRow = Array.from(body.querySelectorAll('tr')).find(
    (candidate) => candidate.querySelector('td')?.textContent?.trim() === 'Model',
  );
  body.insertBefore(row, modelRow?.nextSibling ?? null);
}
