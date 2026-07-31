import { describe, expect, mock, test } from 'bun:test';

let stored: Record<string, unknown> = {};

mock.module('webextension-polyfill', () => ({
  default: {
    storage: {
      sync: {
        get: async () => stored,
        set: async (values: Record<string, unknown>) => {
          stored = { ...stored, ...values };
        },
      },
    },
  },
}));

const { defaultSettings, loadSettings } = await import('./settings');

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
    expect(settings.tooltips).toBe(true);
  });

  test('defaults mapping warnings on for settings stored before the option existed', async () => {
    stored = { geekLensSettings: { coloredBadges: true, tooltips: true } };

    expect((await loadSettings()).mappingWarnings).toBe(true);
  });
});
