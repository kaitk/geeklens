# Changelog

## [v0.2.2] - 2025-05-25

## Fixed
- Properly list AMX support for Photo Library and Object Detection for CPUs that support it

## Changed
- Tooltips added to top  badges as well (with more info) and enabled by default

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
