# Modern Intel catalogue coverage

**Status:** possible future work; not scheduled.
**Raised:** 2026-08-01.

The bundled Geekbench processor chart is a dated discovery snapshot, not a
complete registry. New or low-result processors may therefore have usable
payload topology but no exact catalogue identity or reviewed core composition.
Without both, GeekLens correctly leaves their clusters anonymous.

## Known missing processors

Two locally captured Geekbench 7 payloads currently demonstrate the gap:

- Result `69406`: `Intel(R) Core(TM) Ultra X7 358H`, Panther Lake, 16 cores,
  reported as `4 + 12` clusters.
- Result `70606`: `Intel(R) Core(TM) Ultra 7 270K Plus`, Arrow Lake, 24 cores,
  reported as `8 + 16` clusters.

Neither processor currently resolves to a catalogue identity. Do not add a
family-name fallback or infer core roles from cluster size, order, or frequency.

## Alternative: wait for Geekbench

The low-effort alternative is to wait for Geekbench to add or update its own
Geekbench 7 processor pages and processor benchmark chart. A later catalogue
regeneration may then supply the canonical identities and paths without manual
reviewed identity entries.

This avoids maintaining temporary identity overlays, at the cost of leaving the
processors unmatched until Geekbench publishes them. Geekbench catalogue pages
also do not necessarily provide sourced P/E/LP-E composition, so reviewed core
composition data may still be needed after the identities appear.

## Possible identity and composition work

For each processor:

1. Confirm a source supporting the exact SKU and core composition.
2. Add a reviewed identity with the exact plain and Intel `(R)`/`(TM)` payload
   aliases.
3. Require the exact physical-core count so an alias cannot match a neighbouring
   bin.
4. Add the reviewed composition under the new catalogue key.
5. Sanitize the real payload and add it to the fixture manifest.
6. Add identity-resolution and view-model tests using the captured processor-name
   form and topology.

Expected compositions require source verification before implementation:

- X7 358H: likely `4 Performance-cores + 8 Efficient-cores + 4 Low Power
  Efficient-cores`.
- 270K Plus: likely `8 Performance-cores + 16 Efficient-cores`.

The 270K Plus payload's `8 + 16` shape should be directly labelable once the
identity and reviewed composition exist.

## Possible grouped-cluster matching

The X7 358H exposes a separate modelling issue. Geekbench reports two clusters,
while published Panther Lake composition distinguishes three core groups. The
current matcher requires equal cluster and group counts, so the safe immediate
result is a sourced composition sentence with anonymous topology clusters.

A future matcher may combine published groups only under strict conditions:

- the reported core total equals the complete published total;
- groups are matched by exact sums, not upper bounds for disabled cores;
- exactly one partition of published groups fits the reported clusters; and
- ambiguous partitions render no labels.

For a verified `4 P + 8 E + 4 LP E` X7 358H, the unique partition may be:

```text
Reported:   4 | 12
Published:  4 P | 8 E | 4 LP E
Rendered:   4 Performance | 12 Efficient + Low Power Efficient
```

Implement this as a general exact-partition algorithm, not a Panther Lake or SKU
special case. Do not apply it when cores appear disabled or when more than one
partition is feasible.

## Ongoing coverage

Periodically regenerate the broad catalogue from the Geekbench processor chart,
then review newly added and still-unmatched modern Intel identities. Consider a
maintenance report for Intel catalogue entries without reviewed compositions,
with explicit exclusions for homogeneous or insufficiently sourced parts. Do not
turn processor-name patterns into automatic P/E claims.

## Acceptance criteria

This task is complete when:

- both known processors resolve from their real payload names;
- both carry sourced, exact-SKU compositions;
- 270K Plus labels its unambiguous reported clusters;
- X7 358H at least shows its sourced composition sentence;
- grouped-cluster matching, if implemented, labels X7 only through a unique exact
  partition and retains anonymous fallbacks for ambiguous or partial reports;
- sanitized fixture-backed tests cover both results; and
- the full validation and both browser builds pass.
