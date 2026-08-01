# Cache metadata

**Status:** deferred; not scheduled.
**Raised:** 2026-08-01.

GeekLens does not parse or display payload cache metrics `17`–`24`. Their
meaning is not consistent enough across the current fixtures for a generic cache
row.

## Known correctness problem

Geekbench represents L3 as a size/count pair and may replicate the largest cache
across dies. This is wrong for asymmetric dual-die Ryzen X3D processors. For
example, the bundled Ryzen 9 9950X3D fixture reports `96 MB × 2` (192 MB), while
the processor has 96 MB on one die and 32 MB on the other (128 MB total).
Single-die X3D parts report correctly.

Do not draw dies in the topology bar. The payload contains no core-to-die
mapping, and the bar's segments mean processor clusters everywhere else.

## ARM caveat

Sampled ARM payloads often report zero cache values or per-cluster values that
do not describe the whole processor. Settle and test those semantics before
shipping any generic cache presentation.

## Possible first slice

Choose one of these only after cache parsing has cross-platform fixture tests:

1. Detect an `X3D` name with an L3 count greater than one and mark the reported
   value unverified without asserting a corrected total.
2. Add reviewed per-die cache facts for the small affected SKU set (7900X3D,
   7950X3D, 9900X3D, and 9950X3D), with source provenance, and render cache in
   its own row.

Any published correction must preserve the conflicting payload value in its
provenance. Missing or ambiguous cache data must render nothing rather than an
inferred hierarchy.
