# Apple and Qualcomm core compositions

**Status:** ready to start.
**Raised:** 2026-08-01.

Extend `REVIEWED_CORE_COMPOSITIONS` in `src/catalogue/processorCatalogue.ts` to
cover Apple silicon and Snapdragon X. Coverage today is 5 of 41 Apple entries and
0 of 8 Qualcomm entries; the Intel hybrid range is already done.

With groups recorded, the cluster matcher in `processorContextViewModel.ts` names
the segments in the topology legend and drops the separate composition line.
Apple payloads report clusters, so most of these entries will light that path up.
Absent entries keep rendering exactly as they do now, so this can land in slices.

## The naming rule this has to respect

Group labels are recorded in the source's own wording and are never normalized
across vendors or generations. **Vendors rename core tiers mid-family without
changing the silicon design vocabulary underneath**, and the catalogue is
supposed to reproduce that, not paper over it:

- Apple changed the wording for M5 Pro and M5 Max relative to earlier M-series
  parts. See the [M5 Pro / M5 Max
  newsroom](https://www.apple.com/cm/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/)
  and the per-generation summary on
  [Wikipedia's Apple M5 page](https://en.wikipedia.org/wiki/Apple_M5), which
  cites the primary sources.
- Qualcomm's Oryon tier names likewise differ between Snapdragon X and X2.

So take the label from the source that covers _that specific part_, and do not
reuse a label from a neighbouring generation because the counts happen to match.

The `appleHybrid()` helper added for the existing five entries hardcodes
`performance cores` / `efficiency cores`. **Do not extend it blindly.** Either
give it the labels as parameters or use `coreGroup()` directly for any generation
whose wording differs. Same for a Qualcomm helper: only add one once the naming
is confirmed stable across the parts it would cover.

## Scope

Apple, missing (36): the `apple-m1-pro-8c` … `apple-m5-max-18c` entries plus the
`mac-*` device-keyed entries. Note the `mac-*` entries resolve by Mac path rather
than processor name, so they need their own composition even where a
processor-keyed entry already states the same split.

Qualcomm, missing (8): `snapdragon-x2-elite-x2e-88-100`,
`snapdragon-x2-elite-extreme-x2e-94-100`, `snapdragon-x-elite-x1e-84-100`,
`snapdragon-x-elite-x1e-80-100`, `snapdragon-x-plus-x1p-64-100`,
`snapdragon-x-plus-x1p-42-100`, `snapdragon-x-elite-x1e-78-100`,
`snapdragon-x-x1-26-100`.

`CatalogueSource.publisher` already admits `Apple`, `Qualcomm`, and `Wikipedia`.
Prefer the vendor newsroom or product page; fall back to Wikipedia where the
vendor never published the split, as the existing entries do.

## What to expect from the matcher

Not every entry will produce named clusters, and that is a correct outcome rather
than a bug to work around:

- **Equal group counts stay anonymous.** The matcher only labels when exactly one
  assignment of clusters to groups is feasible. Any part whose two groups hold
  the same number of cores is ambiguous at full configuration and falls back to
  the composition line. Expect a few of these among the mid-range Apple Pro
  configurations; check as you add them rather than assuming.
- **Homogeneous parts get no legend at all.** A single-group composition has
  nothing to split, and the view model already discards a lone cluster because it
  just restates the core total. Those entries render the sentence only. Several
  Snapdragon X parts are uniform Oryon designs, so this is the common Qualcomm
  case, not an edge case.
- **A group count that disagrees with the reported cluster count falls back.**
  Worth watching on Apple parts if any configuration reports its clusters
  differently than the source describes the part.

## Verify while adding

1. Confirm each part's identity actually resolves before trusting a composition
   to appear. Identity matching is sensitive to the processor-name form: the
   `(R)`/`(TM)` variants only match where an explicit alias exists in
   `REVIEWED_ALIASES`. Check the form Geekbench really reports for these parts —
   `snapdragon-x2-elite-extreme-x2e-94-100` already needed an alias for exactly
   this reason.
2. Add fixture-backed assertions for at least one Apple and one Qualcomm part in
   `processorContextViewModel.test.ts`, alongside the existing Raptor Lake and
   M4 Pro cases.
3. Record a per-generation label check somewhere in the tests, so a later bulk
   edit cannot quietly flatten M5 Pro's wording into the earlier M-series terms.
