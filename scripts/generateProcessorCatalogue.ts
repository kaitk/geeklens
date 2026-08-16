import { parseHTML } from 'linkedom';
import { parseScoreReferenceDocument } from '../src/geekbench/scoreReferenceParser';

const DEFAULT_SOURCE = 'https://browser.geekbench.com/processor-benchmarks';
const DEFAULT_OUTPUT = 'src/catalogue/generated/processorCatalogue.generated.ts';

async function readSource(source: string): Promise<string> {
  if (!URL.canParse(source)) return Bun.file(source).text();

  const response = await fetch(source);
  if (!response.ok) throw new Error(`Could not fetch ${source}: HTTP ${response.status}`);
  return response.text();
}

const source = process.argv[2] ?? DEFAULT_SOURCE;
const outputPath = process.argv[3] ?? DEFAULT_OUTPUT;
const html = await readSource(source);
const document = parseHTML(html).document;
const entries = new Map<string, Record<string, unknown>>();
const scores = parseScoreReferenceDocument(document as unknown as Document, 'processor');
if (!scores) throw new Error('Processor catalogue source is not a valid Geekbench 7 snapshot');

for (const score of scores) {
  const row = Array.from(document.querySelectorAll('#single-core tbody tr')).find((candidate) => {
    const href = candidate.querySelector('td.name a')?.getAttribute('href');
    return href ? new URL(href, DEFAULT_SOURCE).pathname.replace(/\/$/, '') === score.path : false;
  });
  const link = row?.querySelector<HTMLAnchorElement>('td.name a[href*="/processors/"]');
  const key = score.path.split('/').at(-1);
  const displayName = link?.textContent?.trim().replaceAll(/\s+/g, ' ');
  const iconClass = row?.querySelector('.device-icon')?.className ?? '';
  const vendor = iconClass.includes('qualcomm')
    ? 'qualcomm'
    : iconClass.includes('amd')
      ? 'amd'
      : iconClass.includes('intel')
        ? 'intel'
        : null;
  if (!key || !displayName || !vendor) continue;
  entries.set(key, {
    key,
    displayName,
    vendor,
    architecture: vendor === 'qualcomm' ? 'arm' : 'x86',
    pageUrl: `https://browser.geekbench.com${score.path}`,
    processorPaths: [score.path],
  });
}

const generated = `/** Generated from the Geekbench 7 Processor Benchmark Chart.\n * Source capture and provenance are documented in processorCatalogue.ts.\n * Regenerate with scripts/generateProcessorCatalogue.ts; do not edit by hand.\n */\nexport const GENERATED_PROCESSOR_IDENTITIES = ${JSON.stringify([...entries.values()], null, 2)} as const;\n`;
await Bun.write(outputPath, generated);
console.log(`Wrote ${entries.size} processor identities from ${source} to ${outputPath}`);
