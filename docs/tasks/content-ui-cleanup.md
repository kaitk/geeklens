# Content UI and settings cleanup

**Status:** complete.
**Raised:** 2026-08-07.

The processor-context renderer is split by feature under
`content/processorContext/`, and `processorContextUi.ts` is now a small stable
page-adapter facade.

This remains a behavior-preserving cleanup, not authorization for a visual
redesign or a Svelte rewrite of Geekbench-owned tables.

## 1. Split the processor-context DOM renderer — complete

`model.ts` owns the neutral view-model contract. `identity.ts`, `frequency.ts`,
`memory.ts`, `topology.ts`, `scoreReferences.ts`, `scaling.ts`, and
`cacheDispute.ts` own their feature presentation. `render.ts` owns
single/comparison orchestration and preference application; `sourceLink.ts` and
`rows.ts` contain only narrowly shared processor-context DOM behavior.

The exact boundaries may follow dependencies discovered during extraction.
Keep shared DOM helpers narrowly scoped and avoid a generic UI utility layer.

Preserve the imperative DOM approach: GeekLens is inserting into and modifying
tables owned by Geekbench. Do not convert those tables or the whole processor
context feature to Svelte. Svelte remains appropriate for GeekLens-owned leaf
components mounted inside explicit GeekLens containers.

`renderSingleProcessorContext`, `renderComparisonProcessorContext`, and
`applyProcessorContextPreferences` remain the stable API re-exported by the
`processorContextUi.ts` compatibility facade.

DOM-anchor ownership is orchestration-first: `render.ts` locates the shared
CPU/System Information table and its processor, topology, and cache rows, then
passes anchors into feature modules. Score references and scaling locate their
exclusive benchmark score DOM. Single-result memory is the documented exception
because it owns the distinct Geekbench Memory Information table.

Run the existing processor-context DOM integration tests after every extraction.
Do not change selectors, ownership markers, class names, DOM order, settings
behavior, or visual presentation as part of the split.

This section overlaps section 4 of
`docs/tasks/processor-context-architecture.md`. Update that task as features are
extracted so the two notes do not disagree about completed work.

## 2. Finish the facade and documentation — complete

The facade now contains only stable re-exports, and architecture documentation
records the shipped module and DOM-anchor ownership.

## 3. Adjacent review findings — complete

- `InstructionBadge.svelte` renders its described tooltip as a sibling, keeping
  the instruction as the button name and the tooltip as its description.
- Escape removes the badge's keyboard focus trigger; pointer hover and normal
  focus behavior remain unchanged.
- `SettingsTab.svelte` clears its transient status timeout when destroyed.
- `BadgePresentationPreferences` lives beside the badge components rather than
  in their mounting adapter.

No review finding required deferral or a broader UI redesign.

## Historical sequencing

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
