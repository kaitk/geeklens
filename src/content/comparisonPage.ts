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
import { comparisonUrl, parseComparisonIds } from '../geekbench/urls';
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
import type { CachedResultContext, CachedResultValidity } from '../cache/ResultsCache';
import { withClearedComparisonBaseline } from './comparisonBaseline';
import type { Settings } from '../settings/settings';
import { markRowLabel } from './rowMarker';
import {
  applyProcessorContextPreferences,
  renderComparisonProcessorContext,
} from './processorContextUi';
import { buildProcessorContextViewModel } from './processorContextViewModel';
import { needsComparisonResultFetch } from './comparisonFetch';
import { debugLog } from '../logger';
import { loadResultContext } from './resultContextLoader';
import {
  combinePayloadValidity,
  isResultValidityFresh,
  loadBrowserResultValidity,
  renderComparisonResultValidity,
} from './comparisonValidity';

interface ComparisonPageDependencies {
  cache: Pick<typeof resultsCache, 'getResultContext' | 'storeResultContext'>;
  fetchHtmlContext: typeof fetchInstructionSetsFromHtml;
  fetchMetadata: typeof fetchResultMetadataFromPayload;
  loadValidity: typeof loadBrowserResultValidity;
  mountSystemInstructionSets: typeof mountSystemInstructionSets;
  mountWorkloadBadges: typeof mountWorkloadBadges;
  withClearedBaseline: typeof withClearedComparisonBaseline;
}

interface ComparisonData {
  primaryContext: CachedResultContext | null;
  baselineContext: CachedResultContext | null;
  validity: readonly [CachedResultValidity | null, CachedResultValidity | null];
}

const comparisonPageDependencies: ComparisonPageDependencies = {
  cache: resultsCache,
  fetchHtmlContext: fetchInstructionSetsFromHtml,
  fetchMetadata: fetchResultMetadataFromPayload,
  loadValidity: loadBrowserResultValidity,
  mountSystemInstructionSets,
  mountWorkloadBadges,
  withClearedBaseline: withClearedComparisonBaseline,
};

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

async function loadComparisonResultContext(
  generation: GeekbenchGeneration,
  resultId: string,
  version: string | null,
  cached: CachedResultContext | null,
  comparisonLinks: CanonicalProcessorLinks,
  signedOut: boolean,
  dependencies: ComparisonPageDependencies,
): Promise<CachedResultContext | null> {
  try {
    // Older v6 pages have no rendered instruction data, but an authenticated
    // payload may still carry useful processor metadata.
    if (signedOut && version && !versionSupportsInstructionSets(version)) {
      debugLog(
        `Skipping fetch for ${resultId}, version ${version} doesn't support instruction sets`,
      );
      return cached;
    }
    return await loadResultContext({
      cache: dependencies.cache,
      generation,
      resultId,
      cached,
      async loadSource(current) {
        const metadata =
          current?.metadata ??
          (signedOut ? null : await dependencies.fetchMetadata(generation, resultId));
        if (metadata) {
          return {
            instructionSet:
              generation !== 6
                ? (metadata.instructionSets?.value ?? current?.instructionSet ?? null)
                : (current?.instructionSet ?? metadata.instructionSets?.value ?? null),
            metadata,
            processorLinks: comparisonLinks,
          };
        }

        // Geekbench 7 is payload-only. A failed authenticated request must not
        // fall through to the Geekbench 6 rendered-HTML strategy.
        if (generation === 7) {
          return {
            instructionSet: current?.instructionSet ?? null,
            metadata: null,
            processorLinks: comparisonLinks,
          };
        }

        // Geekbench 5 has no HTML fallback, and older v6 pages expose no
        // compatible rendered instruction row.
        if (
          generation === 5 ||
          (version && !versionSupportsInstructionSets(version)) ||
          current?.instructionSet
        ) {
          return null;
        }
        const fetched = await dependencies.fetchHtmlContext(generation, resultId);
        return {
          instructionSet: fetched.instructionSet,
          metadata: null,
          // A link found on the fetched result page retains its precedence over
          // the comparison-table link, matching the previous adapter policy.
          processorLinks: mergeProcessorLinks(comparisonLinks, fetched.processorLinks),
        };
      },
    });
  } catch (error) {
    console.error(`GeekLens: Error fetching data for result ${resultId}:`, error);
    return cached;
  }
}

async function acquireComparisonData(
  generation: GeekbenchGeneration,
  primary: string,
  baseline: string,
  versions: readonly [string | null, string | null],
  cached: readonly [CachedResultContext | null, CachedResultContext | null],
  links: readonly [CanonicalProcessorLinks, CanonicalProcessorLinks],
  signedOut: boolean,
  dependencies: ComparisonPageDependencies,
): Promise<ComparisonData> {
  const needsContext = cached.map((context, index) => {
    const payloadInstructions = context?.metadata?.instructionSets?.value ?? null;
    return (
      needsComparisonResultFetch({
        generation,
        signedOut,
        hasMetadata: Boolean(context?.metadata),
        hasInstructions: Boolean(context?.instructionSet),
        version: versions[index] ?? null,
      }) ||
      (generation !== 6 &&
        payloadInstructions !== null &&
        payloadInstructions !== context?.instructionSet)
    );
  });
  const initialValidity = [cached[0]?.validity ?? null, cached[1]?.validity ?? null] as const;
  const needsValidity = initialValidity.some((value) => !isResultValidityFresh(value));
  const cannotFetch = signedOut && generation !== 6;
  if (cannotFetch || (!needsContext.some(Boolean) && !needsValidity)) {
    return {
      primaryContext: cached[0],
      baselineContext: cached[1],
      validity: initialValidity,
    };
  }

  return dependencies.withClearedBaseline(generation, primary, baseline, async () => {
    const ids = [primary, baseline] as const;
    const [contexts, validity] = await Promise.all([
      Promise.all(
        ids.map((resultId, index) =>
          needsContext[index]
            ? loadComparisonResultContext(
                generation,
                resultId,
                versions[index] ?? null,
                cached[index],
                links[index],
                signedOut,
                dependencies,
              )
            : cached[index],
        ),
      ),
      Promise.all(
        ids.map((resultId, index) =>
          dependencies.loadValidity(generation, resultId, initialValidity[index]),
        ),
      ),
    ]);
    return {
      primaryContext: contexts[0],
      baselineContext: contexts[1],
      validity: [validity[0], validity[1]] as const,
    };
  });
}

async function cacheProcessorLinks(
  generation: GeekbenchGeneration,
  resultId: string,
  processorLinks: CanonicalProcessorLinks,
  dependencies: ComparisonPageDependencies,
): Promise<void> {
  if (!processorLinks.processorPath && !processorLinks.macPath) return;
  await dependencies.cache.storeResultContext(generation, resultId, { processorLinks });
}

export async function annotateGeekbenchComparisonPage(
  settings: Settings,
  dependencies: ComparisonPageDependencies = comparisonPageDependencies,
) {
  if (isPageAnnotated()) {
    return; // page already annotated
  }

  debugLog('Starting comparison annotation process');

  try {
    const generation = parseGeekbenchGeneration(window.location.pathname);
    if (!generation) {
      showStatus({ text: 'GeekLens: Unsupported Geekbench version', type: 'warning' });
      return;
    }
    const signedOut = isGeekbenchSignedOut();
    showStatus(initialInstructionStatus(generation, signedOut));

    const { baseline, primary } = parseComparisonIds(new URL(window.location.href));

    if (!primary || !baseline) {
      console.error('GeekLens: Could not extract primary or baseline result ID');
      return;
    }

    // Get Geekbench versions
    const { primary: primaryVersion, baseline: baselineVersion } = getComparisonVersions();

    const [primaryCached, baselineCached] = await Promise.all([
      dependencies.cache.getResultContext(generation, primary),
      dependencies.cache.getResultContext(generation, baseline),
    ]);
    await waitForElement('table.comparison-benchmark-table');
    applyProcessorContextPreferences(settings);
    const processorLinks = extractComparisonProcessorLinks();

    await Promise.all([
      cacheProcessorLinks(generation, primary, processorLinks.primary, dependencies),
      cacheProcessorLinks(generation, baseline, processorLinks.baseline, dependencies),
    ]);

    if (signedOut && (!primaryCached?.metadata || !baselineCached?.metadata)) {
      debugLog(`Signed out of Geekbench ${generation}, skipping payload fetch`);
    }

    const acquired = await acquireComparisonData(
      generation,
      primary,
      baseline,
      [primaryVersion, baselineVersion],
      [primaryCached, baselineCached],
      [processorLinks.primary, processorLinks.baseline],
      signedOut,
      dependencies,
    );
    let { primaryContext, baselineContext } = acquired;
    const { validity } = acquired;
    const primaryInstructions = primaryContext?.instructionSet ?? null;
    const baselineInstructions = baselineContext?.instructionSet ?? null;

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
      annotateSystemInstructionSets(
        primaryInstructions,
        baselineInstructions,
        settings,
        dependencies,
      );

      // Annotate benchmark tables with instruction sets for each CPU
      annotateBenchmarkTables(
        generation,
        extractIndividualInstructions(primaryInstructions),
        extractIndividualInstructions(baselineInstructions),
        settings,
        dependencies,
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
  settings: Settings,
  dependencies: ComparisonPageDependencies,
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
      dependencies.mountSystemInstructionSets(
        cell,
        categorizeInstructionSets(instructionSets),
        settings,
      );
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
  settings: Settings,
  dependencies: ComparisonPageDependencies,
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
      .forEach((row) =>
        annotateGraphRow(generation, row, primaryInstructions, false, settings, dependencies),
      );

    // Annotate baseline CPU rows
    table
      .querySelectorAll('tr.baseline-graph')
      .forEach((row) =>
        annotateGraphRow(generation, row, baselineInstructions, true, settings, dependencies),
      );
  });
}

function annotateGraphRow(
  generation: GeekbenchGeneration,
  row: Element,
  cpuInstructions: Set<string>,
  isBaseline: boolean,
  settings: Settings,
  dependencies: ComparisonPageDependencies,
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

  if (cpuCell.querySelector('[data-geeklens-instructions]')) {
    debugLog('Already annotated');
    return;
  }

  dependencies.mountWorkloadBadges(cpuCell, instructions, settings, confidenceNote);
}
