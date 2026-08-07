import { parseHTML } from 'linkedom';

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

if (!document.body.textContent?.includes('Geekbench 7')) {
  throw new Error('Processor catalogue source does not identify itself as Geekbench 7');
}

for (const [tableId, scoreKey] of [
  ['single-core', 'singleCore'],
  ['multi-core', 'multiCore'],
] as const) {
  for (const row of document.querySelectorAll(`#${tableId} tbody tr`)) {
    const link = row.querySelector<HTMLAnchorElement>('td.name a[href*="/processors/"]');
    if (!link) continue;
    const url = new URL(link.href, DEFAULT_SOURCE);
    const path = url.pathname.replace(/\/$/, '');
    const key = path.split('/').at(-1);
    const displayName = link.textContent?.trim().replaceAll(/\s+/g, ' ');
    const iconClass = row.querySelector('.device-icon')?.className ?? '';
    const vendor = iconClass.includes('qualcomm')
      ? 'qualcomm'
      : iconClass.includes('amd')
        ? 'amd'
        : iconClass.includes('intel')
          ? 'intel'
          : null;
    if (!key || !displayName || !vendor) continue;

    const score = Number(row.querySelector('td.score')?.textContent?.trim());
    if (!Number.isFinite(score) || score <= 0) continue;
    entries.set(key, {
      ...(entries.get(key) ?? {
        key,
        displayName,
        vendor,
        architecture: vendor === 'qualcomm' ? 'arm' : 'x86',
        pageUrl: `https://browser.geekbench.com${path}`,
        processorPaths: [path],
      }),
      [scoreKey]: score,
    });
  }
}

const generated = `/** Generated from the Geekbench 7 Processor Benchmark Chart.\n * Source capture and provenance are documented in processorCatalogue.ts.\n * Regenerate with scripts/generateProcessorCatalogue.ts; do not edit by hand.\n */\nexport const GENERATED_PROCESSOR_IDENTITIES = ${JSON.stringify([...entries.values()], null, 2)} as const;\n`;
await Bun.write(outputPath, generated);
console.log(`Wrote ${entries.size} processor identities from ${source} to ${outputPath}`);
