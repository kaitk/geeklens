# Deferred checks and follow-ups

Open items from the 2026-07-28 duplication and refactoring audit that could not
be settled from the source alone. Nothing here is known to be broken — each one
needs a live Geekbench session, a loaded extension build, or a decision — so
they were deliberately left as-is rather than changed on a guess.

Last reviewed: 2026-07-28.

Ordered roughly by risk. Each item records what to check, how to check it, and
what to do with each outcome.

## 1. Geekbench 7 single-result pages never clear the baseline

**Where:** `getInstructionSets` in `src/content/singleResultPage.ts`.

The comparison adapter clears the selected baseline before requesting a `.gb6`
payload, because that endpoint appears to fail while a baseline is selected. The
single-result adapter requests the same endpoint with no baseline handling at
all. If the endpoint really is baseline-sensitive, a signed-in user who has a
baseline selected gets a failed fetch and no badges on ordinary result pages.

**How to check:** while signed in, select a baseline via
`/v7/cpu/baseline/<id>/`, confirm the _Remove Baseline_ control appears on a
comparison page, then load a plain `/v7/cpu/<id>` result page and watch whether
the `.gb6` request succeeds.

**If it fails:** do _not_ simply copy the comparison adapter's clear/restore
dance — that would destroy a user's baseline on ordinary page views. Prefer
detecting the failure and reporting it, or clearing and restoring only after an
initial attempt has already failed.

**If it succeeds:** the endpoint is not baseline-sensitive on single-result
pages. Record that in `docs/geekbench7-sources.md`, since it also weakens the
justification for the comparison adapter's explicit clear (item 3).

## 2. "Sign in" is shown to users who may already be signed in

**Where:** `singleResultInstructionStatus` in
`src/geekbench/instructionDataStatus.ts`.

Any Geekbench 7 result with no instruction data produces _"GeekLens: Sign in to
load instruction data"_, regardless of actual session state. If item 1 turns out
to be a real failure mode, a signed-in user hitting it is told to sign in.

This was left alone because `isGeekbenchSignedOut` returns `false` for _unknown_
as well as for _signed in_ — it only detects an explicit signed-out marker in
the navigation. Branching on it today would trade one wrong message for another
whenever Geekbench changes its navigation markup.

**How to check:** settle item 1 first. If a distinct failure mode exists, add a
third status for "signed in but data unavailable" and drive it from a positive
signed-in signal, not from `!isGeekbenchSignedOut()`.

## 3. `remove_baseline` is a real endpoint and is not being used

**Where:** `clearBaseline` in `src/content/comparisonPage.ts`.

`clearBaseline` clears the baseline by fetching the comparison URL purely for
its side effect. The captured logged-out Geekbench 6 comparison page exposes an
explicit control instead:

```
/v6/cpu/remove_baseline/<primary-id>
```

Using it would make the intent obvious and stop a data fetch and a state
mutation from being the same request.

**How to check:** confirm the endpoint exists and behaves identically on both
`/v6/` and `/v7/`, signed in and signed out, and that it does not redirect or
require a CSRF token. Only then add it to `src/geekbench/urls.ts`.

**Why it was deferred:** the current side-effect approach was arrived at after
significant trial and error. It works. Swapping it needs evidence, not tidiness.

## 4. Awaited baseline restore adds latency before badges appear

**Where:** `restoringBaseline` in `src/content/comparisonPage.ts`.

The restore is now awaited so a page unload cannot cancel it. That inserts one
request between fetching instruction data and rendering badges. This is the
intended trade — a lost baseline is worse than a slower badge — but the delay
has not been measured on a real page.

**How to check:** load a Geekbench 7 comparison signed in with a cold IndexedDB
cache and time from DOM ready to first badge. If it is disruptive, render badges
first and restore afterwards, keeping the restore awaited within the same task.

## 5. Geekbench 6 restores the baseline even when it never fetched

**Where:** the `generation === 6` branch in `annotateGeekbenchComparisonPage`.

When `versionSupportsInstructionSets` rejects both results (pre-6.4 results),
`loadInstructionSets` returns without fetching, but the surrounding
`restoringBaseline` still reapplies the baseline. Re-selecting the baseline that
is already selected should be a no-op, so this is one wasted request in a rare
path, accepted in exchange for never reasoning about whether a clear happened.

**How to check:** load a comparison of two pre-6.4 results and confirm the
baseline is unchanged afterwards. If reapplying turns out not to be idempotent,
move the fetch decision above `restoringBaseline`.

## 6. Behaviour changes from the audit that only manual testing can confirm

None of these are covered by automated tests.

- **Toolbar action matching.** `src/background.ts` now parses the tab URL rather
  than regex-matching it. `/v6/cpu` without a trailing slash now enables the
  action where it previously did not, and lookalike paths on other hosts no
  longer match. Confirm the action enables and disables correctly across result,
  comparison, and unrelated pages, in both browsers.
- **Firefox add-on identity.** The build now emits `browser_specific_settings`
  for Firefox, which it silently dropped before. Confirm the gecko ID
  `{95d308b0-f099-46c4-a8e0-2299f3245b6d}` matches the published AMO listing
  **before** the next Firefox release, or the upload will be treated as a
  different add-on.
- **Payload HTTP caching.** The `.gb6` request no longer sends a month-long
  `Cache-Control`. Successful lookups are still cached in IndexedDB. Confirm
  repeat visits do not become noticeably slower.

## 7. Coverage gaps

The fixture tests cover selectors and row ordering for both generations. Nothing
automated covers:

- `src/cache/ResultsCache.ts` (IndexedDB) at all.
- The baseline clear/restore lifecycle — the highest-risk logic in the codebase.
- Svelte mounting: `mountBadges.ts`, the system-information row insertion, and
  the already-annotated guards.
- Manifest generation, the popup, and settings persistence beyond
  `loadSettings`.

Stored fixtures are all **logged-out** captures. There is no logged-in Geekbench
7 fixture, so the only page shape that actually yields instruction data is
exercised solely by hand.

**Worth doing first:** a fixture-driven test for the baseline lifecycle using an
injectable `fetch`, asserting that a restore follows any attempt that could have
cleared, and that Geekbench 6 never issues an explicit clear.

## 8. Page parsing depends on Svelte-generated class names

**Where:** the already-annotated guards in `singleResultPage.ts`
(`.gb-system-info-container`) and `comparisonPage.ts`
(`.gb-instruction-container`).

Both query for classes declared inside the scoped `<style>` blocks of
`SystemInstructionSets.svelte` and `TableInstructionSets.svelte`. Svelte 5 keeps
the authored class and appends a scope hash, so this works today and is verified
in the build output — but it is the one place where page parsing depends on
component internals, which `docs/architecture.md` otherwise forbids.

**Fix when convenient:** mark the containers created in
`src/content/mountBadges.ts` with an explicit `data-geeklens-*` attribute and
query that instead, leaving the CSS classes purely presentational.

## 9. The manifest duplicates the supported-generation list

`SUPPORTED_GENERATIONS` in `src/geekbench/generation.ts` drives URL parsing,
content-script routing, and the background action toggle.
`src/manifest.json` cannot read it and must be edited by hand.

**Fix when convenient:** generate the `content_scripts.matches` entries in
`generateManifest` in `vite.config.ts`, which already builds the manifest
object, or add a test asserting the manifest matches the constant.
