import { parseHTML } from 'linkedom';

const DEFAULT_SOURCES = [
  'https://browser.geekbench.com/macs/mac-mini-2024-12c-cpu',
  'https://browser.geekbench.com/macs/macbook-pro-14-inch-2024-12c-cpu',
] as const;
const DEFAULT_OUTPUT = 'src/catalogue/generated/macCatalogue.generated.ts';

async function readSource(source: string): Promise<string> {
  if (!URL.canParse(source)) return Bun.file(source).text();

  const response = await fetch(source);
  if (!response.ok) throw new Error(`Could not fetch ${source}: HTTP ${response.status}`);
  return response.text();
}

const sources = process.argv[2] ? [process.argv[2]] : DEFAULT_SOURCES;
const outputPath = process.argv[3] ?? DEFAULT_OUTPUT;
const entries = new Map<string, Record<string, unknown>>();

for (const source of sources) {
  const html = await readSource(source);
  const document = parseHTML(html).document;

  const pageText = document.body.textContent?.replaceAll(/\s+/g, ' ') ?? '';
  if (!pageText.includes('Geekbench 7 CPU scores are calibrated')) {
    throw new Error(`Mac catalogue source is not in the Geekbench 7 chart context: ${source}`);
  }

  for (const [tableId, scoreKey] of [
    ['family-64-single', 'singleCore'],
    ['family-64-multi', 'multiCore'],
  ] as const) {
    for (const row of document.querySelectorAll(`#${tableId} tbody tr`)) {
      const link = row.querySelector<HTMLAnchorElement>('td.name a[href*="/macs/"]');
      const description = row
        .querySelector('.description')
        ?.textContent?.trim()
        .replaceAll(/\s+/g, ' ');
      if (!link || !description) continue;

      const url = new URL(link.href, source);
      const path = url.pathname.replace(/\/$/, '');
      const key = path.split('/').at(-1);
      const deviceName = link.textContent?.trim().replaceAll(/\s+/g, ' ');
      const processor = description.match(/^(Apple .+?)\s+@/i)?.[1];
      const cpuCores = Number(
        description.match(/\((\d+) CPU cores?/)?.[1] ?? description.match(/\((\d+) cores?/)?.[1],
      );
      const gpuCores = Number(description.match(/(\d+) GPU cores?/)?.[1]);
      if (!key || !deviceName || !processor || !Number.isInteger(cpuCores)) continue;

      const score = Number(row.querySelector('td.score')?.textContent?.trim());
      if (!Number.isFinite(score) || score <= 0) continue;

      entries.set(key, {
        ...(entries.get(key) ?? {
          key: `mac-${key}`,
          displayName: `${deviceName} — ${processor}`,
          vendor: 'apple',
          architecture: 'arm',
          pageUrl: `https://browser.geekbench.com${path}`,
          processorPaths: [],
          macPaths: [path],
          aliases: [],
          requiredConfiguration: {
            physicalCores: cpuCores,
            ...(Number.isInteger(gpuCores) ? { gpuCores } : {}),
          },
        }),
        [scoreKey]: score,
      });
    }
  }
}

const generated = `/** Generated from the Geekbench 7 Mac benchmark family tables.\n * Source capture and provenance are documented in processorCatalogue.ts.\n * Regenerate with scripts/generateMacCatalogue.ts; do not edit by hand.\n */\nexport const GENERATED_MAC_IDENTITIES = ${JSON.stringify([...entries.values()], null, 2)} as const;\n`;
await Bun.write(outputPath, generated);
console.log(`Wrote ${entries.size} Mac identities from ${sources.join(', ')} to ${outputPath}`);
