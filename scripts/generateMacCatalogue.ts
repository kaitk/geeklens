import { parseHTML } from 'linkedom';
import { parseScoreReferenceDocument } from '../src/geekbench/scoreReferenceParser';

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
  const sourceUrl = URL.canParse(source) ? source : DEFAULT_SOURCES[0];

  const scores = parseScoreReferenceDocument(document as unknown as Document, 'mac-family');
  if (!scores)
    throw new Error(`Mac catalogue source is not a valid Geekbench 7 snapshot: ${source}`);

  for (const score of scores) {
    const row = Array.from(document.querySelectorAll('#family-64-single tbody tr')).find(
      (candidate) => {
        const href = candidate.querySelector('td.name a')?.getAttribute('href');
        return href ? new URL(href, sourceUrl).pathname.replace(/\/$/, '') === score.path : false;
      },
    );
    const link = row?.querySelector<HTMLAnchorElement>('td.name a[href*="/macs/"]');
    const description = row
      ?.querySelector('.description')
      ?.textContent?.trim()
      .replaceAll(/\s+/g, ' ');
    const key = score.path.split('/').at(-1);
    const deviceName = link?.textContent?.trim().replaceAll(/\s+/g, ' ');
    if (!key || !deviceName || !description) {
      throw new Error(`Could not read a Mac identity for ${score.path} from ${source}`);
    }
    if (!description.startsWith('Apple ')) continue;

    const processor = description?.match(/^(Apple .+?)\s+@/i)?.[1];
    const cpuCores = Number(
      description?.match(/\((\d+) CPU cores?/)?.[1] ?? description?.match(/\((\d+) cores?/)?.[1],
    );
    const gpuCores = Number(description?.match(/(\d+) GPU cores?/)?.[1]);
    if (!processor || !Number.isInteger(cpuCores)) {
      throw new Error(`Could not build a Mac identity for ${score.path} from ${source}`);
    }

    entries.set(key, {
      key: `mac-${key}`,
      displayName: `${deviceName} — ${processor}`,
      vendor: 'apple',
      architecture: 'arm',
      pageUrl: `https://browser.geekbench.com${score.path}`,
      processorPaths: [],
      macPaths: [score.path],
      aliases: [],
      requiredConfiguration: {
        physicalCores: cpuCores,
        ...(Number.isInteger(gpuCores) ? { gpuCores } : {}),
      },
    });
  }
}

const sortedEntries = [...entries.values()].toSorted((left, right) =>
  String(left.key).localeCompare(String(right.key), 'en'),
);
const generated = `/** Generated from the Geekbench 7 Mac benchmark family tables.\n * Source capture and provenance are documented in processorCatalogue.ts.\n * Regenerate with scripts/generateMacCatalogue.ts; do not edit by hand.\n */\nexport const GENERATED_MAC_IDENTITIES = ${JSON.stringify(sortedEntries, null, 2)} as const;\n`;
await Bun.write(outputPath, generated);
console.log(`Wrote ${entries.size} Mac identities from ${sources.join(', ')} to ${outputPath}`);
