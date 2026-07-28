import browser from 'webextension-polyfill';

/**
 * Read from the installed manifest rather than importing `src/manifest.json`.
 * Importing the template inlines the whole file — including its `{{chrome}}`
 * and `{{firefox}}` keys — into the popup bundle.
 */
export const extensionVersion = `v${browser.runtime.getManifest().version}`;
