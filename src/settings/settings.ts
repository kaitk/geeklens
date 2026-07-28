import browser from 'webextension-polyfill';

export interface Settings {
  coloredBadges: boolean;
  tooltips: boolean;
}

export const defaultSettings: Readonly<Settings> = {
  coloredBadges: true,
  tooltips: true,
};

/**
 * Always returns a fresh object. The popup binds checkboxes straight to the
 * result, so handing back the shared `defaultSettings` would let a click
 * rewrite the defaults for every other consumer in the page.
 */
export async function loadSettings(): Promise<Settings> {
  try {
    const result = (await browser.storage.sync.get('geekLensSettings')) as {
      geekLensSettings?: Settings;
    };
    if (result?.geekLensSettings) {
      return { ...defaultSettings, ...result.geekLensSettings };
    }
    console.debug('Failed to load geekLensSettings, returning default');
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return { ...defaultSettings };
}

// Save settings
export async function saveSettings(settings: Settings) {
  try {
    await browser.storage.sync.set({ geekLensSettings: settings });
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}
