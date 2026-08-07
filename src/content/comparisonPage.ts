import { categorizeInstructionSets } from '../isa/categories';
import { extractIndividualInstructions } from '../isa/instructions';
import {
  parseGeekbenchGeneration,
  versionSupportsInstructionSets,
  type GeekbenchGeneration,
} from '../geekbench/generation';
import {
  extractComparisonProcessorLinks,
  extractProcessorLinks,
  mergeProcessorLinks,
  type CanonicalProcessorLinks,
} from '../geekbench/processorLinks';
import { fetchResultMetadataFromPayload } from '../geekbench/resultPayloadClient';
import { comparisonUrl } from '../geekbench/urls';
import {
  comparisonInstructionStatus,
  initialInstructionStatus,
  processorContextStatus,
} from '../geekbench/instructionDataStatus';
import { isGeekbenchSignedOut } from '../geekbench/authentication';
import { workloadInstructions } from '../isa/workloadInstructions';
import {
  extractBenchmarkName,
  findBenchmarkTables,
  findComparisonScoreRow,
  findInstructionSetValueCell,
  getComparisonVersions,
  waitForElement,
} from './domUtils';
import { mountSystemInstructionSets, mountWorkloadBadges } from './mountBadges';
import { isPageAnnotated, showStatus } from './statusBanner';
import { resultsCache } from '../cache/ResultsCache';
import type { CachedResultContext } from '../cache/ResultsCache';
import { withClearedComparisonBaseline } from './comparisonBaseline';
import { loadSettings } from '../settings/settings';
import { markRowLabel } from './rowMarker';
import {
  applyProcessorContextPreferences,
  renderComparisonProcessorContext,
} from './processorContextUi';
import { buildProcessorContextViewModel } from './processorContextViewModel';
import { needsComparisonResultFetch } from './comparisonFetch';
import {
  combinePayloadValidity,
  isResultValidityFresh,
  loadBrowserResultValidity,
  renderComparisonResultValidity,
} from './comparisonValidity';

// Extract result IDs from the URL
function extractResultIds(): { baseline: string | null; primary: string | null } {
  const url = new URL(window.location.href);
  const pathParts = url.pathname.split('/');

  // URL format: /v<generation>/cpu/compare/[primary]?baseline=[baseline]
  return {
    primary: pathParts[pathParts.length - 1] || null,
    baseline: url.searchParams.get('baseline'),
  };
}

/**
 * Geekbench 6 exposes instruction sets in result-page HTML.
 *
 * Using the exact compare url without a baseline as:
 * 1. API requires logging in
 * 2. Any other url redirects back to this page (that has no ISA info)
 */
async function fetchInstructionSetsFromHtml(
  generation: GeekbenchGeneration,
  resultId: string,
): Promise<{ instructionSet: string | null; processorLinks: CanonicalProcessorLinks }> {
  const response = await fetch(comparisonUrl(generation, resultId), {
    cache: 'default',
    credentials: 'same-origin',
    headers: {
      'Cache-Control': 'max-age=2592000', // HTTP cache for a month
    },
  });

  if (!response.ok) {
    console.error(`GeekLens: Failed to fetch data for result ${resultId}`);
    return { instructionSet: null, processorLinks: { processorPath: null, macPath: null } };
  }

  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  const valueCell = findInstructionSetValueCell(doc);
  if (!valueCell?.classList.contains('value')) {
    console.error(`GeekLens: No instruction sets found for result ${resultId}`);
  }

  return {
    instructionSet: valueCell?.textContent?.trim() || null,
    processorLinks: extractProcessorLinks(doc),
  };
}

async function loadResultContext(
  generation: GeekbenchGeneration,
  resultId: string,
  version: string | null,
  cached: CachedResultContext | null,
  comparisonLinks: CanonicalProcessorLinks,
  signedOut: boolean,
): Promise<CachedResultContext | null> {
  try {
    // Older v6 pages have no rendered instruction data, but an authenticated
    // payload may still carry useful processor metadata.
    if (signedOut && version && !versionSupportsInstructionSets(version)) {
      console.log(
        `GeekLens: Skipping fetch for ${resultId}, version ${version} doesn't support instruction sets`,
      );
      return cached;
    }

    if (generation === 7) {
      const metadata =
        cached?.metadata ?? (await fetchResultMetadataFromPayload(generation, resultId));
      const instructionSet = metadata?.instructionSets?.value ?? cached?.instructionSet ?? null;
      await resultsCache.storeResultContext(generation, resultId, {
        instructionSet,
        metadata,
        processorLinks: comparisonLinks,
      });
      return {
        instructionSet,
        metadata,
        processorLinks: mergeProcessorLinks(cached?.processorLinks, comparisonLinks),
        lastAccessedAt: cached?.lastAccessedAt ?? Date.now(),
      };
    }

    // Geekbench 6 can use the same payload metadata as v7 while retaining its
    // public HTML instruction-set fallback for signed-out and failed requests.
    const metadata =
      cached?.metadata ??
      (signedOut ? null : await fetchResultMetadataFromPayload(generation, resultId));
    if (metadata) {
      const instructionSet = cached?.instructionSet ?? metadata.instructionSets?.value ?? null;
      const processorLinks = mergeProcessorLinks(cached?.processorLinks, comparisonLinks);
      await resultsCache.storeResultContext(generation, resultId, {
        instructionSet,
        metadata,
        processorLinks,
      });
      return {
        instructionSet,
        metadata,
        processorLinks,
        lastAccessedAt: cached?.lastAccessedAt ?? Date.now(),
      };
    }

    // Geekbench 5 never rendered instruction-set data. If its payload was
    // unavailable above, there is no HTML source to fall back to.
    if (generation === 5) return cached;
    if (version && !versionSupportsInstructionSets(version)) return cached;
    if (cached?.instructionSet) return cached;

    const fetched = await fetchInstructionSetsFromHtml(generation, resultId);
    const processorLinks = mergeProcessorLinks(comparisonLinks, fetched.processorLinks);
    if (fetched.instructionSet || processorLinks.processorPath || processorLinks.macPath) {
      await resultsCache.storeResultContext(generation, resultId, {
        instructionSet: fetched.instructionSet,
        processorLinks,
      });
    }
    return {
      instructionSet: fetched.instructionSet,
      metadata: null,
      processorLinks,
      lastAccessedAt: cached?.lastAccessedAt ?? Date.now(),
    };
  } catch (error) {
    console.error(`GeekLens: Error fetching data for result ${resultId}:`, error);
    return cached;
  }
}

async function cacheProcessorLinks(
  generation: GeekbenchGeneration,
  resultId: string,
  processorLinks: CanonicalProcessorLinks,
): Promise<void> {
  if (!processorLinks.processorPath && !processorLinks.macPath) return;
  await resultsCache.storeResultContext(generation, resultId, { processorLinks });
}

// Main function to annotate the comparison page
export async function annotateGeekbenchComparisonPage() {
  if (isPageAnnotated()) {
    return; // page already annotated
  }

  console.log('GeekLens: Starting comparison annotation process');

  try {
    const generation = parseGeekbenchGeneration(window.location.pathname);
    if (!generation) {
      showStatus({ text: 'GeekLens: Unsupported Geekbench version', type: 'warning' });
      return;
    }
    const signedOut = isGeekbenchSignedOut();
    showStatus(initialInstructionStatus(generation, signedOut));

    // Extract result IDs from URL
    const { baseline, primary } = extractResultIds();

    if (!primary || !baseline) {
      console.error('GeekLens: Could not extract primary or baseline result ID');
      return;
    }

    // Get Geekbench versions
    const { primary: primaryVersion, baseline: baselineVersion } = getComparisonVersions();

    const [primaryCached, baselineCached] = await Promise.all([
      resultsCache.getResultContext(generation, primary),
      resultsCache.getResultContext(generation, baseline),
    ]);
    await waitForElement('table.comparison-benchmark-table');
    const settings = await loadSettings();
    applyProcessorContextPreferences(settings);
    const processorLinks = extractComparisonProcessorLinks();

    await Promise.all([
      cacheProcessorLinks(generation, primary, processorLinks.primary),
      cacheProcessorLinks(generation, baseline, processorLinks.baseline),
    ]);

    if (signedOut && (!primaryCached?.metadata || !baselineCached?.metadata)) {
      console.log(`GeekLens: Signed out of Geekbench ${generation}, skipping payload fetch`);
    }

    let primaryContext = primaryCached;
    let baselineContext = baselineCached;
    let primaryInstructions = primaryContext?.instructionSet ?? null;
    let baselineInstructions = baselineContext?.instructionSet ?? null;
    const needsPrimaryFetch = needsComparisonResultFetch({
      generation,
      signedOut,
      hasMetadata: Boolean(primaryCached?.metadata),
      hasInstructions: Boolean(primaryInstructions),
      version: primaryVersion,
    });
    const needsBaselineFetch = needsComparisonResultFetch({
      generation,
      signedOut,
      hasMetadata: Boolean(baselineCached?.metadata),
      hasInstructions: Boolean(baselineInstructions),
      version: baselineVersion,
    });
    const needsFetch = needsPrimaryFetch || needsBaselineFetch;
    const cannotFetch = signedOut && generation !== 6;
    let validity = [primaryCached?.validity ?? null, baselineCached?.validity ?? null];
    let checkedValidity = false;
    const needsValidityFetch = validity.some((value) => !isResultValidityFresh(value));

    if (needsFetch && !cannotFetch) {
      await withClearedComparisonBaseline(generation, primary, baseline, async () => {
        [[primaryContext, baselineContext], validity] = await Promise.all([
          Promise.all([
            needsPrimaryFetch
              ? loadResultContext(
                  generation,
                  primary,
                  primaryVersion,
                  primaryCached,
                  processorLinks.primary,
                  signedOut,
                )
              : primaryContext,
            needsBaselineFetch
              ? loadResultContext(
                  generation,
                  baseline,
                  baselineVersion,
                  baselineCached,
                  processorLinks.baseline,
                  signedOut,
                )
              : baselineContext,
          ]),
          Promise.all([
            loadBrowserResultValidity(generation, primary, primaryCached?.validity),
            loadBrowserResultValidity(generation, baseline, baselineCached?.validity),
          ]),
        ]);
        checkedValidity = true;
        primaryInstructions = primaryContext?.instructionSet ?? null;
        baselineInstructions = baselineContext?.instructionSet ?? null;
      });
    }

    // Result pages can lose their server-side invalidity alert while a
    // comparison baseline is selected, so even a cache hit must check inside
    // the same clear/restore window used by payload requests. Signed-out v5/v7
    // pages retain the existing no-session-mutation rule.
    if (!checkedValidity && !cannotFetch && needsValidityFetch) {
      validity = await withClearedComparisonBaseline(generation, primary, baseline, () =>
        Promise.all([
          loadBrowserResultValidity(generation, primary, primaryCached?.validity),
          loadBrowserResultValidity(generation, baseline, baselineCached?.validity),
        ]),
      );
    }

    primaryContext = mergeContextLinks(primaryContext, processorLinks.primary);
    baselineContext = mergeContextLinks(baselineContext, processorLinks.baseline);
    renderComparisonResultValidity([
      combinePayloadValidity(validity[0], primaryContext),
      combinePayloadValidity(validity[1], baselineContext),
    ]);
    const primaryProcessor = buildProcessorContextViewModel(primaryContext);
    const baselineProcessor = buildProcessorContextViewModel(baselineContext);
    if (primaryProcessor || baselineProcessor) {
      renderComparisonProcessorContext([primaryProcessor, baselineProcessor], settings);
    }

    // If at least one CPU has instruction sets, we can proceed
    if (settings.showIsaAnnotations && (primaryInstructions || baselineInstructions)) {
      annotateSystemInstructionSets(primaryInstructions, baselineInstructions);

      // Annotate benchmark tables with instruction sets for each CPU
      annotateBenchmarkTables(
        generation,
        extractIndividualInstructions(primaryInstructions),
        extractIndividualInstructions(baselineInstructions),
      );
    }

    showStatus(
      generation === 5
        ? processorContextStatus(Boolean(primaryProcessor || baselineProcessor), signedOut)
        : comparisonInstructionStatus(
            generation,
            Boolean(primaryInstructions),
            Boolean(baselineInstructions),
            {
              primary:
                generation === 6 &&
                primaryVersion !== null &&
                !versionSupportsInstructionSets(primaryVersion),
              baseline:
                generation === 6 &&
                baselineVersion !== null &&
                !versionSupportsInstructionSets(baselineVersion),
            },
          ),
    );
  } catch (error) {
    console.error('GeekLens: Failed to annotate comparison page', error);
    showStatus({ text: 'GeekLens Error', type: 'warning' });
  }
}

function mergeContextLinks(
  context: CachedResultContext | null,
  processorLinks: CanonicalProcessorLinks,
): CachedResultContext | null {
  if (!context) return null;
  return {
    ...context,
    processorLinks: mergeProcessorLinks(context.processorLinks, processorLinks),
  };
}

function annotateSystemInstructionSets(
  primaryInstructions: string | null,
  baselineInstructions: string | null,
) {
  if (!primaryInstructions && !baselineInstructions) {
    console.error('GeekLens: No instruction sets available');
    return;
  }

  const table = document.querySelector('table.system-information') as HTMLTableElement;
  if (!table) {
    console.error('GeekLens: System information table not found');
    return;
  }

  if (table.querySelector('tr[data-geeklens-instruction-sets]')) {
    return; // Already added
  }

  const newRow = document.createElement('tr');
  newRow.setAttribute('data-geeklens-instruction-sets', 'true');

  const labelCell = document.createElement('td');
  labelCell.textContent = 'Instruction Sets';
  markRowLabel(labelCell, 'added');
  newRow.appendChild(labelCell);

  // One cell per compared result, in the page's primary-then-baseline order.
  for (const instructionSets of [primaryInstructions, baselineInstructions]) {
    const cell = document.createElement('td');
    newRow.appendChild(cell);

    if (instructionSets) {
      mountSystemInstructionSets(cell, categorizeInstructionSets(instructionSets));
    } else {
      cell.textContent = 'Not available';
    }
  }

  // Add the row to the table
  const tbody = table.querySelector('tbody') || table;
  tbody.appendChild(newRow);
}

function annotateBenchmarkTables(
  generation: GeekbenchGeneration,
  primaryInstructions: Set<string>,
  baselineInstructions: Set<string>,
) {
  const benchmarkTables = findBenchmarkTables('table.comparison-benchmark-table');

  if (benchmarkTables.length === 0) {
    console.error('GeekLens: No benchmark tables found');
    return;
  }

  benchmarkTables.forEach((table) => {
    // Annotate primary CPU rows
    table
      .querySelectorAll('tr.document-graph')
      .forEach((row) => annotateGraphRow(generation, row, primaryInstructions, false));

    // Annotate baseline CPU rows
    table
      .querySelectorAll('tr.baseline-graph')
      .forEach((row) => annotateGraphRow(generation, row, baselineInstructions, true));
  });
}

function annotateGraphRow(
  generation: GeekbenchGeneration,
  row: Element,
  cpuInstructions: Set<string>,
  isBaseline: boolean,
) {
  // Get the previous score row to determine the benchmark. Summary rows
  // (Single-/Multi-Core Score) have no `.scores` row and are skipped here.
  const scoreRow = findComparisonScoreRow(row, isBaseline);
  if (!scoreRow) return;

  const benchmarkName = extractBenchmarkName(scoreRow);
  if (!benchmarkName) return;

  const { instructions, confidenceNote } = workloadInstructions(
    generation,
    benchmarkName,
    cpuInstructions,
  );
  if (instructions.length === 0) return;

  // Get the cell with the CPU name
  const cpuCell = row.querySelector('td:first-child');
  if (!cpuCell) {
    console.error(`GeekLens: No CPU cell found in row`);
    return;
  }

  // Check if already annotated
  if (cpuCell.querySelector('[data-geeklens-instructions]')) {
    console.warn(`Already annotated`);
    return;
  }

  mountWorkloadBadges(cpuCell, instructions, confidenceNote);
}
