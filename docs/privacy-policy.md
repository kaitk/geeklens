# GeekLens Privacy Policy

Last Updated: 2026-07-28

## Overview

GeekLens is a browser extension that enhances Geekbench CPU benchmark results
with instruction-set information. This policy explains the information that the
extension processes locally to provide that feature.

## Data Collection

GeekLens does not collect or transmit user data to the developer, analytics
providers, advertisers, or other third parties. It contains no analytics,
telemetry, advertising, or tracking.

## Local Processing and Storage

GeekLens processes and stores only what is necessary for its user-facing
functionality:

- **Extension settings:** Badge color and tooltip preferences are stored using
  browser synchronized storage. The browser vendor may synchronize these
  settings when browser sync is enabled; the developer cannot access them.
- **Cached CPU information:** Public Geekbench result IDs and instruction-set
  metadata are cached in page-origin IndexedDB to avoid repeated requests.
- **Geekbench page content:** The current Geekbench CPU result or comparison
  page is read locally to identify results and add annotations. GeekLens does
  not record general browsing history or access unrelated websites.
- **Geekbench requests:** When necessary, the extension requests result metadata
  directly from `browser.geekbench.com` using the user's existing Geekbench
  session. GeekLens does not read or store the user's credentials.

No personally identifiable information, health information, financial
information, authentication information, personal communications, location,
web history, or user-activity data is collected.

## Data Sharing

GeekLens does not sell, share, or transfer user data.

## User Rights

You can:

- Clear stored data by uninstalling the extension or clearing site data for
  `browser.geekbench.com`.
- Modify stored preferences through the extension settings.
- Inspect locally stored information using browser developer tools.

## Changes to This Policy

We may update this privacy policy as needed. Any changes will be reflected with an updated "Last Updated" date.

## Contact

For questions about this privacy policy or GeekLens, please contact: kaitkasak@gmail.com

## Compliance

GeekLens is intended to comply with the extension policies of the Chrome Web
Store, Microsoft Edge Add-ons, and Firefox Add-ons.
