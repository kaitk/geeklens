# Runtime Geekbench score references

**Status:** In progress. Runtime implementation exists; live Chrome and Firefox source verification remains.
**Raised:** 2026-08-07.

GeekLens includes Geekbench 7 processor and Mac average scores in the generated catalogue. These values are mutable averages of user results. Thus, they become obsolete between releases.

Replace the score snapshot with a user-local reference cache in IndexedDB. Refresh the cache from the Geekbench Browser. Retain the catalogue for identity and reviewed hardware facts.

This task applies only to score references. Runtime data must never change these items:

- processor identity.
- aliases.
- configuration constraints.
- hardware specifications.
- core composition.
- cache disputes.

## Necessary behavior

When a Geekbench 7 result or comparison lane matches an exact catalogue identity:

1. Read a score reference for the generation and identity from IndexedDB.
2. Immediately show a fresh cached reference when one exists.
3. Refresh missing or obsolete data from the Geekbench Browser. Do this work outside the main annotation process.
4. Update the annotation after a successful refresh. Alternatively, use the new value on the next page load if immediate replacement causes excessive complexity.
5. Treat blocked, malformed, partial, or unavailable responses as an expected limited-data state. Retain a usable obsolete value. Never stop other page annotations.

A reference must contain at least these fields:

```ts
interface StoredScoreReference {
  cacheKey: string; // v7 + exact catalogue key/path
  generation: 7;
  catalogueKey: string;
  singleCore: number;
  multiCore: number;
  fetchedAt: number;
  sourceUrl: string;
  minimumUniqueResults?: number;
  parserVersion: number;
}
```

Use a dedicated IndexedDB store. Do not attach references to arbitrary result records. Result-cache LRU removal must not remove a shared reference for each result with the same identity.

## Source strategy to verify

Two source formats exist:

- The Geekbench 7 Processor Benchmark Chart is at `https://browser.geekbench.com/processor-benchmarks`. It gives AMD, Intel, and Qualcomm processor averages. It also specifies a minimum of five results.
- Geekbench Mac family tables give averages for specified Apple configurations. The current generator uses the desktop and laptop table families from the URLs in `MAC_CATALOGUE_SOURCE`.

Before implementation, capture authenticated and signed-out HTML for all source formats. Use Chrome and Firefox. Verify these conditions:

- A content script can fetch each URL with current Geekbench host access and same-origin credentials.
- Cloudflare does not replace the table with a challenge during normal use.
- Confirm table IDs, score cells, canonical processor or Mac paths, generation text, and minimum-result text.
- Determine if one processor-chart request and two Mac-family requests give complete coverage. If not, determine if exact identity pages are safer sources.
- Determine if these requests operate when the user selects a comparison baseline. If not, use the comparison adapter's single clear and restore interval for score refresh.

Do not change the page URL state in a separate process. Do not increase manifest host access or add `activeTab`.

Stop and review the feature if reliable refresh needs any of these items:

- a new host.
- a cross-origin proxy.
- a challenge bypass.
- undocumented credential transfer.

## Parser and trust boundary

Move reusable DOM parser code from the Bun generator scripts to pure modules under `src/`. Add fixtures and tests. The maintainer generators and runtime refresher must use the same parsers. This prevents different interpretations.

Parsers must meet these requirements:

- Use an explicit Geekbench 7 marker.
- Identify rows by canonical `/processors/<slug>` or `/macs/<slug>` paths.
- Use positive, finite single-core and multi-core scores.
- Publish a reference only when both score tables match the same exact identity and configuration.
- Reject duplicate paths, conflicting paths, and unexpected table formats.
- Return no data. Do not infer an identity from display names or row order.

Runtime values are Geekbench Browser aggregates, not reviewed hardware facts. Their provenance must include the retrieval date and a link to the source page.

## Cache and refresh policy

Select and test specific intervals before implementation. Use this initial policy:

- **fresh:** 24 hours.
- **obsolete but usable:** 30 days, with its retrieval date.
- **expired:** retain only for refresh retry records. Do not show the value.
- **successful refresh interval:** one refresh for each source during each 24-hour interval.
- **failure retry interval:** retry each source after five minutes.
- **request combination:** one active request for each source and tab.
  Store the last attempt time and outcome across tabs.

Use the obsolete value while the system validates a new value. Refresh must use best effort and must not affect the main annotation process.

Add conditional requests with `ETag` or `Last-Modified` only if the Geekbench Browser supplies and respects them.

A source request can return many references. Save a validated source snapshot in one transaction. This prevents a partial update after an interruption or page change.

Do not erase valid references when one refresh is blocked or malformed.

IndexedDB upgrades must remain disposable and must not block operation, as `docs/architecture.md` specifies. Add a versioned `scoreReferences` store or use a separate database.

Document the selected design. Test blocked upgrades, quota failures, and conflicts between tabs.

## Runtime-only references

Do not bundle score averages. Use values in this order:

1. a fresh runtime value.
2. a usable obsolete runtime value.
3. no average.

The user interface must clearly show when no value exists during first use or offline use. The generated identity catalogue remains necessary without score fields.

Each shown reference must use one atomic source snapshot. Never combine values from separate fetches.

## User interface and settings

Use the current **Reference averages** setting as the feature control. Do not request score references when the setting is disabled. This prevents network activity for a feature that the user disabled.

For an available reference, show `Fetched <date>` in the current provenance tooltip. Retain neutral `(avg unavailable)` behavior when no trusted reference exists. Request failures must not create an amber status for the complete page.

Decide if new values must update a page that is already visible. The minimum implementation can cache the result for the next load.

Use an immediate update only through the current processor-context view-model boundary. Renderers must not request or parse data.

## Privacy and browser compatibility

Requests remain on `browser.geekbench.com`. Host access already exists for this site, which the user visits. Apply these requirements:

- Send no result payload, processor name, browser history, or extension-specific identifier.
- Use normal same-origin credentials only when the source page needs them.
- Do not add analytics or a remote service.
- Confirm that Firefox's `data_collection_permissions.required: ["none"]` claim remains accurate.
- Document runtime score refresh in the privacy description or user description if store policy needs it.

## Tests

Add fixture tests for these cases:

- processor and both Mac family source formats.
- matches between both score tables through canonical paths.
- wrong generation, missing table, challenge page, malformed score, duplicate path, partial score data, and changed markup.
- cache freshness, obsolete state, expiry, retry interval, and atomic replacement.
- obsolete and unavailable fallback priority.
- separation by generation and catalogue key.
- no network request when the reference setting is disabled.
- nonfatal request, IndexedDB, quota, blocked-upgrade, and multiple-tab failures.
- single-result and comparison display with fresh, obsolete, and absent references.

## Acceptance criteria

This task is complete when all these conditions are true:

- The user's computer requests Geekbench 7 averages from verified Browser pages and caches them in IndexedDB.
- Only exact identities from the same generation receive references.
- Runtime code and catalogue generators use the same score parser.
- Refresh uses obsolete values during validation, limits requests, uses atomic updates, and does not block annotation.
- Malformed responses, challenges, and offline states retain safe fallback behavior.
- Disabled reference averages prevent refresh traffic.
- Provenance shows the runtime source and request date.
- Tests cover Chrome and Firefox behavior, including comparison baseline state.
- `docs/architecture.md`, `docs/result-metadata.md`, and catalogue provenance documents describe the new runtime boundary.
- Formatting, linting, tests, Svelte and type checks, and both browser builds pass.
- Manual tests use unpacked Chrome and Firefox builds. Each test covers one processor result, one exact Mac result, and one comparison page.
