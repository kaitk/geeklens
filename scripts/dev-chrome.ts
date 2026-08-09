// Chrome dev runner.
//
// vite-plugin-web-extension launches the browser through its bundled
// `web-ext-run` fork, which still loads extensions via the `--load-extension`
// command line switch. Chrome ignores that switch since v137, so the browser
// opens without the extension. The real `web-ext` (a devDependency, used by
// `lint:ext`) loads it over CDP instead, which still works, so drive Chrome
// with that while vite only builds.

import { spawn, type ChildProcess } from 'child_process';
import { statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');
const distPath = join(rootDirectory, 'dist/chrome');
const startUrls = [
  'https://browser.geekbench.com/v5/cpu/18449406',
  'https://browser.geekbench.com/v6/cpu/16897404',
  'https://browser.geekbench.com/v7/cpu/1248',
];

const children: ChildProcess[] = [];

function run(command: string, args: string[]): ChildProcess {
  const child = spawn(command, args, {
    cwd: rootDirectory,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, TARGET: 'chrome' },
  });
  children.push(child);
  child.on('exit', (code) => shutdown(code ?? 0));
  return child;
}

let shuttingDown = false;
function shutdown(code: number): void {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const manifestPath = join(distPath, 'manifest.json');
let initialManifestMtime = -Infinity;
try {
  initialManifestMtime = statSync(manifestPath).mtimeMs;
} catch {
  // No previous build exists.
}

run('vite', ['build', '--watch', '--mode', 'development']);

// web-ext refuses to start without a manifest, and emptyOutDir removes the
// previous one. Require a newly written manifest, then wait for it to go quiet
// because vite emits it as the last step.
const settleMs = 1500;
const waitForBuild = setInterval(() => {
  let writtenAt: number;
  try {
    writtenAt = statSync(manifestPath).mtimeMs;
  } catch {
    return;
  }
  if (writtenAt <= initialManifestMtime) return;
  if (Date.now() - writtenAt < settleMs) return;
  clearInterval(waitForBuild);
  run('web-ext', [
    'run',
    '--target',
    'chromium',
    '--source-dir',
    distPath,
    '--start-url',
    ...startUrls,
  ]);
}, 250);
