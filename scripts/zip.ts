import { zip } from 'zip-a-folder';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const browser = process.argv[2] || 'chrome';

const distPath = join(__dirname, `../dist/${browser}`);
const zipPath = join(__dirname, `../GeekLens-v${pkg.version}-${browser}.zip`);

zip(distPath, zipPath)
.then(() => console.log(`✨ Extension zipped: GeekLens-v${pkg.version}-${browser}.zip`))
.catch(error => {
  console.error('Error creating zip:', error);
  process.exit(1);
});
