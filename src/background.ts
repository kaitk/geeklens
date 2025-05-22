import browser from 'webextension-polyfill';

browser.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
  // Hide action by default
  browser.action.disable();
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('browser.geekbench.com/v6/cpu/')) {
      browser.action.enable(tabId);
      browser.tabs.sendMessage(tabId, { action: 'annotate' });
    } else {
      browser.action.disable(tabId);
    }
  }
});

// Hide icon when tabs are removed
browser.tabs.onRemoved.addListener((tabId) => {
  browser.action.disable(tabId);
});
