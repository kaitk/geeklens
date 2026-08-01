import { describe, expect, test } from 'bun:test';

describe('extension version', () => {
  test('keeps package.json and manifest.json synchronized', async () => {
    const root = new URL('../', import.meta.url);
    const packageJson = await Bun.file(new URL('package.json', root)).json();
    const manifest = await Bun.file(new URL('src/manifest.json', root)).json();
    expect(manifest.version).toBe(packageJson.version);
  });
});
