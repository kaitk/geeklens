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
pages. Record that in `docs/geekbench7-sources.md`; comparison pages may still
need their clear/restore flow because Geekbench's selected-baseline state is
coupled to those pages.

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

**Where:** comparison loading in `src/content/comparisonPage.ts`.

Live validation confirmed that both GB6 comparison HTML requests and GB7
`.gb6` requests fail while a baseline is selected. GeekLens therefore clears
the baseline with a baseline-free comparison request before fetching both
results. The captured logged-out Geekbench 6 comparison page exposes a more
explicit removal control:

```
/v6/cpu/remove_baseline/<primary-id>
```

**How to check:** confirm `remove_baseline` behaves identically on both
generations, signed in and signed out, and does not require a CSRF token. If so,
it can replace the comparison request used purely for its clearing side effect.

## 4. Behaviour changes from the audit that only manual testing can confirm

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

## 5. Coverage gaps

The fixture tests cover selectors and row ordering for both generations. Nothing
automated covers:

- `src/cache/ResultsCache.ts` (IndexedDB) at all.
- The comparison endpoints' actual session side effects and concurrent request
  behavior.
- Svelte mounting: `mountBadges.ts`, the system-information row insertion, and
  the already-annotated guards.
- Browser-specific manifest generation beyond the supported-generation match
  assertion, the popup, and settings persistence beyond `loadSettings`.

Stored fixtures are all **logged-out** captures. There is no logged-in Geekbench
7 fixture, so the only page shape that actually yields instruction data is
exercised solely by hand.

The remaining baseline coverage requires a live session or a higher-level
browser test; unit coverage cannot establish the undocumented endpoint effects.

## 6. The manifest duplicates the supported-generation list

`SUPPORTED_GENERATIONS` in `src/geekbench/generation.ts` drives URL parsing,
content-script routing, and the background action toggle.
`src/manifest.json` cannot read it and must be edited by hand.

`generation.test.ts` asserts that the manifest matches this constant, so drift
fails the test suite. Generating the entries in `vite.config.ts` remains an
optional way to remove the duplication entirely.
