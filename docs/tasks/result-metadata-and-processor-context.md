# Result metadata and processor context

**Status:** stages 1–8 are implemented for the validated Geekbench 7 processor
chart scope. The complete-state UI/UX remains canonical and data-driven; all
fabricated preview data has been removed. Every implemented data control is
enabled and defaults on.
**Raised:** 2026-07-31.

Stage 1 added sanitized full-payload fixtures, linked/unlinked Mac HTML fixtures,
and the typed `extractResultMetadata` parser with cross-architecture tests. The
runtime still consumes its existing instruction-set compatibility wrapper; no
fetching, cache, settings, or UI behavior changed in this stage.

The pre-stage-2 review added a typed fixture manifest and expanded x86 coverage
to Zen 2, Zen 5, Comet Lake, Ice Lake, Raptor Lake, Gracemont-only, Arrow Lake,
and Sapphire Rapids. It also documents the frequency quantile method, shares
GHz/MHz normalization, rejects zero-core cluster placeholders, tests processor
name fallbacks, and marks fixture sanitization as a maintainer-only import step.
Two full Geekbench 6 compatibility fixtures cover Apple M5 Max and AMD Ryzen 9
9950X. They verify the shared parser but do not change the Geekbench 7-first
runtime and product scope.

Stage 2 changed the Geekbench 7 payload client to return normalized metadata,
upgraded IndexedDB records without replacing the legacy object store, and wired
single/comparison pages to cache one result context per generation/result ID.
The context includes normalized metadata, the compatibility instruction string,
and explicit canonical processor/Mac links. Geekbench 6 keeps its rendered-HTML
instruction path and gains link caching only where it shares existing requests.

Stage 3 added a pure cached-context-to-view-model mapper and retained full result
contexts in both page adapters. Geekbench 7 single and comparison pages now
render real processor name, vendor, ISA family, and an explicitly discovered
catalogue link in the approved native processor cells. Missing or malformed
metadata renders no summary, and a missing comparison side retains its native
Geekbench value. `showProcessorSummary` is now enabled and defaults on; the
other four processor-context controls remain disabled and forced off. Existing
ISA annotations continue to derive from the same context's instruction string.

The first stage-7 slice added a generated, checked-in identity snapshot of 264
AMD, Intel, and Qualcomm processors from the captured Geekbench 7 Processor
Benchmark Chart, plus 15 Mac configurations from the captured Mac family table. The
Mac page's conflicting Geekbench 6/7 score copy is recorded explicitly, so this
slice imports its identities/configurations but not its scores. A pure
resolver applies exact Mac path, processor path, and reviewed alias precedence,
rejects ambiguous/configuration-incompatible aliases, and returns typed unmatched
reasons. Only exact resolved entries produce catalogue links and score
references. Runtime performs no catalogue request.

Stage 4 maps cached frequency statistics into the view model and renders the
approved native Frequency row on single and comparison pages. Comparison graphs
use per-result scales so widely separated clock ranges do not squash either
distribution, while visible and accessible text retains exact per-result
min/mean/max values. Missing and all-zero captures render no single
row and an explicit unavailable comparison cell. The default-on Frequency
setting is enabled; no fetch or catalogue lookup was added.

Stage 5 renders payload-reported capacity/configuration, conservatively computed
DDR4/DDR5 theoretical bandwidth, and exact catalogue-published Apple/Qualcomm
memory facts as separate one-fact-per-line values. Published provenance links to
the reviewed first-party source and includes its retrieval date in accessible
text. LPDDR/unified-memory bandwidth is never computed from payload fields, and
unmatched Apple results retain capacity without fabricated specifications. The
Memory setting is enabled and defaults on.

The stage-5 follow-up displays payload transfer rates as nearby nominal
hundreds when the observation is within one percent (for example, 3598 as
3600), retaining the exact payload value in the provenance tooltip. This is a
display normalization, not a claim that the configuration is a JEDEC-certified
bin. Matched Apple entries expose the source-supported `Unified memory`
technology label; LPDDR generations remain omitted unless an exact device or
processor source supports them. Expanded single-result memory blocks relabel
the native `Size` field to `Details`.

The exact 10-core M1 Pro match is the first Apple LPDDR exception: independent
technical documentation identifies its unified memory as LPDDR5-6400 on a
256-bit interface, consistent with its published 200 GB/s maximum. It must not
be labelled LPDDR5X.

The Lenovo `21CQS02000` capture also pins an observed payload correction: its
exact ThinkPad T14s Gen 3 AMD system/processor pair is matched to Lenovo's
LPDDR5-6400 specification. The UI retains the conflicting DDR5/1596 payload
values in the provenance tooltip and suppresses the invalid desktop-DDR
bandwidth calculation. Four 32-bit subchannels alone are deliberately not used
as an LPDDR heuristic because desktop DDR5 exposes the same topology.

**Correction (2026-08-01):** this entry previously cited the ThinkPad X13 Gen 3
AMD PSREF page. Lenovo machine type `21CQ` is T14s Gen 3 (AMD); X13 Gen 3 (AMD)
is `21CM`/`21CN`. Both ship LPDDR5-6400, so the wrong document produced the
right value and the error was invisible in the rendered output.

### Payload validity floor

The whitelist above only ever covered one machine, so every other soldered-LPDDR
laptop fell through to the computed-bandwidth path and rendered a figure
understated by the LPDDR5 4:1 WCK:CK ratio. `reportedRateBelowJedecMinimum`
generalizes the correction without extending the whitelist: a payload naming a
DDR generation while reporting a rate below that generation's JEDEC minimum
(DDR4 1600, DDR5 3200) is self-inconsistent, so bandwidth is suppressed and the
type renders as `<generation>-class (rate unverified)` with the exact reported
values in the tooltip.

The reported rate is deliberately **not** scaled by 4 to recover the true data
rate. The inference is well supported for LPDDR5, but the result would be a
derived number presented as observation, and the sampled evidence is a single
capture. Exact per-system entries remain the only route to a published rate.

Interface width is unaffected: channel topology stays trustworthy when the rate
does not, so `busWidthBits` is retained and drives the unified `N-bit bus`
presentation shared by payload-derived and catalogue-published widths.

### Apple catalogue identities

Apple chips are absent from the Geekbench 7 Processor Benchmark Chart, so these
entries carry published memory facts and no score references. Apple publishes
unified-memory bandwidth per chip but not memory type, transfer rate, or bus
width, so only bandwidth is recorded except for M1 Pro, where an exact technical
source supports LPDDR5-6400 on a 256-bit interface.

`Apple M1 Ultra` alias-matches an existing unconfigured Mac entry, so its
hardware is attached to that entry rather than to a new identity; adding a second
entry sharing the alias would resolve to `ambiguous-alias` and lose a working
match. `Apple M1` already resolves to `ambiguous-alias` because three
unconfigured Mac entries share the alias.

### Source tiers

Apple coverage now spans M1 through M5, 29 configured core-count bins, of which
28 resolve to exactly one entry. Two publisher tiers are used, and the tier is
always visible in the provenance tooltip rather than being blended away:

- **Apple** for chips Apple chose to headline a bandwidth figure for. This is
  most of the catalogue, including M4 Max at 546 GB/s from the M4 Pro/Max
  announcement rather than the MacBook Pro announcement's "over half a terabyte
  per second".
- **Wikipedia** for the rest. Apple never published bandwidth for the M3 family
  or for the lower-binned M4 Max, and publishes no memory type, transfer rate,
  or bus width for any chip. The Apple silicon articles carry all four
  consistently across variants. Also used for M1 and M1 Max.
- **Notebookcheck** for M1 Pro, which predates this decision and states memory
  type, bus width, and bandwidth together.

Remaining gaps:

- Bus width for the M3 Max and every M4/M5 variant. The M3 Max controller counts
  were not stated unambiguously enough to assert 384-bit/512-bit, and the M4/M5
  articles omit width entirely.
- Qualcomm X Series transfer rate and bus width. Qualcomm publishes memory type
  and peak bandwidth only.
- `Apple M1` alias matching. Three unconfigured Mac entries share the alias, so
  it resolves to `ambiguous-alias` regardless of core count. Its hardware is
  attached to all three Mac entries, so canonical Mac-path matches do resolve and
  do carry the facts; only the alias fallback is unavailable. Fixing this needs
  either core counts on the generated Mac entries or a resolver change.

A follow-up could compute bandwidth for exact-entry systems from the published
rate and the reported bus width (102.4 GB/s for the Lenovo capture). This was
deliberately not added: it would mix a published rate with a reported width under
a single `computed` provenance label, which needs its own provenance decision.

Stage 6 renders normalized core/thread totals, internally consistent anonymous
cluster counts, and the submitted run's `MT score / ST score` ratio. It does not
assign performance/efficiency roles or present the ratio as parallel
efficiency. The topology setting is enabled and defaults on.

Stages 7–8 now retain the Geekbench 7 single- and multi-core averages from the
captured processor chart in the generated catalogue. Exact generation-matched
processor identities expose signed absolute and percentage deltas through the
approved score UI; unmatched processors, Geekbench 6 results, and Mac family
tables with conflicting Geekbench 6/7 page copy expose no reference. The
reference setting is enabled and defaults on. Mac averages remain the next data
handoff once a capture unambiguously identifies them as Geekbench 7 CPU scores.

## Goal

Use the authenticated Geekbench `.gb6` payload to add optional processor and
run context without coupling payload parsing to the page UI. Candidate features
are processor ISA/vendor badges, processor identification, single-core clock
distribution, and comparison with Geekbench Browser reference scores.

Desktop and laptop processors are the initial product and catalogue scope.
Mobile phones and tablets are a future extension: their payloads may remain as
useful parser/classification fixtures, but the first UI, matching rules,
reference-score snapshot, and hardware-specification catalogue do not need
mobile-specific presentation or complete mobile coverage.

Geekbench 7 is the primary generation for all new metadata features. Geekbench 6
is retained as a secondary, increasingly legacy target: add compatible parsing
or presentation when it naturally shares the Geekbench 7 implementation, but do
not introduce substantial generation-specific complexity merely to achieve
feature parity. Its existing instruction-set behavior must continue to work.

Keep every version-specific assumption explicit. Geekbench's payload metric IDs,
result-to-processor links, processor pages, and Mac catalogue are external and
undocumented interfaces.

## Payload survey

The captures currently under `temp/` cover AMD and Intel x86-64; Apple,
Qualcomm, Google, and NVIDIA AArch64; and RISC-V. Most are Geekbench 7 documents
despite the `.gb6` suffix; two explicit compatibility fixtures are Geekbench 6.

Reusable fields observed in all or most captures:

- `platform.architecture`: `x86_64`, `aarch64`, or `riscv`; this should be the
  primary ISA-family signal, with an `unknown` fallback.
- metrics `8` and `9`: raw and display processor names. Metric `9` is the best
  current candidate for display and matching, but this is an observed mapping,
  not a documented contract.
- metric `10`: codename on the sampled AMD and Intel systems, empty on Apple and
  Qualcomm.
- metric `15`: nominal frequency; metric `89` is another reported frequency.
- metric `29`: memory capacity. On the sampled desktop x86 payloads, metrics
  `30`, `75`, `76`, and `87` also provide memory type, clock, channel/subchannel
  count, and effective transfer rate. Those four fields are empty on all sampled
  Apple, Qualcomm, Google, NVIDIA, and RISC-V payloads.
- metric `20000`: space-separated supported instruction sets.
- `score` and `multicore_score`: overall single- and multi-core scores.
- `processor_frequency.frequencies`: samples in MHz. Useful data exists for the
  AMD, Intel, and Apple captures. The Qualcomm and RISC-V captures contain only
  zeroes, so an empty/unavailable result must be distinct from a real 0 MHz
  distribution.
- `sections`: detailed single- and multi-core workload results. This is useful
  future test coverage but is not needed for the first metadata UI.
- metrics `12` and `13` report logical/core totals in the current captures;
  metrics `45`–`52` describe a variable number of core clusters. Cluster strings
  sometimes include frequencies (Google Tensor) and sometimes do not. Parse
  topology defensively rather than assuming performance/efficiency semantics.

Observed frequency samples vary in count, so parsing must not assume a fixed
sample count. The desired visualization is better described as a compact
distribution/box-and-whisker view than a medical “box plot” unless quartiles are
actually shown. Define the statistic before UI work: minimum, maximum, arithmetic
mean, and optionally median/Q1/Q3. Ignore non-finite and non-positive samples;
return unavailable when none remain.

## Fixture policy

Add structurally complete payloads under `src/geekbench/__fixtures__/`, retaining
all workloads and frequency samples. Do **not** copy the captures verbatim: they
contain `system_uuid`, `uuid`, and hostnames in metric `122`, including personal
machine names. Replace those values with stable obvious placeholders and verify
that no other user identifier remains. Record the public result ID and CPU in a
small fixture manifest or filename, but do not treat the result ID as the
processor identity.

The linked-M4 and unlinked-M5 HTML captures are complementary DOM fixtures.
Sanitize user/profile links and other account-identifying content before
committing them, just as for payload fixtures. Preserve the system-table markup
and whether each value contains an anchor.

Recommended minimum committed set:

- AMD Ryzen 7 5800X3D (`x86_64`)
- Intel Core Ultra 5 250K Plus (`x86_64`)
- Apple M1 Pro or M5 Max (`aarch64`)
- Snapdragon X2 Elite Extreme (`aarch64`, zero frequency samples)
- Google Tensor G5 result `64629` (`aarch64`, Android/device fields)
- NVIDIA DGX Spark result `58949` (`aarch64`; CPU metrics say only `ARM ARMv8`,
  while system/model metrics identify NVIDIA)
- SiFive HiFive Premier P550 result `4469` (`riscv`, zero frequency samples and
  an empty metric `20000`)

Both Apple captures are useful only if their heterogeneous core layouts or
frequency data exercise meaningfully different parser branches; otherwise keep
one to avoid redundant fixture bulk.

## Staged implementation

### Continuation handoff

Start a new implementation context by reading `docs/architecture.md`, then these
files in order:

1. `src/geekbench/resultPayload.ts` — normalized `ResultMetadata` contract and
   source provenance.
2. `src/cache/ResultsCache.ts` — version-2 `CachedResultContext`, lazy migration,
   and canonical links.
3. `src/geekbench/processorLinks.ts` — explicit-link validation and precedence.
4. `src/content/singleResultPage.ts` and `comparisonPage.ts` — current loading
   and DOM ownership boundaries.
5. `src/geekbench/__fixtures__/manifest.ts` — why each full fixture exists.

Important current boundary: both page adapters retain full result contexts and
derive the processor-identity view model and existing instruction annotations
from the same cached/fetched context. The renderer performs no fetching, and no
feature-specific payload request was introduced.

The approved presentation is preserved in `src/content/processorContextUi.ts`.
It accepts `ProcessorContextViewModel` data and performs no fetching, payload
parsing, catalogue matching, or fallback guessing. It is intentionally detached
from the page adapters until a real view-model builder exists. Do not replace or
redesign it while doing the plumbing. `src/content/addedRowMarker.ts` owns the
small dot and tooltip used to identify rows added by GeekLens.

The popup contains the final settings grouping and ordering. Controls
appear in page order: reference averages, processor identity, topology/scaling,
frequency, memory, then ISA. All processor-context controls now have real data
paths and default on.

Next handoff:

1. Manually exercise representative single and comparison pages in unpacked
   Chrome and Firefox builds as required by `AGENTS.md`.
2. Add Mac score references only after obtaining a capture whose CPU-score copy
   unambiguously identifies Geekbench 7; the current Mac page says Geekbench 6.
3. Refresh the bundled processor chart through the maintainer generator when a
   reviewed new snapshot is available.

### Stage 3 completion and next handoff

Stage 3 is covered by table-driven view-model tests for AMD, Intel, Apple,
NVIDIA's generic CPU-name case, RISC-V unknown vendor, and missing metadata.
DOM integration tests cover native single/comparison processor cells,
primary-before-baseline order, a missing comparison side, duplicate guards, and
the disabled setting. Settings tests cover the newly enabled identity control
while continuing to force every unwired control off.

Automated validation completed with formatting, lint, 118 unit/DOM tests,
TypeScript/Svelte checks, and Chrome MV3 and Firefox MV2 builds. The build warned
only that offline schema validation could not reach `json.schemastore.org`.
Manual unpacked-extension checks against live authenticated Geekbench results
remain outstanding because no live browser/session was available here.

The stage-7 identity foundation adds six resolver tests; the complete automated
suite now contains 124 passing tests. `scripts/generateProcessorCatalogue.ts`
and `scripts/generateMacCatalogue.ts` regenerate the processor and Mac snapshots
from maintainer captures. Reviewed payload aliases and explicitly observed
processor/Mac link relationships remain in `processorCatalogue.ts` so generation
does not silently widen matching rules.

Stages 4–5 add display-model, DOM, provenance, unavailable-data, and shared-scale
coverage; the complete automated suite now contains 133 passing tests. Manual
unpacked-extension checks remain outstanding.

Next handoff: implement stage 6 topology and score scaling from cached totals,
clusters, and ST/MT scores. Preserve native topology text first, render clusters
without assigning P/E roles, call the derived value `MT scaling`, and enable its
default-on setting. Do not divide by cores/threads or describe it as efficiency.

Required tests by slice:

- Stage 3: table-driven view-model tests for AMD, Intel, Apple, NVIDIA's generic
  CPU-name fallback, RISC-V unknown vendor, and unknown/malformed metadata; DOM
  tests for the native processor cell on single/comparison pages, column order,
  one missing comparison side, duplicate guards, and the setting disabled.
- Stage 4: exact min/mean/max display-model tests, all-zero/missing suppression,
  graph geometry bounds, accessible tooltip text, single/comparison DOM
  placement, and the setting disabled. Quartiles may remain internal to graph
  geometry but are not user-facing tooltip content.
- Stage 5: DDR4/DDR5 and capacity-only view-model tests, provenance preservation,
  LPDDR/unified-memory non-computation, one-fact-per-line DOM output, provenance
  tooltip accessibility, and the setting disabled.
- Stage 6: scaling tests for normal/missing/zero/malformed scores, anonymous
  cluster rendering, native core/thread preservation, and comparison ordering.
- Stages 7–8: exact-path/alias/unmatched resolver tests, ambiguous-alias
  rejection, generation compatibility, unavailable-average presentation,
  signed absolute/percentage delta rounding, source-link behavior, and no
  runtime network request.
- Settings: legacy stored-setting migration, disabled-control defaults, dirty
  state/one-save behavior, universal color/tooltips behavior, and active-tab
  reload. DOM/UI slices still require manual Chrome and Firefox checks.

### Approved UI/UX contract

- Extend native Geekbench rows and columns. Do not reintroduce context strips,
  disclosures, standalone cards, or a GeekLens badge on every value.
- Processor cells contain a soft vendor token replacing the vendor prefix, the
  vendor-less processor name, a neutral architecture token, and an exact
  catalogue link when available. Catalogue/source links open in a new tab.
- Comparison pages use separate native `Topology & scaling` and `Frequency`
  rows so both processor columns align. Single pages reuse the native Topology
  row and add Frequency immediately below it. Native processor/core/thread text
  appears first, anonymous clusters second, and `MT scaling` third.
- Frequency shows `min–max GHz · mean` above the compact distribution. Its
  hover/focus tooltip shows only minimum, mean, and maximum, one per line.
- Memory replaces the native value with one fact per line. `REPORTED`,
  `COMPUTED`, and `PUBLISHED` use soft tokens and immediate accessible
  hover/focus tooltips. Payload and catalogue provenance must never be merged.
- Reference comparisons appear beneath the large single-result scores, beside
  comparison scores, and in ST/MT performance headers. Visible copy is compact,
  for example `(+4.1% vs avg)`; the clickable hover/focus tooltip contains the
  result, average, signed absolute/percentage difference, generation, only
  source-supported inclusion information, and “Click to open source.” Use
  `(avg unavailable)` with a neutral explanatory tooltip when an exact,
  generation-compatible average is absent.
- Added rows use a small dot with the common tooltip “This row was added by the
  GeekLens extension.” This includes injected Instruction Sets rows; do not mark
  a native Geekbench 6 row.
- Vendor, architecture, provenance, and instruction badges share soft
  rectangular geometry and restrained semantic colors. Badge colors and all
  GeekLens tooltips are universal preferences.

Proposed settings shape (names may be adjusted once, before release):

- `showProcessorSummary`: default on; vendor/ISA/name only.
- `showFrequencyDistribution`: default on.
- `showMemoryDetails`: default on once implemented.
- `showTopologyScaling`: default on once implemented.
- `showReferenceComparison`: default on once implemented.

Additive settings remain backward-compatible because `loadSettings` merges
stored values over `defaultSettings`. Update `SettingsTab.svelte` and
`settings.test.ts` together. Controls do not need experimental labeling; their
supporting copy should describe the data shown. Functional Data shown controls
default on.

### 1. Typed payload parser and fixtures

- Replace the single-purpose extraction boundary with a typed, defensive
  `extractResultMetadata(payload, expectedGeneration)` function. Keep
  `extractInstructionSetsFromPayload` as a compatibility wrapper until callers
  migrate.
- Return only normalized fields GeekLens consumes: architecture family, raw and
  display CPU names, codename, instruction-set string, ST/MT scores, memory
  fields, topology, and cleaned frequency samples/statistics.
- For identities assembled from multiple metrics, keep field provenance and use
  explicit precedence rules. A lower-confidence fallback may fill a missing
  value, but must not overwrite a more specific processor field with a generic
  system or motherboard string.
- Add table-driven tests across the sanitized x86-64, AArch64, and RISC-V full
  fixtures plus small malformed objects.
- Document each metric ID beside the parser and add unknown/missing-value tests.
  Never infer vendor from instruction sets alone.

### 2. Fetching and cache migration

- Fetch and parse a result once, then share the metadata with all enabled
  features. Avoid one request per feature.
- Evolve IndexedDB from the `instructionSets`-only record to a versioned metadata
  record. Preserve or migrate existing cached instruction strings and include the
  Geekbench generation in identity as today.
- Decide whether metadata should have a freshness period. Payload data for a
  completed run is effectively immutable, while external reference scores are
  not.

### 3. ISA family and vendor classification

**Already available:** `ResultMetadata.architecture` and
`ResultMetadata.processor.vendor` are normalized, sourced, and covered across
the fixture manifest. Explicit catalogue links are cached separately. This stage
is now primarily a result-context/view-model and presentation task, not new
payload parsing.

- Map payload architecture strictly to `x86`, `ARM`, `RISC-V`, or `unknown`.
- Classify vendor from normalized CPU/display names using ordered, tested rules:
  Apple, AMD, Intel, Qualcomm, NVIDIA, Google, then unknown. Keep vendor and ISA
  separate types.
- Use a small set of explicitly ranked processor and system fields rather than
  metric `9` alone. The DGX Spark capture demonstrates why: its CPU name is only
  `ARM ARMv8`, while model fields identify NVIDIA. Retain which field supplied
  the classification so tests can make precedence visible.
- Do not derive RISC-V vendor from `eswin,eic770x`: that payload name identifies
  the SoC/compatible string while the result page identifies the system as a
  SiFive HiFive Premier P550. Architecture can still be known when vendor is not.
- Add aliases seen in real payloads, such as `AuthenticAMD`, `GenuineIntel`,
  `Snapdragon(R)`, and Qualcomm Oryon. Unknown should render neutrally or be
  omitted according to the eventual UI decision.
- Put vendor colors in one accessible theme map; badge color cannot be the only
  carrier of meaning. Check contrast in both extension themes/page contexts.

Implementation notes:

- Keep internal parser values (`x86`, `arm`, `risc-v`, `unknown`) separate from
  display labels (`x86`, `ARM`, `RISC-V`, `Unknown`).
- Render the processor display name as text in the badge/summary; color is
  supplementary. Suggested initial vendor palette families are Apple black,
  AMD red, Intel blue, NVIDIA green, Qualcomm a distinguishable darker red, and
  unknown neutral gray. Final tokens must pass contrast checks against the actual
  light/dark backgrounds; do not hard-code colors inside Svelte components.
- Google remains parser/test coverage but is not required for the initial
  desktop/laptop product catalogue. RISC-V architecture may display while vendor
  remains unknown.
- Prefer a dedicated processor-summary component and mount helper. Do not reuse
  instruction-badge CSS classes or insert parsing logic into the component.
- On comparison pages, preserve Geekbench's primary-then-baseline column order.
  A missing context on one side must not suppress the other side.

Acceptance criteria:

- One GB7 payload supplies both existing instruction annotations and the new
  summary; no component performs a fetch.
- Single and comparison fixtures cover AMD, Intel, Apple, NVIDIA's generic CPU
  name fallback, RISC-V unknown vendor, and a missing-result side.
- Unknown architecture/vendor produces neutral text or an intentionally omitted
  vendor treatment, never a misleading guessed brand.
- `showProcessorSummary` can disable only the new summary without disabling
  existing workload instruction badges.

### 4. Frequency distribution (toggleable, default on)

**Already available:** `ResultMetadata.frequency` contains cleaned positive MHz
samples and min/Q1/median/mean/Q3/max. The parser uses the documented lower-index
empirical quantile `floor((n - 1) × p)` without interpolation. All-zero Qualcomm
and RISC-V series normalize to `null`.

- Add a settings flag only after the parser and cache are stable.
- Render on single-result pages first. Define how heterogeneous CPUs are
  represented: the payload provides one sample series, not an explicit mapping
  from samples to performance/efficiency core clusters.
- Show units and exact min/mean/max values in text or a tooltip so the graphic is
  not the only representation. Suppress the feature for all-zero/missing data.
- Extend to comparison pages only after column width and primary/baseline order
  are tested.

Implementation notes:

- Build a pure display model from cached statistics; components should not sort
  samples or recompute quartiles. Keep the raw samples cached for future use but
  do not put every sample into the DOM.
- The compact graphic should place min/max whiskers and a mean marker. Only draw
  a quartile box/median line if those values are part of the chosen visual; do
  not call a min/mean/max-only line a box plot.
- Use one linear MHz scale per result on both single and comparison pages. Local
  comparison scales keep narrow distributions readable when processor clocks
  differ substantially; print exact values so the ranges remain comparable.
- Do not interpret the series as per-core, sustained boost, or P/E-cluster data.
  It is an unlabeled series supplied by Geekbench.

Acceptance criteria:

- The 5800X3D fixture pins exact statistics and a usable visualization.
- Qualcomm and RISC-V fixtures render no empty/zero chart and show either nothing
  or a concise “not available” state according to the UI design.
- Keyboard/screen-reader users can obtain min, mean, and max with MHz units
  without interpreting geometry or color.
- Enabling the feature causes no payload or catalogue request.

### 5. Memory configuration and theoretical bandwidth (toggleable, default on)

**Already available:** payload memory capacity/type/clock/rate/channels and
conservative DDR4/DDR5 theoretical bandwidth are normalized in
`ResultMetadata.memory`. LPDDR and unified-memory bandwidth intentionally remain
`null` until an exact catalogue match supplies a sourced published value.

- Normalize memory capacity, technology/generation, clock, effective transfer
  rate, and channel/subchannel count from the observed metrics. Preserve raw
  values for debugging, but expose typed values only after unit-aware parsing.
- Prefer metric `87` for transfer rate when present instead of deriving MT/s by
  blindly doubling metric `75`. Validate that both values agree when both exist.
- Show capacity/type/rate/channels directly in single and comparison views. A
  compact comparison value such as `32 GB DDR5-6400, 4 × 32-bit subchannels` is
  more honest than presenting a bandwidth number without its assumptions.
- Calculate theoretical peak bandwidth only when transfer rate, channel count,
  and per-channel data width are all known:

  `GB/s = MT/s × channels × bits-per-channel ÷ 8 ÷ 1000`

  Do not assume every reported “channel” is 64-bit. The sampled DDR4 system
  reports two conventional 64-bit channels, while the DDR5 system reports four
  32-bit subchannels. Encode supported memory-generation rules explicitly and
  return unavailable for LPDDR, unified memory, unknown types, or ambiguous
  channel semantics until validated fixtures exist. Label the result
  **theoretical peak bandwidth**, not expected or measured bandwidth. Expected
  fixture results are approximately 57.6 GB/s for DDR4-3598 with two 64-bit
  channels and 102.4 GB/s for DDR5-6400 with four 32-bit subchannels.

- Capacity-only data is still useful and should not be discarded when the other
  memory metrics are absent. Apple and Qualcomm memory specifications can come
  from the checked-in processor/device catalogue when an exact SKU or device
  configuration is matched; they must not be invented from payload capacity.
- Keep payload-reported and catalogue-sourced memory data distinct in the data
  model and UI. A catalogue value needs a source URL, retrieval date, match key,
  and qualifier such as `published`, `maximum`, or `configured`. Never imply that
  a published theoretical bandwidth was measured during the submitted run.
- Seed tests with first-party specification examples already matching fixtures:
  - Apple M1 Pro: up to 200 GB/s unified-memory bandwidth.
  - Apple M4 Pro: 273 GB/s unified-memory bandwidth.
  - Apple M5 Max, 18-core CPU and 40-core GPU configuration: up to 614 GB/s.
  - Snapdragon X2 Elite Extreme X2E-94-100: LPDDR5x-9523, 192-bit bus,
    228 GB/s published bandwidth.
    Treat `up to` literally. Do not assign a maximum-family value to a cut-down or
    ambiguous configuration without an exact match.

Implementation notes:

- Introduce a view model that keeps `payload` and `catalogue` memory facts in
  separate fields. Resolution may choose which value to display, but must retain
  provenance and never overwrite payload observations in the cache.
- Recommended display order is capacity, technology/rate, channel topology, then
  bandwidth. Omit missing segments instead of producing punctuation-heavy
  placeholders.
- Label computed desktop DDR values “theoretical peak.” Label first-party Apple
  or Qualcomm values “published” or “up to” as recorded by the catalogue entry.
  Neither is a Geekbench memory benchmark result.
- Do not infer Apple bandwidth from capacity or chip family alone. Match the
  required CPU/GPU/core configuration. Likewise normalize `X2E94100` to the
  exact Qualcomm SKU alias only through a tested catalogue rule.
- Comparison views must expose why two bandwidth values differ in provenance;
  avoid a bare number that visually equates computed and vendor-published data.

Acceptance criteria:

- DDR4 and DDR5 fixtures retain the pinned 57.568 and 102.4 GB/s calculations.
- LPDDR5X synthetic coverage cannot accidentally enter the desktop DDR5
  32-bit-subchannel rule.
- Capacity-only Apple results remain useful without fabricated speed/channel
  values; exact catalogue matches can add published bandwidth with a source.
- Missing or ambiguous channel semantics yields no bandwidth number.

### 6. Topology and multi-core scaling (candidate comparison feature)

**Already available:** physical cores, logical threads, and positive core
clusters are normalized. Zero-core placeholders are discarded. Google exercises
three frequency-labelled clusters; Raptor Lake and Arrow Lake exercise two
unlabelled-role clusters. The parser deliberately does not name P/E roles.

- Normalize total cores/threads and cluster counts where internally consistent.
  Retain unknown cluster roles; do not label clusters P/E solely from ordering.
- Consider displaying `MT score ÷ ST score` as a scaling factor beside the core
  topology. It is an easily comparable property of the submitted run and does
  not require external reference data. If shown, call it a score scaling ratio,
  not parallel efficiency; Geekbench's ST and MT workload sets are not identical.
- A derived per-core/thread “efficiency” percentage is likely to overstate
  precision on heterogeneous CPUs and should remain out of scope unless its
  interpretation is clearly designed and tested.

Implementation notes:

- Compute the score scaling ratio only when both scores are finite and positive:
  `multiCoreScore / singleCoreScore`. Keep the unrounded value in the view model;
  two decimal places is a reasonable initial display precision.
- Do not divide the ratio by cores or threads, and do not call it utilization,
  efficiency, or speedup of identical work. GB7 ST and MT suites differ.
- Present total cores/threads before raw cluster counts. Cluster order alone does
  not establish performance/efficiency roles.
- Treat topology inconsistencies as partial metadata: totals may render while
  unusable clusters remain omitted.

Acceptance criteria:

- Ratio tests cover normal, missing, zero, and malformed score inputs.
- Raptor Lake displays two anonymous clusters; Zen 2 and N305 do not display
  Geekbench's `0 Cores` placeholder.
- Comparison layout keeps primary/baseline association unambiguous and does not
  imply normalized per-core efficiency.

**Presentation revised 2026-08-01.** The combined "Topology & scaling" row put
two unrelated facts in one cell and restated Geekbench's own topology string. It
was split:

- The topology row keeps only the socket count parsed back out of the native
  string, plus payload totals and a proportional cluster bar with a text legend.
  The bar is decorative (`aria-hidden`); the legend carries the same facts.
- Clusters are reordered fastest-first **only** when every cluster reports a
  maximum frequency. Payload order is vendor-defined in opposite directions —
  Apple, Intel, and Snapdragon list fastest first, Tensor lists slowest first —
  and reported maxima are the only evidence that justifies reordering. Cluster
  size does not imply role: the 13900K's larger cluster is its E-cores.
- The score ratio moved beside the multi-core score on both page types, where the
  values it divides actually appear.
- The single `showTopologyScaling` setting became `showCoreTopology` and
  `showMultiCoreScaling`. No migration: nothing was released with the old key.

### 7. Processor identity and reference catalogue (toggleable)

**Already available:** result contexts cache explicit processor and Mac paths.
`processorLinks.ts` accepts only same-origin canonical paths, maps comparison
columns, and lets newly observed explicit links replace stale cached ones. The
bundled identity catalogue and resolver cover exact chart paths/names, reviewed
payload aliases, the observed Apple M4/Mac mini paths, ambiguity rejection, and
explicit unmatched reasons. Hardware specifications and score references are
not yet represented.

- First inspect result-page links and stable identifiers. Prefer an explicit
  Geekbench processor/Mac link when present.
- Cover both observed Mac page shapes: the M4 Mac mini capture links its Model
  value to `/macs/mac-mini-2024-10c-cpu` and its CPU Name to
  `/processors/apple-m4`; the M5 Max capture renders both as plain text. Missing
  links are an expected Geekbench catalogue-coverage state, not a parser error.
- Otherwise normalize the payload model name and match it against a checked-in
  catalogue using explicit aliases. Do not silently fuzzy-match ambiguous names;
  surface “not matched” and add examples here for later rules.
- Treat processor pages and Mac model pages as different entity types. A Mac page
  can distinguish chassis, CPU/GPU/core configuration that `Apple M4 Pro` alone
  cannot.
- Store reference entries as source data with: canonical key, aliases, page URL,
  Geekbench generation, ST score, MT score, sample count when available,
  retrieved date, and optional device/configuration fields. Hardware
  specifications belong in the same matched catalogue layer but in a separate
  provenance block from Geekbench score averages; useful fields include memory
  technology, transfer rate, bus width, published bandwidth, capacity limits,
  and the exact CPU/GPU/core configuration to which they apply.

Recommended resolver precedence:

1. Exact cached Mac path, when the requested fact is device/configuration
   specific.
2. Exact cached processor path.
3. Exact normalized alias plus required configuration constraints.
4. Explicit unmatched result with a reason; never silent fuzzy matching.

Suggested checked-in schema (adapt names to existing style, not semantics):

```ts
interface CatalogueSource {
  url: string;
  retrievedOn: string; // YYYY-MM-DD
  publisher: 'Geekbench' | 'Apple' | 'AMD' | 'Intel' | 'Qualcomm' | 'NVIDIA';
  note?: string;
}

interface HardwareSpecification {
  memoryType?: string;
  transferRateMTs?: number;
  busWidthBits?: number;
  bandwidthGBs?: number;
  bandwidthQualifier?: 'published' | 'up-to';
  maxCapacityBytes?: number;
  cpuCores?: number;
  gpuCores?: number;
  source: CatalogueSource;
}

interface GeekbenchScoreReference {
  generation: 6 | 7;
  singleCore: number;
  multiCore: number;
  sampleCount?: number;
  source: CatalogueSource;
}

interface ProcessorCatalogueEntry {
  key: string;
  displayName: string;
  vendor: ProcessorVendor;
  architecture: ProcessorArchitecture;
  processorPaths: readonly string[];
  macPaths?: readonly string[];
  aliases: readonly string[];
  requiredConfiguration?: {
    physicalCores?: number;
    gpuCores?: number;
    modelIdentifier?: string;
  };
  hardware?: HardwareSpecification;
  scoreReferences?: readonly GeekbenchScoreReference[];
}
```

Catalogue rules:

- Keep data in a dedicated checked-in module/data file, not scattered through
  matching code or Svelte components. Prefer a maintainer-only generator for
  larger snapshots, with reviewed diffs.
- Hardware specifications and Geekbench score aggregates are distinct provenance
  blocks even when attached to the same identity entry.
- Do not fetch catalogue or score pages in an end user's browser. Runtime uses
  the bundled snapshot only.
- The broad processor chart is a discovery source, not proof of completeness.
  Preserve explicitly observed links absent from that chart.
- Processor and Mac/device matches can coexist. A CPU-family match must not
  silently inherit a chassis/configuration-specific bandwidth or score.
- Geekbench score references are generation-specific. Do not compare current GB7
  payload scores to a page that explicitly describes GB6 aggregates.

Recommended first catalogue slice:

- Exact linked fixture identities: Apple M4/Mac mini and the linked AMD/Intel
  examples already captured by result pages.
- Exact hardware-spec entries already validated below: M1 Pro, M4 Pro, the
  18-core CPU/40-core GPU M5 Max, and Snapdragon X2E-94-100.
- A deliberate unmatched M5 page/link case and DGX Spark's generic CPU-name case
  to pin fallback behavior.
- Keep Google/mobile out of initial catalogue completeness requirements.

Acceptance criteria:

- Resolver output includes match kind (`mac-path`, `processor-path`, `alias`, or
  `unmatched`), catalogue key when matched, and the evidence used.
- Explicit links beat aliases in tests, and ambiguous aliases do not match.
- The bundled catalogue records source URL/retrieval date for every external
  hardware or score fact.
- No runtime network request is introduced; the existing one-payload-per-result
  behavior remains unchanged.
- Missing M5 links are a tested unmatched/alias path, not an exception.

### 8. Score deltas and UI design

- Compute signed absolute and percentage deltas for both ST and MT with tests for
  missing/zero reference values and rounding.
- Say “Geekbench Browser average” rather than “official score”; the pages describe
  aggregates of user-submitted results, and the values change over time.
- Design single-result and comparison layouts after representative data is
  available. Keep processor/vendor badges separate from workload instruction
  badges to avoid confusing CPU identity with acceleration used by a workload.

### 9. Asymmetric L3 on dual-die X3D parts (deferred, not scheduled)

**Raised:** 2026-08-01, while reworking stage 6's presentation. Deliberately not
implemented with that change.

Geekbench reports L3 as a size/count pair in metrics `23`/`24` and derives the
count by replicating the largest cache it observes across dies. On a Ryzen X3D
part that pairs one V-Cache die with a standard die, the pair is wrong, not
merely incomplete. Measured against the bundled fixtures:

| Fixture | Chip                    | Reported L3       | Actual               |
| ------- | ----------------------- | ----------------- | -------------------- |
| `1248`  | Ryzen 7 5800X3D (1 CCD) | `96.0 MB × 1`     | 96 MB                |
| `40339` | Ryzen 9 3950X (4 CCX)   | `16.0 MB × 4`     | 64 MB                |
| `61473` | Core i9-13900K          | `36.0 MB × 1`     | 36 MB                |
| `64509` | **Ryzen 9 9950X3D**     | **`96.0 MB × 2`** | **96 + 32 = 128 MB** |

The 9950X3D row states 192 MB of L3 on a 128 MB processor, and the native
Geekbench page renders that figure today. This is the same class of defect as the
soldered-LPDDR rate handled in stage 5: a payload value that contradicts itself
and cannot be repaired from the payload alone.

**Do not draw dies in the topology bar.** The affected parts report a _single_
cluster (`64509` reports `16 Cores`, one cluster), and the payload carries no
core-to-die mapping, so any segment split would be fabricated. It would also
overload the bar, whose segments mean core clusters everywhere else. Cache
belongs in its own row.

Two options, smallest first:

1. **Flag only.** Detect the contradiction generically — an `X3D` processor name
   reporting `count > 1` — and mark the value unverified with a `reported`
   provenance note, without asserting a corrected total. Requires parsing metrics
   `17`–`24`; no catalogue work.
2. **Published fact.** Add the true per-die split as a `published` catalogue fact
   with a source link, rendered through the existing memory provenance
   vocabulary, e.g. `128 MB · 96 MB + 32 MB across 2 dies`. The affected SKU list
   is closed and small: 7900X3D, 7950X3D, 9900X3D, 9950X3D. Single-die X3D parts
   (5800X3D, 7800X3D, 9800X3D) are symmetric and already report correctly.

Either option requires cache parsing, which the payload module does not do at
all today. Before shipping a generic cache row, settle the ARM caveat recorded
under _Other payload candidates_: sampled ARM payloads report zero or per-cluster
cache values that do not describe the whole CPU.

### 10. Published core-type composition

**Raised:** 2026-08-01. The topology row states cluster sizes but never says what
kind of cores a cluster holds, which is the fact readers actually want on a
hybrid part.

**Core types cannot be inferred from the payload.** The per-cluster `label`
metric is only ever a size restatement — `6 Cores`, or `2 Cores @ 2.25 GHz` on
the parts that also report frequencies. No vendor ships a role name. Cluster size
does not substitute for one: the 13900K's _larger_ cluster (16) is its E-cores,
so "largest cluster is the performance cluster" is wrong on the most common
hybrid desktop part. Cluster order does not substitute either, for the reasons
recorded in stage 6. Where per-cluster maxima exist the fastest-first sort
already conveys the ordering without naming anything.

So a role name can only be a `published` catalogue fact, carried on
`HardwareSpecification` beside `memoryType`/`bandwidthGBs` with the same
`CatalogueSource`, and rendered through the memory provenance badge and tooltip.

**Record the vendor's own wording verbatim; do not normalize to a big/little or
performance/efficiency taxonomy.** AMD is the case that makes this a correctness
requirement rather than a style preference: Zen 5c is not an efficiency core. It
is the same microarchitecture at the same IPC with the same ISA, differing in
peak clock and L3 per CCX. Filing it under "efficiency" would state something
false. Intel's Low Power Efficient-cores are likewise not interchangeable with
its Efficient-cores, and Apple uses neither vocabulary. One source-worded string
per entry avoids designing a taxonomy at all:

- `4 Performance-cores + 8 Efficient-cores` (Intel ARK)
- `4 Zen 5 + 8 Zen 5c` (AMD)
- `10 performance cores + 4 efficiency cores` (Apple)

**AMD is also the case that needs this most.** Every bundled AMD fixture reports
either a single cluster (`1248`, `64509`, `18873252`, `62238`) or the `0 Cores`
placeholder that gets dropped (`40339`, `62440`), so Strix Point and Hawk Point
parts render totals with no bar at all. A published composition line is the only
route to showing `4 Zen 5 + 8 Zen 5c`. A live Strix Point result should confirm
the cluster metrics are empty there too before the field is designed; result
`62400` was cited as an example and is not among the bundled fixtures.

Scope for the initial slice:

- One optional string field, one rendered line under the bar, reusing the
  existing published-provenance rendering. No new UI machinery.
- Seed entries opportunistically for SKUs with a bundled fixture or a captured
  result; do not attempt coverage across all 264 catalogue processors.
- Degrades to today's output whenever the field is absent, so partial coverage is
  a valid shipping state.

**Implemented 2026-08-01**, with one deviation from the sketch above:
`coreComposition` is its own optional field on `ProcessorCatalogueEntry` rather
than a field on `HardwareSpecification`. That interface requires `bandwidthGBs`,
so hanging core types off it would force a fabricated memory figure onto every
Intel and AMD part. Compositions are overlaid by entry key from
`REVIEWED_CORE_COMPOSITIONS`, mirroring `REVIEWED_HARDWARE`, and applied once
over the assembled catalogue so generated, Mac, and reviewed identities are all
covered by one mechanism. The view model exposes the fact in the same shape as a
memory fact, and the renderer shares one `provenanceBadge` helper with the memory
rows, so both carry identical badge, tooltip, link, and accessible-label
behaviour.

Nine entries are seeded. The five Apple ones reuse sources already reviewed for
this catalogue, each of which states the CPU core split alongside the memory
figures it was originally captured for: `apple-m1-pro-10c`, `apple-m4-pro-12c`,
`apple-m4-pro-14c`, `apple-m4-max-14c`, `apple-m4-max-16c`. Fixtures `1262` and
`64820` cover the first two end to end; M4 Pro's published 8 + 4 split agrees
with the clusters the same payload reports.

The four x86 entries — `amd-ryzen-ai-9-hx-370` (4 Zen 5 + 8 Zen 5c),
`amd-ryzen-ai-9-365` (6 Zen 5 + 4 Zen 5c), `intel-core-i9-13900k` and
`intel-core-ultra-9-285k` (8 Performance-cores + 16 Efficient-cores each) — cite
the Zen 5, Raptor Lake, and Arrow Lake tables, retrieved 2026-08-01. That is the
weaker publisher tier, named in the provenance tooltip, and it was chosen over a
first-party citation for two separate reasons: AMD markets Strix Point as a flat
core count and does not publish the Zen 5 / Zen 5c division at all, and Intel ARK
does list P-core and E-core counts as separate fields but serves 403 to automated
retrieval. A page that cannot be retrieved must not be cited as though it had
been. Upgrading the two Intel entries to ARK is a worthwhile follow-up for anyone
retrieving it by hand.

Fixture `61473` covers the 13900K end to end and is the sharpest demonstration of
why the split cannot be inferred: its two reported clusters are 8 and 16, and the
larger one is the Efficient-core group.

**Correction during implementation:** an earlier draft of this section recorded
the Ryzen AI 9 365 as 4 Zen 5 + 6 Zen 5c. It is 6 Zen 5 + 4 Zen 5c, 10 cores and
20 threads. The error was caught by retrieving the source rather than trusting
the recalled figure, which is the entire argument for citing one.

**Follow-up option, explicitly out of this slice: labelling individual bar
segments.** The rule would be a join of catalogue core-type counts against
payload cluster sizes, labelling only on an exact and unambiguous multiset match
— the 13900K's `[8, 16]` against `8 P + 16 E` matches by size, while any chip
reporting two clusters of equal size is ambiguous and must go unlabelled, as must
any mismatch between the two sources. That is rigorous rather than fabricated,
but it needs its own matching rules and test matrix, and it only helps parts that
already draw a bar — which excludes the AMD parts that motivated the request.
Revisit once the published line exists and the catalogue field has real coverage.

## Reference-data recommendation

Ship a curated, versioned snapshot rather than fetching processor/Mac pages for
every visitor. This avoids extra browsing traffic, cross-page parsing at runtime,
latency, privacy concerns, and a second failure mode in the content script.
However, do not manually “memorize” bare scores in TypeScript. Keep a generated
data file plus provenance and retrieval date, and provide a maintenance script
that fetches only on maintainer demand. Review diffs before committing updates.

The snapshot must be generation-specific. The processor chart captured on
2026-07-31 explicitly describes Geekbench 7 user-submitted results and a minimum
of five unique results per included processor. The generated score snapshot
retains that generation, retrieval date, minimum-sample statement, and the
chart's mutable-average provenance.

### Updating the bundled catalogue

Catalogue refreshes are maintainer-only and never run in the extension. First
download the complete Geekbench pages as HTML into `temp/`, preserving their
tables, then run the generators from the repository root:

```sh
bun scripts/generateProcessorCatalogue.ts "temp/Processor Benchmarks - Geekbench.html" src/catalogue/processorCatalogue.generated.ts
bun scripts/generateMacCatalogue.ts "temp/Mac mini (2024) Benchmarks - Geekbench.html" src/catalogue/macCatalogue.generated.ts
bun run format
```

The processor generator replaces the checked-in AMD, Intel, and Qualcomm
identity snapshot and its Geekbench 7 single-/multi-core averages. The Mac
generator replaces Mac identities and configuration constraints only. It does
not import scores while the captured Mac page describes its CPU averages as
Geekbench 6 despite mixed Geekbench 7 navigation copy.

After regeneration:

1. Update the matching source capture's `retrievedOn` value in
   `src/catalogue/processorCatalogue.ts` and confirm the page still states the
   same Geekbench generation and minimum-result rule.
2. Review the generated diff for removed entries, renamed paths, duplicates,
   implausible scores, and unexpected table-layout changes. A successful script
   run does not prove that Geekbench kept the same external HTML contract.
3. Keep reviewed aliases, hardware specifications, system-specific corrections,
   and their source metadata in `processorCatalogue.ts`; the generators do not
   infer or overwrite them.
4. Run the complete validation commands from `AGENTS.md`, including both browser
   builds, before committing the refreshed snapshot.

Use the [Geekbench Processor Benchmark Chart](https://browser.geekbench.com/processor-benchmarks)
as the broadest known discovery list. It is not a complete processor registry,
so catalogue generation must also retain explicitly observed processor and Mac
links that are absent from that chart. Individual processor or Mac pages remain
the source of the canonical display name, configuration, ST/MT averages, and
other available metadata.

## Open questions before UI work

1. Should vendor/ISA badges be enabled by default while frequency and reference
   comparisons remain experimental and off?
2. Should a missing vendor show an `Unknown` badge or no processor badge?
3. For Apple, should matching target the CPU family, exact Mac configuration, or
   show both when an explicit Mac link exists?
4. What refresh cadence and review process should reference snapshots use?
5. Does Geekbench expose a stable processor/Mac identifier beyond the observed
   links? The linked-M4 and unlinked-M5 captures establish both DOM shapes, but
   more arrivals are needed before treating missing links as an M5-generation
   rule rather than incomplete catalogue coverage.
6. Should memory configuration be enabled with the processor badge, or remain a
   separate experimental setting because most non-x86 captures expose capacity
   only?

## Other payload candidates

These fields may become useful, but should not be surfaced until their meaning
is confirmed across platforms:

- Cache sizes/counts in metrics `17`–`24`. The sampled ARM payloads frequently
  report zero or per-cluster values that do not describe the whole CPU, so a
  generic cache comparison would currently mislead. On dual-die X3D parts the
  reported L3 pair is additionally wrong rather than absent; see stage 9.
- GPU name in metric `34`. This could support future system-context badges but is
  unrelated to CPU benchmark interpretation and should not expand this feature.
- Run validity, Geekbench version/build, upload date, and runtime are safe to
  parse for provenance/debugging. Version/build should gate external-reference
  comparisons even if it is not normally rendered.
- Metrics `66`–`69` resemble temperature and frequency extrema on sampled x86
  systems, but are zero/missing elsewhere and have no confirmed schema. Do not
  label or expose them based only on their values.
- Per-workload scores and runtimes in `sections` could later identify which
  workloads drive a result/reference delta. That is substantially more UI and
  statistical scope than the initial processor context.

## Validation per stage

Run the normal format, lint, unit, Svelte check, and both browser builds. DOM/UI
stages also require manual Chrome and Firefox checks on a single result and a
comparison page, covering x86, ARM, missing frequency data, an explicit processor
link, an explicit Mac link, and an unmatched processor.

## Hardware specification sources validated so far

- [Apple: M1 Pro and M1 Max MacBook Pro](https://www.apple.com/newsroom/2021/10/apple-unveils-game-changing-macbook-pro/)
- [AnandTech: M1 Pro and M1 Max SoC analysis](https://www.anandtech.com/show/17024/apple-m1-max-performance-review)
- [Apple: M4 Mac mini and M4 Pro](https://www.apple.com/uk/newsroom/2024/10/apples-new-mac-mini-is-more-mighty-more-mini-and-built-for-apple-intelligence/)
- [Apple: M5 Pro and M5 Max](https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/)
- [Qualcomm: Snapdragon X2 Elite product brief](https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-X2-Elite-Product-Brief.pdf)
- [Lenovo: ThinkPad X13 Gen 3 AMD specifications](https://psref.lenovo.com/syspool/Sys/PDF/ThinkPad/ThinkPad_X13_Gen_3_AMD/ThinkPad_X13_Gen_3_AMD_Spec.html)
