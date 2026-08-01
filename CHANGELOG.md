# Changelog

## [Unreleased]

## [v0.5.0] - 2026-08-01

### Added

- Added optional processor context to CPU result and comparison pages: processor
  identity, topology and MT/ST scaling, frequency distributions, memory details,
  and Geekbench 7 Browser-average score comparisons.
- Added a bundled processor catalogue and sourced memory details for matched
  systems. All processor-context views can be toggled in settings and default
  to enabled.
- Added a setting to hide unconfirmed-mapping warnings.
- Added a direct sign-in action when Geekbench 7 instruction data requires
  authentication.

### Changed

- Simplified the system instruction-set summary to focus on modern,
  workload-relevant features instead of legacy baseline instructions.

## [v0.4.0] - 2026-07-28

### Added

- Added initial support for Geekbench 7 CPU result and comparison pages.

### Notes

- Geekbench 7 instruction data requires signing in to Geekbench, including on
  single-result pages.
- Per-test Geekbench 7 instruction information is extremely limited and marked
  as provisional until Primate Labs publishes
  `geekbench7-benchmark-internals.pdf`.

## [v0.3.0] - 2025-05-26

### Added

- Added Initial support for RISK-V

## Fixed

- Properly fix reporting AMX support for Photo Library
- Fixed issues with disabling color or removing tooltips not working properly
- Fix cell name overflow with really long names, [like here](https://browser.geekbench.com/v6/cpu/compare/10177252)

## Changed

- Removed save button from settings, now changes are applied immediately

## [v0.2.2] - 2025-05-25

## Fixed

- Properly list AMX support for Photo Library and Object Detection for CPUs that support it

## Changed

- Tooltips added to top badges as well (with more info) and enabled by default

## [v0.2.1] - 2025-05-22

## Fixed

- Only enable the extension on paths: `https://browser.geekbench.com/v6/cpu/*`
- The popups Extensions tab now properly lists extensions under correct groups

## [v0.2.0] - 2025-05-21

### Added

- Added support for comparison pages

### Notes

- As ISA information on those pages is not available fetches to base bases are needed
- Added IndexedDB cache for ISA info to minimize load on Geekbench servers

## [v0.1.5] - Initial Release

- Initial public release with instruction annotations on Geekbench V6 single result pages
