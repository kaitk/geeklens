import browser from 'webextension-polyfill';

export interface Settings {
  showProcessorSummary: boolean;
  showTopologyScaling: boolean;
  showFrequencyDistribution: boolean;
  showMemoryDetails: boolean;
  showReferenceComparison: boolean;
  showIsaAnnotations: boolean;
  coloredBadges: boolean;
  tooltips: boolean;
  /**
   * The amber warning on unconfirmed Geekbench 7 mappings. Defaults to on:
   * hiding it is an explicit choice, so an inferred mapping never reads as
   * documented fact by accident.
   */
  mappingWarnings: boolean;
}

export const defaultSettings: Readonly<Settings> = {
  showProcessorSummary: true,
  showTopologyScaling: true,
  showFrequencyDistribution: true,
  showMemoryDetails: true,
  showReferenceComparison: true,
  showIsaAnnotations: true,
  coloredBadges: true,
  tooltips: true,
  mappingWarnings: true,
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
      return {
        ...defaultSettings,
        ...result.geekLensSettings,
        // Keep approved-but-unwired features off even if the visual prototype
        // previously stored them as enabled. Remove an override only when that
        // feature is backed by a real result-context view model.
      };
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
