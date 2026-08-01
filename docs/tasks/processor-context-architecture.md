# Processor-context architecture cleanup

**Status:** open; not scheduled.
**Raised:** 2026-08-01.

The processor-context feature has sound data boundaries, but continued growth has
left one reversed type dependency, a large DOM renderer, duplicated context-loading
policy, and a few missing integrity guards. Address these incrementally; this is not
authorization for a broad UI rewrite.

## 1. Move the view-model contract out of the renderer

`processorContextViewModel.ts` currently imports `ProcessorContextViewModel` from
`processorContextUi.ts`, even though the renderer conceptually consumes the model.

Create a neutral model module owned by neither the builder nor the renderer. Move
`ProcessorContextViewModel`, `ProvenanceFact`, `MemoryFact`, and directly related
types into it, then update both sides to import the contract from there.

Do this before splitting the renderer so the new renderer modules all depend in
the correct direction:

```text
payload/cache/catalogue -> view-model builder -> model contract -> DOM renderer
```

## 2. Add maintenance integrity guards

Add a version synchronization test that fails when `package.json` and
`src/manifest.json` disagree.

Add an assembled-catalogue integrity suite, preferably
`src/catalogue/processorCatalogue.test.ts`, covering:

- unique catalogue keys;
- unique canonical processor paths;
- unique canonical Mac paths;
- every reviewed hardware key targets a base identity;
- every reviewed core-composition key targets a base identity;
- every reviewed dispute key targets a base identity; and
- catalogue assembly attaches overlays without creating or dropping identities.

Keep exact data assertions in the domain tests where they already belong. These
new tests protect relationships between datasets rather than snapshotting the
whole catalogue.

## 3. Repair architecture documentation drift

Update `docs/result-metadata.md` to describe the shipped unique cluster-to-group
matcher. It currently says core names are never assigned to topology segments,
which is no longer true when exactly one assignment is feasible.

Update catalogue maintenance paths to point at the extracted source and overlay
modules rather than `processorCatalogue.ts`. Mark completed task notes as
historical where their old paths or assumptions are intentionally retained.

## 4. Split the processor-context DOM renderer by feature

`processorContextUi.ts` handles identity, source links, frequency charts, memory,
topology, score references, scaling, L3 warnings, single/comparison orchestration,
and preference application. Split these into cohesive modules while preserving a
small public orchestration surface for the page adapters.

A reasonable target is:

```text
src/content/processorContext/
  model.ts
  identity.ts
  frequency.ts
  memory.ts
  topology.ts
  scoreReferences.ts
  render.ts
```

The exact filenames may follow the code discovered during extraction. Keep shared
DOM primitives narrowly scoped rather than introducing a generic UI utility layer.
Preserve the existing imperative DOM approach: GeekLens is augmenting tables owned
by Geekbench, so rewriting the feature wholesale in Svelte is out of scope.

Keep `renderSingleProcessorContext`, `renderComparisonProcessorContext`, and
`applyProcessorContextPreferences` as the stable page-adapter API, either through
the existing module as a compatibility facade or through one clearly named entry
module.

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

Implement in this order to keep diffs reviewable:

1. Move the model types without changing behavior.
2. Add version and catalogue integrity tests.
3. Correct the documentation.
4. Split the renderer one feature at a time.
5. Consolidate result loading only when the next page-fetch change provides a
   concrete reason to touch that behavior. Keep the existing single and
   comparison tests green throughout.

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
