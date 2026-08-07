# Processor-context architecture cleanup

**Status:** renderer architecture cleanup complete; result loading remains
explicitly deferred until fetch behavior changes.
**Raised:** 2026-08-01.

The processor-context feature has sound data boundaries, but continued growth has
left one reversed type dependency, a large DOM renderer, duplicated context-loading
policy, and a few missing integrity guards. Address these incrementally; this is not
authorization for a broad UI rewrite.

## 1. Move the view-model contract out of the renderer — complete

`content/processorContext/model.ts` now owns `ProcessorContextViewModel`,
`ProvenanceFact`, `MemoryFact`, and the directly related types. The builder and
renderers import the contract from that neutral module.

The renderer modules therefore depend in the intended direction:

```text
payload/cache/catalogue -> view-model builder -> model contract -> DOM renderer
```

## 2. Add maintenance integrity guards — complete

`src/version.test.ts` checks that `package.json` and `src/manifest.json` agree.
`src/catalogue/processorCatalogue.test.ts` covers:

- unique catalogue keys;
- unique canonical processor paths;
- unique canonical Mac paths;
- every reviewed hardware key targets a base identity;
- every reviewed core-composition key targets a base identity;
- every reviewed dispute key targets a base identity; and
- catalogue assembly attaches overlays without creating or dropping identities.

Exact data assertions remain in the domain tests; these guards protect
relationships between datasets rather than snapshotting the whole catalogue.

## 3. Repair architecture documentation drift — complete

`docs/result-metadata.md` describes the shipped unique cluster-to-group matcher,
and catalogue maintenance paths point at the extracted source and overlay
modules. Completed task notes retain historical paths only where called out.

## 4. Split the processor-context DOM renderer by feature — complete

The model contract and feature renderers now live under
`content/processorContext/`. `render.ts` owns single/comparison orchestration and
preference application; `processorContextUi.ts` is only the compatibility facade
for the stable page-adapter exports.

A reasonable target is:

```text
src/content/processorContext/
  model.ts
  identity.ts
  frequency.ts
  memory.ts
  topology.ts
  scoreReferences.ts
  scaling.ts
  cacheDispute.ts
  render.ts
```

`rows.ts` owns shared row labels and idempotent label reading. `sourceLink.ts`
owns the other narrowly shared processor-context affordance; no generic UI
utility layer was introduced. The imperative DOM approach remains because
GeekLens augments Geekbench-owned tables.

Orchestration locates shared CPU/System Information tables and rows and passes
those anchors to features. Score features locate their exclusive benchmark score
DOM, and single-result memory owns the distinct Memory Information table as a
documented exception. `renderSingleProcessorContext`,
`renderComparisonProcessorContext`, and `applyProcessorContextPreferences` remain
the stable facade API.

## 5. Consolidate result-context acquisition when next touching fetch behavior

`singleResultPage.ts` and `comparisonPage.ts` independently implement variants of
the same policy:

1. read a cached context;
2. obtain missing HTML or payload metadata;
3. normalize instruction sets and metadata;
4. merge canonical processor/Mac links; and
5. update the cache without erasing stronger existing facts.

Do not extract this speculatively as part of the earlier cleanup. When the next
change touches page fetching or result-context acquisition, extract the shared
policy behind a typed loader with an injected page-specific fetch strategy.
Preserve these intentional differences:

- Geekbench 6 may read instruction sets from result HTML.
- Geekbench 7 reads authenticated payload metadata.
- Comparison baseline clearing and restoration remains owned by
  `comparisonPage.ts`; it is not generic loading behavior.
- Signed-out Geekbench 7 pages must continue to skip payload requests.
- Explicit newly discovered links must retain their existing precedence.

Do not combine the two page adapters themselves. They still own different DOM
shapes and annotation flows.

## Priority and sequencing

Renderer cleanup is complete. Consolidate result loading only when a later
page-fetch change provides a concrete reason to touch that behavior.

Each step should be independently committable. Avoid mixing visual changes,
catalogue data additions, or unrelated cleanup into these extractions.

## Acceptance criteria

The task is complete when:

- the view-model builder no longer imports types from a UI renderer;
- no single processor-context renderer module owns all feature renderers;
- version and catalogue relationship tests cover the invariants above;
- architecture documentation matches the current implementation;
- existing public behavior and settings remain unchanged; and
- formatting, linting, tests, type/Svelte checks, and both browser builds pass.

Result-loading consolidation is explicitly deferred until another change touches
page-fetch behavior. Once triggered, it becomes complete when single and
comparison pages share one tested loading policy while retaining their
page-specific fetch and baseline behavior.

For the renderer and loading changes, manually exercise one Geekbench 7 CPU
result and one comparison page in both unpacked builds, as required for DOM
integration changes.
