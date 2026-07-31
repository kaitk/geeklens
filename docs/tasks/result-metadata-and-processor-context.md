# Result metadata and processor context

**Status:** stage 1 implemented; later stages remain planned and should be split
into independently reviewable changes.
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

### 4. Frequency distribution (experimental, default off)

- Add a settings flag only after the parser and cache are stable.
- Render on single-result pages first. Define how heterogeneous CPUs are
  represented: the payload provides one sample series, not an explicit mapping
  from samples to performance/efficiency core clusters.
- Show units and exact min/mean/max values in text or a tooltip so the graphic is
  not the only representation. Suppress the feature for all-zero/missing data.
- Extend to comparison pages only after column width and primary/baseline order
  are tested.

### 5. Memory configuration and theoretical bandwidth (experimental, default off)

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

### 6. Topology and multi-core scaling (candidate comparison feature)

- Normalize total cores/threads and cluster counts where internally consistent.
  Retain unknown cluster roles; do not label clusters P/E solely from ordering.
- Consider displaying `MT score ÷ ST score` as a scaling factor beside the core
  topology. It is an easily comparable property of the submitted run and does
  not require external reference data. If shown, call it a score scaling ratio,
  not parallel efficiency; Geekbench's ST and MT workload sets are not identical.
- A derived per-core/thread “efficiency” percentage is likely to overstate
  precision on heterogeneous CPUs and should remain out of scope unless its
  interpretation is clearly designed and tested.

### 7. Processor identity and reference catalogue (experimental, default off)

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

### 8. Score deltas and UI design

- Compute signed absolute and percentage deltas for both ST and MT with tests for
  missing/zero reference values and rounding.
- Say “Geekbench Browser average” rather than “official score”; the pages describe
  aggregates of user-submitted results, and the values change over time.
- Design single-result and comparison layouts after representative data is
  available. Keep processor/vendor badges separate from workload instruction
  badges to avoid confusing CPU identity with acceleration used by a workload.

## Reference-data recommendation

Ship a curated, versioned snapshot rather than fetching processor/Mac pages for
every visitor. This avoids extra browsing traffic, cross-page parsing at runtime,
latency, privacy concerns, and a second failure mode in the content script.
However, do not manually “memorize” bare scores in TypeScript. Keep a generated
data file plus provenance and retrieval date, and provide a maintenance script
that fetches only on maintainer demand. Review diffs before committing updates.

The snapshot must be generation-specific. Current processor pages describe their
tables as Geekbench 6 data even while the Browser navigation promotes Geekbench
7, so comparing a Geekbench 7 payload against those numbers would be invalid
unless Geekbench clarifies or updates the source.

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
  generic cache comparison would currently mislead.
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
- [Apple: M4 Mac mini and M4 Pro](https://www.apple.com/uk/newsroom/2024/10/apples-new-mac-mini-is-more-mighty-more-mini-and-built-for-apple-intelligence/)
- [Apple: M5 Pro and M5 Max](https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/)
- [Qualcomm: Snapdragon X2 Elite product brief](https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-X2-Elite-Product-Brief.pdf)
