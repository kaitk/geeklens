import browser from 'webextension-polyfill';

browser.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
});

// Listen for URL changes to detect Geekbench pages
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('browser.geekbench.com/v6/cpu/')) {
    // Notify the content script that we're on a Geekbench page
    browser.tabs.sendMessage(tabId, { action: 'annotate' });
  }
});
