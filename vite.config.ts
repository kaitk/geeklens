import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

const browser = process.env.TARGET || "chrome";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    webExtension({
      manifest: generateManifest,
      watchFilePaths: ["package.json", "src/manifest.json"],
      browser: browser,
      webExtConfig: {
        target: browser === "firefox" ? "firefox-desktop" : "chromium",
        startUrl: ["https://browser.geekbench.com/v6/cpu/11907485"]
      }
    }),
  ],
  build: {
    outDir: `dist/${browser}`,
    emptyOutDir: true
  }
});
