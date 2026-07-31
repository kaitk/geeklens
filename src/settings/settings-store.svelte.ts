import browser from '../browserApi';
import { defaultSettings, loadSettings, type Settings } from './settings';

let initialized = false;
let settings = $state({ ...defaultSettings });

// Initialize settings store
init();

function init() {
  if (initialized) return;
  initialized = true;

  // Load initial settings
  loadSettings().then((initialSettings) => {
    settings = initialSettings;
  });

  // Listen for storage changes
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.geekLensSettings) {
      settings = changes.geekLensSettings.newValue as Settings;
    }
  });
}

export function getSettingsStore() {
  return {
    get value() {
      return settings;
    },
  };
}
