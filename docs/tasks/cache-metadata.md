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

## Shipped: the reported value is marked, not corrected

The native `L3 Cache` row is now marked on the four affected SKUs. This needs no
cache parsing at all: it annotates Geekbench's own row in place, so none of the
metric `17`–`24` semantics or the ARM caveat below had to be settled first.

Detection is keyed by catalogue SKU (`REVIEWED_L3_CACHE_DISPUTES`), not by an
`X3D` name match, which the earlier draft of this task proposed. The name does
not say how many dies carry V-Cache: the single-die parts (9800X3D, 7800X3D,
5800X3D) report correctly, and a dual-V-Cache part would report correctly too,
since replicating the larger size across both dies is then the right answer.

The affordance is a single amber warning triangle that is itself the link to the
source, so the objection and its provenance share one tooltip. It carries no
`RowMarkerKind`: the bullet markers mean "GeekLens added or changed this row",
and neither is true of a value left deliberately untouched.

It sits on the value cell rather than the row label, because comparison view puts
both systems on one shared `L3 Cache` row and only one of them may be affected —
a 13900K reads `36.0 MB x 1` (one die, correct) beside a 9950X3D's `96.0 MB x 2`.
Note that `geekbench7-comparison.html` was abridged and carried no cache rows at
all; an `L3 Cache` row matching the live markup has been added to it.

**The wording must not name which die was read.** Geekbench multiplies _a_ die's
size by the die count, and which die it picks is not stable: the same 9950X3D has
been observed reporting `96.0 MB x 2` (192 MB) and `32.0 MB x 2` (64 MB). Only
the published total is safe to state, and a test asserts the copy names no
specific die. The guard is a die count above one, not a particular size, for the
same reason — and it drops the warning entirely if Geekbench ever reports one
figure per package, so an upstream fix cannot leave a stale objection behind.

The copy says the value is _likely_ wrong rather than asserting it outright. What
is certain is the published total for the SKU; what GeekLens cannot see is
whether a given result is running the part as shipped. All four cite their
generation page — for Zen 4 that is the Raphael section of the Ryzen processor
list, since the Zen 4 article itself carries no per-SKU cache table.

## Still deferred

Both of these still want cache parsing with cross-platform fixture tests first:

1. Render cache in its own row from parsed metrics, which is what the ARM caveat
   above blocks.
2. Add reviewed per-die cache facts for the affected SKU set and state a
   corrected total rather than only objecting to the reported one.

A published core-composition sentence for these parts (naming the V-Cache die in
the topology row) is a separate, additive slice and is not a prerequisite for
either: it states a fact about the SKU without touching a reported value. Do not
draw the dies as topology bar segments — see below.

Any published correction must preserve the conflicting payload value in its
provenance. Missing or ambiguous cache data must render nothing rather than an
inferred hierarchy.
