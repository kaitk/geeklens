import { MAC_CATALOGUE_SOURCE, PROCESSOR_CATALOGUE_SOURCE } from '../catalogue/catalogueSources';
import { PROCESSOR_CATALOGUE } from '../catalogue/processorCatalogue';
import { resolveProcessorIdentity } from '../catalogue/processorIdentity';
import type { CachedResultContext } from '../cache/ResultsCache';
import { debugLog } from '../logger';
import {
  parseScoreReferenceDocument,
  SCORE_REFERENCE_PARSER_VERSION,
  type ScoreReferenceSourceFormat,
} from '../geekbench/scoreReferenceParser';
import {
  scoreReferenceAge,
  scoreReferenceCache,
  scoreReferenceCacheKey,
  type StoredScoreReference,
} from './ScoreReferenceCache';

const activeSources = new Map<string, Promise<void>>();

interface ScoreReferenceCacheAccess {
  get(generation: 7, catalogueKey: string): Promise<StoredScoreReference | null>;
  claimSourceAttempt(sourceUrl: string, now?: number): Promise<boolean>;
  markSourceSuccess(sourceUrl: string, now?: number): Promise<void>;
  storeSnapshot(references: readonly StoredScoreReference[]): Promise<void>;
}

export interface ScoreReferenceDependencies {
  cache: ScoreReferenceCacheAccess;
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  now: () => number;
  parseDocument: (html: string) => Document;
}

const defaultDependencies: ScoreReferenceDependencies = {
  cache: scoreReferenceCache,
  fetch: (input, init) => globalThis.fetch(input, init),
  now: Date.now,
  parseDocument: (html) => new DOMParser().parseFromString(html, 'text/html'),
};

function matchedIdentity(context: CachedResultContext | null) {
  if (context?.metadata?.generation !== 7) return null;
  const identity = resolveProcessorIdentity(context);
  return identity.kind === 'unmatched' ? null : identity;
}

function sourceUrls(context: CachedResultContext): Array<{
  url: string;
  format: ScoreReferenceSourceFormat;
  minimumUniqueResults?: number;
}> {
  const identity = matchedIdentity(context);
  if (!identity) return [];
  if (identity.entry.macPaths.length > 0) {
    return MAC_CATALOGUE_SOURCE.urls.map((url) => ({ url, format: 'mac-family' as const }));
  }
  return [
    {
      url: PROCESSOR_CATALOGUE_SOURCE.url,
      format: 'processor',
      minimumUniqueResults: PROCESSOR_CATALOGUE_SOURCE.minimumUniqueResults,
    },
  ];
}

async function refreshSource(
  source: ReturnType<typeof sourceUrls>[number],
  dependencies: ScoreReferenceDependencies,
): Promise<void> {
  if (!(await dependencies.cache.claimSourceAttempt(source.url, dependencies.now()))) {
    debugLog('Score reference refresh skipped by the source retry limit', source.url);
    return;
  }
  debugLog('Fetching score reference source', source.url);
  const response = await dependencies.fetch(source.url, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Score source returned HTTP ${response.status}`);
  const document = dependencies.parseDocument(await response.text());
  const pageText = document.body?.textContent?.replaceAll(/\s+/g, ' ').trim() ?? '';
  if (
    pageText.includes('Enable JavaScript and cookies to continue') ||
    document.querySelector('script[src*="/cdn-cgi/challenge-platform/"]')
  ) {
    throw new Error('Score source returned a Cloudflare challenge instead of the chart');
  }
  const parsed = parseScoreReferenceDocument(document, source.format);
  if (!parsed) throw new Error('Score source did not match the expected Geekbench 7 format');

  const fetchedAt = dependencies.now();
  const references: StoredScoreReference[] = [];
  for (const value of parsed) {
    const entry = PROCESSOR_CATALOGUE.find((candidate) =>
      [...candidate.processorPaths, ...candidate.macPaths].includes(value.path),
    );
    if (!entry) continue;
    references.push({
      cacheKey: scoreReferenceCacheKey(7, entry.key),
      generation: 7,
      catalogueKey: entry.key,
      singleCore: value.singleCore,
      multiCore: value.multiCore,
      fetchedAt,
      sourceUrl: source.url,
      minimumUniqueResults: source.minimumUniqueResults,
      parserVersion: SCORE_REFERENCE_PARSER_VERSION,
    });
  }
  if (references.length === 0) throw new Error('Score source matched no catalogue identities');
  debugLog('Parsed score reference source', {
    sourceUrl: source.url,
    parsedReferences: parsed.length,
    matchedCatalogueIdentities: references.length,
  });
  await dependencies.cache.storeSnapshot(references);
  await dependencies.cache.markSourceSuccess(source.url, fetchedAt);
}

function requestSource(
  source: ReturnType<typeof sourceUrls>[number],
  dependencies: ScoreReferenceDependencies,
): Promise<void> {
  const active = activeSources.get(source.url);
  if (active) return active;
  const request = refreshSource(source, dependencies)
    .catch((error) => console.error(`GeekLens: Could not refresh ${source.url}`, error))
    .finally(() => activeSources.delete(source.url));
  activeSources.set(source.url, request);
  return request;
}

/** Return a usable reference. A cache miss waits for one source refresh so the
 * average can appear on the first render. Obsolete values render immediately
 * while their refresh remains best effort. */
export async function loadRuntimeScoreReference(
  context: CachedResultContext | null,
  dependencies: ScoreReferenceDependencies = defaultDependencies,
): Promise<StoredScoreReference | null> {
  const identity = matchedIdentity(context);
  if (!identity || !context) {
    debugLog('Score reference unavailable because the result has no exact catalogue identity');
    return null;
  }

  const cached = await dependencies.cache.get(7, identity.catalogueKey);
  const age = cached ? scoreReferenceAge(cached, dependencies.now()) : 'expired';
  debugLog('Loading score reference', {
    catalogueKey: identity.catalogueKey,
    identityKind: identity.kind,
    cacheState: cached ? age : 'missing',
  });
  if (age === 'fresh') return cached;

  const requests = sourceUrls(context).map((source) => requestSource(source, dependencies));
  if (age === 'obsolete') {
    void Promise.all(requests);
    return cached;
  }

  await Promise.all(requests);
  const refreshed = await dependencies.cache.get(7, identity.catalogueKey);
  return refreshed && scoreReferenceAge(refreshed, dependencies.now()) !== 'expired'
    ? refreshed
    : null;
}
