import { zip } from 'zip-a-folder';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(scriptDirectory, '../package.json'), 'utf8'));

const browser = process.argv[2] || 'chrome';

const distPath = join(scriptDirectory, `../dist/${browser}`);
const zipPath = join(scriptDirectory, `../GeekLens-v${pkg.version}-${browser}.zip`);

zip(distPath, zipPath)
  .then(() => console.log(`✨ Extension zipped: GeekLens-v${pkg.version}-${browser}.zip`))
  .catch((error) => {
    console.error('Error creating zip:', error);
    process.exit(1);
  });
