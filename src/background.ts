import browser from 'webextension-polyfill';
import { parseGeekbenchGeneration } from './geekbench/generation';
import { BROWSER_HOST } from './geekbench/urls';

/**
 * Parsed rather than pattern-matched so the supported generations stay defined
 * in one place, and so a lookalike path on another host cannot match.
 */
function isSupportedGeekbenchUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    return hostname === BROWSER_HOST && parseGeekbenchGeneration(pathname) !== null;
  } catch {
    return false;
  }
}

browser.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
  // Hide action by default
  browser.action.disable();
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (isSupportedGeekbenchUrl(tab.url)) {
      browser.action.enable(tabId);
    } else {
      browser.action.disable(tabId);
    }
  }
});

// Hide icon when tabs are removed
browser.tabs.onRemoved.addListener((tabId) => {
  browser.action.disable(tabId);
});
