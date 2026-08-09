# Cache metadata

**Status:** deferred; not scheduled.
**Raised:** 2026-08-01.

GeekLens does not parse or display payload cache metrics `17`–`24`. Their
meaning is not consistent enough across the current fixtures for a generic cache
row.

## Correctness constraints

Geekbench represents L3 as a size/count pair and may replicate the largest cache
across dies. This is wrong for asymmetric dual-die Ryzen X3D processors. For
example, the bundled Ryzen 9 9950X3D fixture reports `96 MB × 2` (192 MB), while
the processor has 96 MB on one die and 32 MB on the other (128 MB total).
Single-die X3D parts report correctly.

Sampled ARM payloads often report zero cache values or per-cluster values that do
not describe the whole processor. Settle and test those semantics before shipping
generic cache presentation.

Do not draw dies in the topology bar. The payload contains no core-to-die mapping,
and the bar's segments mean processor clusters everywhere else. Any published
correction must preserve the conflicting payload value in its provenance. Missing
or ambiguous cache data must render nothing rather than an inferred hierarchy.

## Deferred work

1. Parse metrics `17`–`24` with cross-platform fixture coverage and render cache
   in its own row.
2. Add reviewed per-die facts for affected SKUs and state a corrected total,
   rather than only marking Geekbench's native value as disputed.
