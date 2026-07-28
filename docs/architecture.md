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
they should not contain Geekbench page-parsing logic.

## Data flow

Geekbench's space-separated instruction-set string is:

1. categorized for the system-information display by `src/isa/categories.ts`;
2. normalized to a set of uppercase names by `src/isa/instructions.ts`;
3. intersected with each workload's known accelerators in
   `src/isa/benchmarkMap.ts`; and
4. rendered as instruction badges.

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

- Add the new URL matches to the manifest and action-enable logic in
  `src/background.ts`.
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
- Fetching a comparison URL without a baseline can alter Geekbench's selected
  baseline; the current adapter reapplies it afterward.
- Geekbench 7 `.gb6` payloads are fetched only after clearing the comparison
  baseline. Fetch primary and baseline payloads sequentially before reapplying
  the baseline because selection is shared session state.
- The popup settings use synchronized browser storage, while result metadata uses
  page-origin IndexedDB.
- Settings are consumed by badge components.
