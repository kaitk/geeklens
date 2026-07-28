import browser from 'webextension-polyfill';

browser.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
  // Hide action by default
  browser.action.disable();
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (/browser\.geekbench\.com\/v[67]\/cpu\//.test(tab.url)) {
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
