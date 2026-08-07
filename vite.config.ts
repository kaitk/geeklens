import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';

function generateManifest() {
  const manifest = readJsonFile('src/manifest.json');
  const pkg = readJsonFile('package.json');
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

// Must match the {{...}} tags used in src/manifest.json ('chrome' | 'firefox'),
// otherwise the tagged keys are stripped and the manifest is invalid.
const browser = process.env.TARGET || 'chrome';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    webExtension({
      manifest: generateManifest,
      watchFilePaths: ['package.json', 'src/manifest.json'],
      browser: browser,
      // The bundled web-ext-run launches Chrome with --load-extension, which
      // Chrome ignores since v137. `bun run dev:chrome` drives the browser
      // with the real web-ext instead - see scripts/dev-chrome.ts.
      disableAutoLaunch: browser !== 'firefox',
      webExtConfig: {
        target: browser === 'firefox' ? 'firefox-desktop' : 'chromium',
        startUrl: [
          'https://browser.geekbench.com/v5/cpu/18449406',
          'https://browser.geekbench.com/v7/cpu/1248',
        ],
      },
    }),
  ],
  build: {
    outDir: `dist/${browser}`,
    emptyOutDir: true,
  },
});
