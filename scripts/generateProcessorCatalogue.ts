import { parseHTML } from 'linkedom';

const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (!inputPath || !outputPath) {
  throw new Error('Usage: bun scripts/generateProcessorCatalogue.ts <chart.html> <output.ts>');
}

const html = await Bun.file(inputPath).text();
const document = parseHTML(html).document;
const entries = new Map<string, Record<string, unknown>>();

for (const [tableId, scoreKey] of [
  ['single-core', 'singleCore'],
  ['multi-core', 'multiCore'],
] as const) {
  for (const row of document.querySelectorAll(`#${tableId} tbody tr`)) {
    const link = row.querySelector<HTMLAnchorElement>('td.name a[href*="/processors/"]');
    if (!link) continue;
    const url = new URL(link.href);
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

const generated = `/** Generated from the Geekbench 7 Processor Benchmark Chart.\n s* Source capture and provenance are documented in processorCatalogue.ts.\n * Regenerate with scripts/generateProcessorCatalogue.ts; do not edit by hand.\n */\nexport const GENERATED_PROCESSOR_IDENTITIES = ${JSON.stringify([...entries.values()], null, 2)} as const;\n`;
await Bun.write(outputPath, generated);
console.log(`Wrote ${entries.size} processor identities to ${outputPath}`);
