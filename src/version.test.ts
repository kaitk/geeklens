import { describe, expect, test } from 'bun:test';
import { generateManifest } from '../vite.config';

describe('extension metadata', () => {
  test('generates the manifest metadata from package.json', async () => {
    const root = new URL('../', import.meta.url);
    const packageJson = await Bun.file(new URL('package.json', root)).json();
    const manifestTemplate = await Bun.file(new URL('src/manifest.json', root)).json();
    const manifest = generateManifest();

    expect(manifest).toMatchObject({
      name: packageJson.name,
      description: packageJson.description,
      version: packageJson.version,
    });
    expect(manifestTemplate).not.toHaveProperty('name');
    expect(manifestTemplate).not.toHaveProperty('description');
    expect(manifestTemplate).not.toHaveProperty('version');
  });
});
