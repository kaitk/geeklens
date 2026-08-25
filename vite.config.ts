import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';

interface DevelopmentLogin {
  username: string;
  password: string;
}

export function generateManifest(developmentLogin?: DevelopmentLogin) {
  const manifest = readJsonFile('src/manifest.json');
  const pkg = readJsonFile('package.json');
  const contentScripts = [...manifest.content_scripts];
  if (developmentLogin) {
    contentScripts.push({
      matches: ['https://browser.geekbench.com/session/new'],
      js: ['src/dev/autoLogin.ts'],
    });
  }
  return {
    ...manifest,
    content_scripts: contentScripts,
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
  };
}

// Must match the {{...}} tags used in src/manifest.json ('chrome' | 'firefox'),
// otherwise the tagged keys are stripped and the manifest is invalid.
const browser = process.env.TARGET || 'chrome';
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'GEEKLENS_DEV_');
  const username = (
    process.env.GEEKLENS_DEV_GEEKBENCH_USERNAME ?? environment.GEEKLENS_DEV_GEEKBENCH_USERNAME
  )?.trim();
  const password =
    process.env.GEEKLENS_DEV_GEEKBENCH_PASSWORD ?? environment.GEEKLENS_DEV_GEEKBENCH_PASSWORD;
  const developmentLogin =
    mode === 'development' && username && password ? { username, password } : undefined;
  const startUrls = developmentLogin
    ? ['https://browser.geekbench.com/session/new', 'https://browser.geekbench.com/v7/cpu/1248']
    : [
        'https://browser.geekbench.com/v5/cpu/18449406',
        'https://browser.geekbench.com/v6/cpu/16897404',
        'https://browser.geekbench.com/v7/cpu/1248',
      ];

  return {
    define: {
      GEEKLENS_DEV_USERNAME: JSON.stringify(developmentLogin?.username ?? ''),
      GEEKLENS_DEV_PASSWORD: JSON.stringify(developmentLogin?.password ?? ''),
    },
    plugins: [
      svelte(),
      webExtension({
        manifest: () => generateManifest(developmentLogin),
        watchFilePaths: ['package.json', 'src/manifest.json'],
        browser: browser,
        // The bundled web-ext-run launches Chrome with --load-extension, which
        // Chrome ignores since v137. `bun run dev:chrome` drives the browser
        // with the real web-ext instead - see scripts/dev-chrome.ts.
        disableAutoLaunch: browser !== 'firefox',
        webExtConfig: {
          target: browser === 'firefox' ? 'firefox-desktop' : 'chromium',
          startUrl: startUrls,
        },
      }),
    ],
    build: {
      outDir: `dist/${browser}`,
      emptyOutDir: true,
    },
  };
});
