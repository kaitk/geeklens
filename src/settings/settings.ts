import browser from '../browserApi';
import { logError } from '../logger';

export interface Settings {
  enabled: boolean;
  showProcessorSummary: boolean;
  showCoreTopology: boolean;
  showMultiCoreScaling: boolean;
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
  enabled: true,
  showProcessorSummary: true,
  showCoreTopology: true,
  showMultiCoreScaling: true,
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
      };
    }
  } catch (e) {
    logError('Failed to load settings', e);
  }
  return { ...defaultSettings };
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await browser.storage.sync.set({ geekLensSettings: settings });
  } catch (e) {
    logError('Failed to save settings', e);
    throw e;
  }
}
