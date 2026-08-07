import { mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

/**
 * Maintainer-only fixture import tool, not a build step.
 *
 * The inputs are authenticated captures kept in the gitignored `temp/`
 * directory because they contain UUIDs, hostnames, account details, and CSRF
 * tokens. Place every named input there, inspect it for new sensitive fields,
 * then run `bun scripts/sanitize-result-fixtures.ts`. The script fails before
 * writing anything when an expected capture is missing.
 */
const ROOT = join(import.meta.dir, '..');
const PAYLOAD_OUTPUT = join(ROOT, 'src', 'geekbench', '__fixtures__');
const HTML_OUTPUT = join(ROOT, 'src', 'content', '__fixtures__');

const PAYLOADS = [
  '10324204.gb5.json',
  '1524322.gb5.json',
  '17536185.gb5.json',
  '18449406.gb5.json',
  '18878080.gb5.json',
  '18864843.gb6.json',
  '18873252.gb6.json',
  '1248.gb6.json',
  '1262.gb6.json',
  '40339.gb6.json',
  '4469.gb6.json',
  '52173.gb6.json',
  '58949.gb6.json',
  '59394.gb6.json',
  '61473.gb6.json',
  '61506.gb6.json',
  '62238.gb6.json',
  '62440.gb6.json',
  '64437.gb6.json',
  '64509.gb6.json',
  '64629.gb6.json',
  '64810.gb6.json',
  '64820.gb6.json',
] as const;

const HTML_FIXTURES = {
  'gb5_single.htm': 'geekbench5-single.html',
  'gb5_comparison.htm': 'geekbench5-comparison.html',
  'M4_wwith_link.htm': 'geekbench7-mac-linked.html',
  'M5_without_link.htm': 'geekbench7-mac-unlinked.html',
} as const;

interface Metric {
  id?: unknown;
  value?: unknown;
}

interface Payload {
  uuid?: unknown;
  system_uuid?: unknown;
  metrics?: unknown;
}

function sanitizedPayload(payload: Payload): Payload {
  payload.uuid = 'fixture-result-uuid';
  payload.system_uuid = 'fixture-system-uuid';

  if (Array.isArray(payload.metrics)) {
    for (const metric of payload.metrics as Metric[]) {
      if (Number(metric.id) === 122) metric.value = 'fixture-host';
    }
  }

  return payload;
}

function sanitizedHtml(html: string): string {
  return html
    .replace(
      /<tr>\s*<td class="system-name">User<\/td>\s*<td class="system-value">[\s\S]*?<\/td>\s*<\/tr>/,
      '<tr><td class="system-name">User</td><td class="system-value">fixture-user</td></tr>',
    )
    .replace(/(<meta name="csrf-token" content=")[^"]*(">)/, '$1fixture-csrf-token$2')
    .replaceAll(/https:\/\/browser\.geekbench\.com\/user\/[^"<]+/g, '/user/fixture-account')
    .replace(
      /(<a class="nav-link dropdown-toggle"[^>]*id="navbarDropdownAccount"[^>]*>)[\s\S]*?(<\/a>)/,
      '$1fixture-account$2',
    );
}

const expectedInputs = [
  ...PAYLOADS.map((filename) => join(ROOT, 'temp', filename)),
  ...Object.keys(HTML_FIXTURES).map((filename) => join(ROOT, 'temp', filename)),
];
const missingInputs: string[] = [];
for (const input of expectedInputs) {
  if (!(await Bun.file(input).exists())) missingInputs.push(input);
}
if (missingInputs.length > 0) {
  throw new Error(`Missing private fixture inputs:\n${missingInputs.join('\n')}`);
}

await mkdir(PAYLOAD_OUTPUT, { recursive: true });
await mkdir(HTML_OUTPUT, { recursive: true });

for (const filename of PAYLOADS) {
  const input = join(ROOT, 'temp', filename);
  const payload = (await Bun.file(input).json()) as Payload;
  const output = join(PAYLOAD_OUTPUT, basename(filename));
  await Bun.write(output, `${JSON.stringify(sanitizedPayload(payload))}\n`);
}

for (const [inputName, outputName] of Object.entries(HTML_FIXTURES)) {
  const html = await Bun.file(join(ROOT, 'temp', inputName)).text();
  await Bun.write(join(HTML_OUTPUT, outputName), sanitizedHtml(html));
}
