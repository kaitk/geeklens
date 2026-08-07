# Result validity

GeekLens shows a validity row on comparison pages only when at least one result
is invalid. Invalid results are also marked with a compact badge beside their
names in the Single-Core and Multi-Core score summaries. The authoritative
status source is the individual result page's
`.validation-widget`: `validation-success` means valid and `validation-error`
means invalid. `validation-warning` is a distinct yellow invalidity level used
for results that may be invalid, such as results affected by Intel's Binary
Optimization Tool. The accompanying alert supplies the message shown in the
badge tooltip. Missing or unrecognized widgets are unavailable, not valid.

Single-result pages already render Geekbench's own validity widget and warning,
so GeekLens does not duplicate them there.

Do not infer Browser validity from the payload's root `valid` field alone.
Result 98600 is marked invalid by Browser because of a timer issue while its
stored `.gb6` payload, sections, and workloads all contain `valid: 1`. This
indicates that Browser can apply validity decisions after the uploaded benchmark
document was produced.

A payload root value that explicitly normalizes to `false` is nevertheless
additional evidence of invalidity. It may mark a result invalid when no HTML
status is available, but `true` never overrides an HTML invalidity alert.
Section and workload flags are retained as benchmark internals and are not used
as the Browser result-level status.

Successful HTML checks are stored with the existing generation-scoped result
record in IndexedDB and reused for seven days. The stored value includes the
validity level and tooltip message. Failed requests are not cached as
valid. After expiry, comparison-page loading fetches the individual result page
again with HTTP cache revalidation and refreshes the record. The cache remains subject to the shared
least-recently-used eviction limits.
