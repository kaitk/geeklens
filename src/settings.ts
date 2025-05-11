import browser from "webextension-polyfill";

export interface Settings {
    enabled: boolean,
    showBadges: boolean,
}

export let defaultSettings: Settings = {
    enabled: true,
    showBadges: true,
};


export async function loadSettings() {
    try {
        const result = await browser.storage.sync.get('geekLensSettings') as { geekLensSettings: Settings };
        if (result?.geekLensSettings) {
            return result.geekLensSettings;
        }
        console.debug('Failed to load geekLensSettings, returning default');
        return defaultSettings;
    } catch (e) {
        console.error('Failed to load settings:', e);
        return defaultSettings;
    }
}

// Save settings
export async function saveSettings(settings: Settings) {
    try {
        await browser.storage.sync.set({ geekLensSettings: settings });
    } catch (e) {
        console.error('Failed to save settings:', e);
    }
}
