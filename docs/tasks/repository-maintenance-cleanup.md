# Repository maintenance cleanup

**Status:** proposed; small behavior-preserving slices may land independently.
**Raised:** 2026-08-07.

The repository is already deliberately structured. This task records residual
cleanup found after the settings and processor-context renderer refactors; it is
not authorization for another broad module split, a visual rewrite, or catalogue
reorganization.

The generated/reviewed/overlay catalogue design, colocated domain tests,
imperative augmentation of Geekbench-owned tables, and current small UI helper
modules should remain as they are. The larger result-context loading change stays
deferred in `processor-context-architecture.md` section 5.

## 1. Remove obsolete internal APIs

`ResultsCache.storeInstructionSet` and `ResultsCache.getInstructionSet` have no
callers. They are remnants of the instruction-set-only cache API replaced by
`storeResultContext` and `getResultContext` in schema version 3. Delete both
methods rather than keeping two ways to access the same record.

`extractInstructionSetsFromPayload` is likewise only exercised by its own tests;
runtime callers consume `extractResultMetadata`. Remove the wrapper and move any
still-useful assertions to the normalized metadata tests, provided a final call
site search still confirms it has no consumer.

While touching these modules, remove `export` from constants and supporting types
that are only used in their declaring module. Do not hide types that page adapters,
tests, scripts, or catalogue assembly actually import.

## 2. Remove processor-context prototype naming from code identifiers

The processor-context renderer still names real `ProcessorContextViewModel`
values `preview`/`previews`. Rename TypeScript parameters and locals to
`viewModel`/`viewModels` (or a similarly precise term) across
`content/processorContext/` and its tests. This is a mechanical vocabulary
cleanup: the renderer now receives real cached result context, not prototype
preview data.

Keep the existing `data-geeklens-preview-*` attributes and
`geeklens-preview-*` classes in this slice. They are functional ownership,
idempotence, test, and styling contracts. Renaming them would create broad DOM and
CSS churn without simplifying runtime behavior. If those markers are ever
renamed, do it as a dedicated migration that updates selectors, CSS, tests, and
the ownership-marker documentation together.

## 3. Finish selector centralization

`content/processorContext/render.ts` reimplements the scan for the
`CPU Information` system table even though `findSystemTableByHeading` in
`content/domUtils.ts` owns that selector and `singleResultPage.ts` already uses
it. Reuse the shared helper from the renderer so the architecture rule that
shared Geekbench selectors live in `domUtils.ts` remains true.

Before adding any new generic DOM helper, require at least two real call sites and
keep feature-specific row knowledge in the feature or orchestration module that
owns it. The similar Memory Information scan in the memory renderer should reuse
the heading helper; L3, topology, score, and comparison-lane discovery should not
be forced into a generic abstraction merely for uniformity.

## 4. Centralize current-page URL parsing

The URL builders live in `src/geekbench/urls.ts`, but result-ID parsing currently
lives in the page adapters:

- `singleResultPage.ts` takes the last pathname segment inline; and
- `comparisonPage.ts#extractResultIds` parses the comparison path and baseline
  query parameter locally.

Add typed parsers beside the URL builders, such as
`parseResultId(pathname)` and `parseComparisonIds(url)`. They must validate the
supported CPU result/comparison shape rather than accepting an arbitrary final
path segment, and they must continue to treat result IDs as opaque strings that
are escaped only when constructing a request URL.

Cover all supported generations, missing and malformed IDs, unrelated paths,
comparison URLs without a baseline, and query parameter ordering in `urls.test.ts`
or `generation.test.ts`. The adapters should only decide what to do with a failed
parse, not know the path layout themselves.

## 5. Reconcile the Geekbench 7 suspected-mapping contract

The code and tests deliberately suppress a `suspected` Geekbench 7 workload when
it cannot name any instruction: `getV7SupportedInstructions` returns no match,
the page adapters require at least one instruction, and
`TableInstructionSets.svelte` only renders a non-empty badge container.

`docs/architecture.md` currently says the opposite: that a suspected workload
returns a note with no instructions and renders a warning by itself. Choose and
document one contract. Unless a product decision explicitly requests lone
warnings, treat the tested implementation as authoritative and update the
architecture text to say suspected notes are retained as mapping rationale but
do not render. Keep the rule that every rendered inferred mapping carries its
warning when `mappingWarnings` is enabled.

A narrow shared workload-cell mounting helper may replace the repeated
resolve/check/mount sequence in the two page adapters if it makes that contract
impossible to apply differently. Do not combine their distinct row traversal.

## 6. Establish one extension metadata source

`vite.config.ts` reads `name`, `description`, and `version` from `package.json`,
then spreads `src/manifest.json` afterward and overwrites those values. The zip
script names releases from the package version, while a test keeps the duplicated
manifest version synchronized.

Make the ownership explicit. The preferred direction is:

1. keep release metadata in `package.json` (adding the missing description);
2. merge the manifest template first and package metadata last in
   `generateManifest`;
3. remove duplicated source-manifest metadata if the extension plugin accepts a
   generated manifest whose template omits it; and
4. retain an integrity test that checks the generated manifest contract rather
   than two hand-maintained copies.

If plugin or schema tooling requires complete metadata in the source template,
document that constraint and instead remove the ineffective package injection.
Do not keep the current ambiguous merge order.

Update the README installation section at the same time. It currently tells
Chrome and Firefox users to load the repository root, while the development
section correctly points to `dist/chrome/` and `dist/firefox/`. Manual source
installation must say to build first and load the browser-specific output, or
point users to a packaged release.

## 7. Normalize logging without hiding failures

Logging is low priority. Most runtime messages already carry a `GeekLens:` prefix,
but a few do not, and routine start/skip messages write to the host page console
for every visitor. If logging is touched, add a small logger or equally narrow
wrapper that:

- prefixes messages consistently;
- keeps actionable request, parsing, cache, and baseline failures visible;
- gates routine lifecycle and cache/skip diagnostics behind a debug flag; and
- does not swallow errors merely to make the console quiet.

A missing `geekLensSettings` key is the normal first-run state. `loadSettings`
should return defaults silently (or under the debug gate); only an actual storage
API rejection should be logged as a failure. Remove the stale comment about
approved-but-unwired settings now that every exposed processor-context control is
implemented.

## 8. Small test and utility maintenance

These are optional follow-ups, not prerequisites for the runtime cleanups above:

- split the large `processorContextUi.test.ts` suite by feature while sharing its
  fixture, settings, and view-model factories;
- make `waitForElement` query once per check, clear its timeout after resolution,
  and test both immediate and observer-driven resolution; and
- keep coverage interpretation honest: aggregate coverage omits runtime entry
  modules that no test imports. Adapter coverage belongs to the deferred loader
  task rather than to a percentage-only target here.

For any currently unimported runtime module, add characterization tests for the
working behavior before splitting or substantially rearranging it. Land the tests
separately when practical, then require the same tests to pass unchanged through
the refactor. A minimal injection seam is acceptable when necessary to isolate
network, IndexedDB, or browser state, but it must not silently become the refactor
it was meant to protect.

Do not split `resultPayload.ts` or `processorContextViewModel.ts` solely because
of line count. Their private feature builders are cohesive and heavily covered;
extract them only when a concrete change creates a better boundary.

## Suggested sequencing

Each slice should remain independently reviewable:

1. Correct the suspected-mapping architecture text and README installation paths.
2. Remove dead cache/payload APIs and stale comments.
3. Reuse the shared system-table selector and add the URL parsers with tests.
4. Rename TypeScript `preview` identifiers without changing DOM/CSS markers.
5. Resolve manifest metadata ownership and its integrity test.
6. Normalize logging only if console noise is still worth the added abstraction.
7. Split tests or adjust `waitForElement` when those files are next touched.
8. When result loading is eventually triggered, add adapter characterization
   tests first and only then follow `processor-context-architecture.md` section 5.

Do not mix these with catalogue data changes, visual changes, or the deferred
result-loading extraction.

## Acceptance criteria

The task is complete when the selected slices have landed and:

- the obsolete cache methods and test-only payload wrapper have no remaining
  declarations or callers;
- processor-context TypeScript identifiers no longer describe real view models
  as previews, while existing DOM/CSS ownership contracts remain stable;
- shared CPU/Memory table-heading selectors are not reimplemented by renderers;
- result and comparison IDs are parsed and tested through the Geekbench URL
  module;
- architecture documentation matches the tested suspected-mapping behavior;
- extension metadata has one documented source and release filenames cannot
  silently disagree with built manifests;
- manual-install instructions point to valid browser-specific build output;
- missing synchronized settings are treated as normal first-run state; and
- formatting, linting, tests, type/Svelte checks, and both browser builds pass.

If a slice changes DOM ownership markers or page-adapter orchestration despite
the boundaries above, also load both unpacked builds and manually exercise one
CPU result and one comparison page.
