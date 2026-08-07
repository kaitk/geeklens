# Content UI and settings cleanup

**Status:** in progress; settings and adjacent Svelte cleanup complete.  
**Raised:** 2026-08-07.

The remaining work is the processor-context renderer split. Its presentation is
still concentrated in `processorContextUi.ts`. The data contract and identity
renderer have already been extracted, but frequency, memory, topology, score
references, scaling, cache warnings, and page orchestration still share one
large imperative module.

This remains a behavior-preserving cleanup, not authorization for a visual
redesign or a Svelte rewrite of Geekbench-owned tables.

## 1. Split the processor-context DOM renderer

Continue the extraction already started under `content/processorContext/`.
`model.ts` owns the neutral view-model contract and `identity.ts` owns identity
rendering; do not redo those moves.

Extract the remaining features incrementally, in roughly this order:

1. `frequency.ts` for distribution charts and single/comparison frequency UI;
2. `memory.ts` for memory summaries, provenance, bandwidth, and tooltips;
3. `topology.ts` for topology parsing, cluster presentation, and composition;
4. `scoreReferences.ts` for averages, deltas, and unavailable states;
5. `scaling.ts` for single/comparison multi-core scaling notes;
6. `cacheDispute.ts` for L3 dispute detection and presentation; and
7. `render.ts` for single/comparison orchestration and preference application.

The exact boundaries may follow dependencies discovered during extraction.
Keep shared DOM helpers narrowly scoped and avoid a generic UI utility layer.

Preserve the imperative DOM approach: GeekLens is inserting into and modifying
tables owned by Geekbench. Do not convert those tables or the whole processor
context feature to Svelte. Svelte remains appropriate for GeekLens-owned leaf
components mounted inside explicit GeekLens containers.

Keep `renderSingleProcessorContext`, `renderComparisonProcessorContext`, and
`applyProcessorContextPreferences` as the stable page-adapter API. During the
split, `processorContextUi.ts` may remain as a compatibility facade so each
feature extraction is independently reviewable.

Run the existing processor-context DOM integration tests after every extraction.
Do not change selectors, ownership markers, class names, DOM order, settings
behavior, or visual presentation as part of the split.

This section overlaps section 4 of
`docs/tasks/processor-context-architecture.md`. Update that task as features are
extracted so the two notes do not disagree about completed work.

## 2. Finish the facade and documentation

After the feature modules have been extracted, reduce `processorContextUi.ts` to
orchestration or a compatibility facade. Update `docs/architecture.md` and
`docs/tasks/processor-context-architecture.md` so they describe the resulting
module ownership and do not retain completed extraction work as open work.

## Sequencing

Keep the remaining work in reviewable units:

1. Extract one or two processor-context features at a time and run the DOM
   integration tests after each group.
2. Reduce the original renderer to orchestration or a compatibility facade.
3. Update architecture and task documentation.
4. Run the complete validation suite and both browser builds.
5. Manually exercise a CPU result and comparison page in Chrome and Firefox.

Keep feature extractions separate enough that regressions can be isolated and
reviewed before the final facade and documentation pass.

## Acceptance criteria

- no single processor-context module owns every feature renderer;
- the stable page-adapter rendering API and existing DOM behavior are preserved;
- architecture and task documentation describe the shipped design accurately;
- formatting, linting, tests, type/Svelte checks, and both browser builds pass;
- one CPU result and one comparison page are manually exercised in both
  unpacked browser builds.

## Validation

Run with user-approved elevated execution in the Codex environment:

```sh
bun run format:check
bun run lint
bun test
bun run check
bun run build:chrome
bun run build:firefox
```

For the DOM integration changes, load `dist/chrome/` and `dist/firefox/` and
manually exercise a representative CPU result and comparison page.
