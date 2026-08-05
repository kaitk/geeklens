# Architecture and page integration

This note documents the parts of GeekLens that are easiest to break when
Geekbench changes versions or markup. General setup and release commands remain
in the [README](../README.md).

## Runtime shape

`src/manifest.json` is a templated cross-browser manifest. The Vite extension
plugin expands its `{{chrome}}` and `{{firefox}}` keys and writes browser-specific
builds to `dist/<browser>/`.

The background script only enables the toolbar action on supported Geekbench
URLs. A single content entry, `src/content/contentScript.ts`, detects the page
shape and owns annotation at DOM ready.

The content entry delegates to two page adapters:

- `src/content/singleResultPage.ts` reads the result's system table, loads one
  cached result context, and annotates benchmark tables from its compatibility
  instruction-set string.
- `src/content/comparisonPage.ts` obtains result contexts for both results (from
  IndexedDB or fetched result pages), adds instruction sets to the comparison
  system table, and annotates both CPUs' graph rows.

Both adapters route between Geekbench 6 and 7 based on the URL generation.
Geekbench 6 exposes instruction sets in result-page HTML. Geekbench 7 omits that
row, so GeekLens fetches and normalizes the result's `.gb6` JSON payload once,
reads metric `20000` from the cached metadata, and adds an Instruction Sets row
to the rendered system information.

Geekbench 7 is the primary target for new result-metadata features. Geekbench 6
remains supported for its existing instruction annotations and may share richer
features when doing so is low-cost, but it does not require feature parity when
that would add generation-specific parsing, caching, or UI complexity.

Shared selectors and benchmark-name extraction live in
`src/content/domUtils.ts`. Svelte components in `src/content/` render badges;
they should not contain Geekbench page-parsing logic. Both adapters share
`src/content/statusBanner.ts` (the status pill, which also serves as the
"already annotated" guard) and `src/content/mountBadges.ts` (component
mounting), so neither adapter creates DOM containers itself. Mount containers
carry explicit `data-geeklens-*` ownership markers; parsing and duplicate
guards must use those markers rather than Svelte component CSS classes.

The processor-context presentation is orchestrated by
`src/content/processorContextUi.ts`, with its neutral contract and feature renderers
under `src/content/processorContext/`. It is not a parser
or data source. Page adapters pass it real cached contexts through a pure
view-model boundary; never embed preview values or fetch from the renderer. All
currently exposed processor-context slices are wired and default on.
`src/content/rowMarker.ts` owns the common marker for rows GeekLens creates.
See [Result metadata and processor context](result-metadata.md) for payload,
identity, provenance, fixture, and catalogue-maintenance rules.

Geekbench Browser URL shapes live in `src/geekbench/urls.ts`, and the
authenticated `.gb6` payload fetch in `src/geekbench/resultPayloadClient.ts`.
Keep both generations' URL literals there rather than at the call sites.

## Data flow

Geekbench's space-separated instruction-set string is:

1. categorized for the system-information display by `src/isa/categories.ts`;
2. normalized to a set of uppercase names by `src/isa/instructions.ts`;
3. intersected with each workload's known accelerators in
   `src/isa/benchmarkMap.ts`; and
4. rendered as instruction badges.

`src/isa/workloadInstructions.ts` is the only place that chooses between the
Geekbench 6 and Geekbench 7 benchmark maps. It returns a `confidenceNote` for
inferred mappings and omits it for documented ones, so callers cannot render an
inferred Geekbench 7 mapping without its warning. A `suspected` workload returns
the note with an empty instruction list, so the two annotation call sites render
on either signal rather than on badge count alone. The `mappingWarnings` setting
suppresses the warning at render time in `TableInstructionSets.svelte`, not at
lookup time, so toggling it re-renders open pages; a suspected workload drops its
container entirely when warnings are hidden, since the warning was its only
content.

`src/cache/ResultsCache.ts` stores a result context in IndexedDB: normalized
payload metadata when available, a compatibility instruction-set string, and
explicit Geekbench processor/Mac links found in result HTML. Cache keys include
the Geekbench generation and result ID (`v<generation>:cpu:<resultId>`) so
results cannot collide across generations. Database version 3 replaces the
legacy instruction-set-only store with the result-oriented `results` store;
the old cache is intentionally discarded during that upgrade. Successful reads
update `lastAccessedAt` on a best-effort basis. Once the cache exceeds 5,000
results, opportunistic background cleanup removes least-recently-used entries
until 4,000 remain. Cache writes never prevent otherwise successful page
annotation, including when an upgrade is blocked by a tab using an older schema.

Canonical-link parsing lives in `src/geekbench/processorLinks.ts`. It accepts
only same-origin `/processors/<slug>` and `/macs/<slug>` paths from system tables.
Single-result pages scan their system tables; comparison pages map the second
and third system-table columns to primary and baseline results. Explicit links
are stronger identity evidence than future name/alias heuristics.

Geekbench 7 has no public benchmark-internals document. Its deliberately narrow
per-workload map lives in `src/isa/benchmarkMapV7.ts`; inferred and suspected
mappings must carry an amber warning and must not be promoted to confirmed
without a direct source or instruction trace. Instructions that every result of
an architecture reports, such as SSE2 or NEON, are not badged: they would render
universally and discriminate nothing. See
[Geekbench 7 data sources and confidence](geekbench7-sources.md) for the current
evidence and open questions.

## Adding a Geekbench generation

Keep generation-specific concerns together instead of silently widening v6
logic:

- Add the generation to `SUPPORTED_GENERATIONS` in
  `src/geekbench/generation.ts`. That covers URL parsing, content-script
  routing, and the `src/background.ts` action toggle.
- Add the new URL matches to `src/manifest.json` by hand. It is static JSON and
  cannot read the constant above, so it is the one place that must be kept in
  sync manually. `generation.test.ts` fails if the lists drift.
- Verify single-result and comparison URL shapes independently.
- Capture selectors and benchmark-name extraction for representative pages.
- Add a generation-specific benchmark map based on an authoritative benchmark
  internals source.
- Check when instruction-set metadata became available and whether comparison
  pages expose it directly.
- Include the Geekbench generation in cache identity if result IDs or metadata
  can overlap.
- Update the Vite development start URL, README claims/examples, and manual test
  pages.

At minimum, manually test Chrome and Firefox builds against x86 and ARM results,
one older result without instruction metadata, and a comparison where only one
side has usable metadata. RISC-V coverage should be included when a representative
public result is available.

## Known coupling and pitfalls

- Exact benchmark display names are keys in the benchmark map.
- Comparison parsing depends on row classes and relative row ordering.
- Geekbench rejects both GB6 comparison HTML requests and GB7 `.gb6` payload
  requests while a comparison baseline is selected. The comparison adapter
  therefore clears the baseline once, fetches missing primary and baseline data
  in parallel, then restores the baseline once in a `finally`.
- Geekbench 7 instruction data requires being signed in; logged-out pages carry
  none at all. The comparison adapter therefore skips fetching entirely for a
  signed-out Geekbench 7 visitor rather than disturbing the baseline for a
  request that cannot succeed. Recheck this whenever a new Geekbench version
  ships: if logged-out pages start exposing instruction sets again — either as a
  rendered Instruction Sets row or in a payload readable while signed out — then
  the skip becomes a silent regression that hides data GeekLens could show.
  Re-verify against a logged-out single result and comparison page, and prefer
  reading the row directly over fetching, as Geekbench 6 does.
- The popup settings use synchronized browser storage, while result metadata uses
  page-origin IndexedDB.
- Settings are consumed by badge components.
- Saving popup settings reloads the active Geekbench tab because DOM-level data
  blocks are not live-mounted components. Badge colors and tooltips are global
  presentation preferences; processor-context controls are enabled only as
  their real view models land.
