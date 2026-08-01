# Result metadata and processor context

GeekLens supplements Geekbench 7 result pages with processor context parsed
from the authenticated `.gb6` payload. Geekbench 6 remains supported for its
existing instruction annotations and shares metadata presentation only where
that does not require generation-specific complexity.

Geekbench payload metric IDs, result-page links, processor pages, and catalogue
tables are undocumented external interfaces. Keep their assumptions explicit,
parse them defensively, and prefer missing output to a plausible but unsupported
hardware claim.

## Runtime boundary

`src/geekbench/resultPayload.ts` converts a payload into typed, normalized
metadata. Page adapters cache that metadata with the compatibility instruction
string and any explicit processor/Mac links, then pass the cached context through
`src/content/processorContextViewModel.ts`. The renderer in
`src/content/processorContextUi.ts` consumes only that view model; it does not
parse pages, fetch payloads, or resolve identities.

The current Geekbench 7 presentation includes:

- processor name, vendor, ISA family, and an exact catalogue link;
- frequency min/mean/max and a compact distribution;
- memory capacity/configuration and conservatively derived bandwidth;
- core/thread totals, anonymous cluster sizes, published core composition, and
  the submitted run's multi-core/single-core score ratio; and
- generation-matched Geekbench Browser average scores and signed deltas.

All processor-context controls are independently toggleable and default on.
Missing or malformed data removes the affected single-result detail; comparison
pages preserve the native Geekbench value or show that the affected side is
unavailable. Existing ISA annotations continue to use the instruction string
from the same cached context.

## Payload rules

The observed fields currently used are:

- `platform.architecture` for ISA family, with an unknown fallback;
- metrics `8` and `9` for raw/display processor names and metric `10` for an
  optional codename;
- metrics `12` and `13` for logical/core totals and metrics `45`–`52` for
  clusters;
- metric `29` for memory capacity and metrics `30`, `75`, `76`, and `87` for
  desktop memory configuration;
- `processor_frequency.frequencies` for frequency samples;
- `score` and `multicore_score` for submitted scores; and
- metric `20000` for the compatibility instruction-set string.

Frequency parsing ignores non-finite and non-positive samples and treats an
empty set as unavailable. Sample count is variable. Cluster parsing rejects
zero-core placeholders and never infers performance/efficiency roles from
cluster order or size.

Payload memory type and rate can contradict the physical system. A reported DDR
generation below that generation's JEDEC minimum is rendered as
`<generation>-class (rate unverified)` and is excluded from bandwidth
calculation. Do not multiply a suspicious rate to reconstruct an assumed LPDDR
rate. Channel topology may still support a bus-width statement when the rate is
unusable.

DDR4/DDR5 theoretical bandwidth is calculated only when payload fields are
internally consistent. LPDDR and unified-memory facts require an exact reviewed
catalogue/system match. Keep conflicting payload values in provenance text when
a published correction is shown. Four 32-bit subchannels are not, by themselves,
evidence of LPDDR because desktop DDR5 exposes the same topology.

## Processor catalogue and identity

The extension bundles a curated catalogue; it never fetches processor, Mac, or
score-reference pages at runtime. Generated snapshots provide broad Geekbench
processor/Mac identities, while reviewed overlays provide aliases, hardware
facts, system-specific corrections, and published core compositions.

Identity precedence is exact Mac path, exact processor path, then reviewed
alias. Configuration constraints must match, ambiguous aliases remain
unmatched, and fuzzy matching is not allowed. Processor-family and device
matches may coexist, but a family match must not inherit chassis-specific facts.
Only an exact, generation-compatible identity exposes catalogue links or score
references.

Hardware facts and Geekbench score averages are separate provenance blocks even
when they belong to one identity. Every external fact records its source URL,
publisher, and retrieval date. Core-type composition is also published data:
retain the source's terminology (for example, Zen 5/Zen 5c or Intel
Performance-/Efficient-cores) instead of normalizing vendors into a fabricated
taxonomy. Do not assign those names to individual topology segments unless a
future exact and unambiguous join is designed and tested.

Geekbench score references are generation-specific mutable averages of
user-submitted results, not official processor scores. Mac scores are omitted
when the source page's Geekbench generation is ambiguous.

## Fixtures and provenance

Payload fixtures under `src/geekbench/__fixtures__/` are structurally complete
and retain workload and frequency data. Before committing a capture, replace
UUIDs, hostnames (including metric `122`), profile links, and other user
identifiers with stable placeholders. The fixture manifest records the public
result and processor, but a result ID is never processor identity.

Fixture coverage should span x86-64, AArch64, and RISC-V; zero-frequency data;
heterogeneous and placeholder cluster shapes; linked and unlinked processor/Mac
HTML; and both Geekbench generations where shared parsing is claimed.

## Updating the bundled catalogue

Catalogue refreshes are maintainer-only. Download complete source pages as HTML
outside the extension, preserve their tables, then run from the repository root:

```sh
bun scripts/generateProcessorCatalogue.ts "temp/Processor Benchmarks - Geekbench.html" src/catalogue/processorCatalogue.generated.ts
bun scripts/generateMacCatalogue.ts "temp/Mac mini (2024) Benchmarks - Geekbench.html" src/catalogue/macCatalogue.generated.ts
bun run format
```

The processor generator replaces generated AMD, Intel, and Qualcomm identities
and Geekbench 7 averages. The Mac generator replaces identities and
configuration constraints only. It must not import scores from a page whose
generation copy is conflicting or unclear.

After regeneration:

1. Update the source capture's `retrievedOn` value in
   `src/catalogue/processorCatalogue.ts` and verify the stated Geekbench
   generation and minimum-result rule.
2. Review removed and renamed entries, duplicate paths, implausible scores, and
   unexpected table-layout changes.
3. Preserve reviewed aliases, specifications, corrections, compositions, and
   provenance overlays; generators must not infer or overwrite them.
4. Run the full validation set in `AGENTS.md`, including both browser builds.

The broad processor chart is a discovery source, not a complete registry.
Retain explicitly observed processor and Mac links that are absent from it.

## Deliberately unsupported candidates

- Cache metrics `17`–`24` are not parsed or displayed. ARM captures and
  asymmetric dual-die X3D processors make generic interpretation unsafe; see
  [Cache metadata](tasks/cache-metadata.md).
- GPU name metric `34` is outside CPU benchmark context.
- Metrics `66`–`69` resemble temperature/frequency extrema on some x86 results
  but have no confirmed schema.
- Per-workload scores and runtimes could explain score deltas, but require a
  separate statistical and UI design.
