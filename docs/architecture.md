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

- `src/content/singleResultPage.ts` reads the result's system table, caches its
  instruction-set string, and annotates benchmark tables.
- `src/content/comparisonPage.ts` obtains instruction sets for both results
  (from IndexedDB or fetched result pages), adds them to the comparison system
  table, and annotates both CPUs' graph rows.

Both adapters route between Geekbench 6 and 7 based on the URL generation.
Geekbench 6 exposes instruction sets in result-page HTML. Geekbench 7 omits that
row, so GeekLens reads metric `20000` from the result's `.gb6` JSON payload and
adds an Instruction Sets row to the rendered system information.

Shared selectors and benchmark-name extraction live in
`src/content/domUtils.ts`. Svelte components in `src/content/` render badges;
they should not contain Geekbench page-parsing logic. Both adapters share
`src/content/statusBanner.ts` (the status pill, which also serves as the
"already annotated" guard) and `src/content/mountBadges.ts` (component
mounting), so neither adapter creates DOM containers itself. Mount containers
carry explicit `data-geeklens-*` ownership markers; parsing and duplicate
guards must use those markers rather than Svelte component CSS classes.

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
inferred Geekbench 7 mapping without its warning.

`src/cache/ResultsCache.ts` stores raw instruction-set strings in IndexedDB.
Cache keys include the Geekbench generation and result ID
(`v<generation>:cpu:<resultId>`) so results cannot collide across generations.

Geekbench 7 has no public benchmark-internals document. Its deliberately narrow
per-workload map lives in `src/isa/benchmarkMapV7.ts`; inferred mappings must
carry an amber warning and must not be promoted to confirmed without a direct
source or instruction trace. See
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
