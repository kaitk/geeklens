import { parseHTML } from 'linkedom';

const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (!inputPath || !outputPath) {
  throw new Error('Usage: bun scripts/generateMacCatalogue.ts <mac-page.html> <output.ts>');
}

const html = await Bun.file(inputPath).text();
const document = parseHTML(html).document;
const entries = new Map<string, Record<string, unknown>>();

for (const row of document.querySelectorAll('#family-64-single tbody tr')) {
  const link = row.querySelector<HTMLAnchorElement>('td.name a[href*="/macs/"]');
  const description = row
    .querySelector('.description')
    ?.textContent?.trim()
    .replaceAll(/\s+/g, ' ');
  if (!link || !description) continue;

  const url = new URL(link.href);
  const path = url.pathname.replace(/\/$/, '');
  const key = path.split('/').at(-1);
  const deviceName = link.textContent?.trim().replaceAll(/\s+/g, ' ');
  const processor = description.match(/^(Apple .+?)\s+@/i)?.[1];
  const cpuCores = Number(
    description.match(/\((\d+) CPU cores?/)?.[1] ?? description.match(/\((\d+) cores?/)?.[1],
  );
  const gpuCores = Number(description.match(/(\d+) GPU cores?/)?.[1]);
  if (!key || !deviceName || !processor || !Number.isInteger(cpuCores)) continue;

  entries.set(key, {
    key: `mac-${key}`,
    displayName: `${deviceName} — ${processor}`,
    vendor: 'apple',
    architecture: 'arm',
    pageUrl: `https://browser.geekbench.com${path}`,
    processorPaths: [],
    macPaths: [path],
    aliases: [processor],
    requiredConfiguration: {
      physicalCores: cpuCores,
      ...(Number.isInteger(gpuCores) ? { gpuCores } : {}),
    },
  });
}

const generated = `/** Generated from the Geekbench 7 Mac benchmark family table.\n * Source capture and provenance are documented in processorCatalogue.ts.\n * Regenerate with scripts/generateMacCatalogue.ts; do not edit by hand.\n */\nexport const GENERATED_MAC_IDENTITIES = ${JSON.stringify([...entries.values()], null, 2)} as const;\n`;
await Bun.write(outputPath, generated);
console.log(`Wrote ${entries.size} Mac identities to ${outputPath}`);
