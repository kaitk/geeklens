import { describe, expect, mock, test } from 'bun:test';

let stored: Record<string, unknown> = {};
let saveError: Error | null = null;

mock.module('../browserApi', () => ({
  default: {
    storage: {
      sync: {
        get: async () => stored,
        set: async (values: Record<string, unknown>) => {
          if (saveError) throw saveError;
          stored = { ...stored, ...values };
        },
      },
    },
  },
}));

const { defaultSettings, loadSettings, saveSettings } = await import('./settings');

describe('loadSettings', () => {
  test('never hands back the shared defaults object', async () => {
    stored = {};
    const settings = await loadSettings();

    expect(settings).toEqual({ ...defaultSettings });
    // The popup binds checkboxes straight to this object, so aliasing the
    // module-level defaults would rewrite them for every other consumer.
    expect(settings).not.toBe(defaultSettings);

    settings.tooltips = false;
    expect(defaultSettings.tooltips).toBe(true);
    expect((await loadSettings()).tooltips).toBe(true);
  });

  test('fills in missing keys from the defaults', async () => {
    stored = { geekLensSettings: { coloredBadges: false } };
    const settings = await loadSettings();

    expect(settings.coloredBadges).toBe(false);
    expect(settings.enabled).toBe(true);
    expect(settings.tooltips).toBe(true);
    expect(settings.showProcessorSummary).toBe(true);
    expect(settings.showFrequencyDistribution).toBe(true);
    expect(settings.showIsaAnnotations).toBe(true);
  });

  test('defaults mapping warnings on for settings stored before the option existed', async () => {
    stored = { geekLensSettings: { coloredBadges: true, tooltips: true } };

    expect((await loadSettings()).mappingWarnings).toBe(true);
  });

  test('preserves a disabled global setting', async () => {
    stored = { geekLensSettings: { enabled: false } };

    expect((await loadSettings()).enabled).toBe(false);
  });

  test('enables all implemented context controls', async () => {
    stored = {
      geekLensSettings: {
        coloredBadges: true,
        tooltips: true,
        showProcessorSummary: true,
        showCoreTopology: true,
        showMultiCoreScaling: true,
        showFrequencyDistribution: true,
        showMemoryDetails: true,
        showReferenceComparison: true,
      },
    };
    const settings = await loadSettings();

    expect(settings.showProcessorSummary).toBe(true);
    expect(settings.showCoreTopology).toBe(true);
    expect(settings.showMultiCoreScaling).toBe(true);
    expect(settings.showFrequencyDistribution).toBe(true);
    expect(settings.showMemoryDetails).toBe(true);
    expect(settings.showReferenceComparison).toBe(true);
    expect(settings.showIsaAnnotations).toBe(true);
  });
});

describe('saveSettings', () => {
  test('rejects when synchronized storage fails', async () => {
    saveError = new Error('storage unavailable');

    await expect(saveSettings({ ...defaultSettings, tooltips: false })).rejects.toThrow(
      'storage unavailable',
    );

    saveError = null;
  });
});
