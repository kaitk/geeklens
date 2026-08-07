import { describe, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import {
  extractComparisonProcessorLinks,
  extractProcessorLinks,
  mergeProcessorLinks,
} from './processorLinks';

async function fixture(name: string): Promise<Document> {
  const html = await Bun.file(new URL(`../content/__fixtures__/${name}`, import.meta.url)).text();
  return parseHTML(html).document as unknown as Document;
}

describe('extractProcessorLinks', () => {
  test('extracts the canonical processor path from Geekbench 5 markup', async () => {
    const document = await fixture('geekbench5-single.html');

    expect(extractProcessorLinks(document)).toEqual({
      processorPath: '/processors/amd-ryzen-7-7700x',
      macPath: null,
    });
  });

  test('extracts canonical processor and Mac paths from the linked M4 capture', async () => {
    const document = await fixture('geekbench7-mac-linked.html');

    expect(extractProcessorLinks(document)).toEqual({
      processorPath: '/processors/apple-m4',
      macPath: '/macs/mac-mini-2024-10c-cpu',
    });
  });

  test('returns explicit absence for the unlinked M5 capture', async () => {
    const document = await fixture('geekbench7-mac-unlinked.html');

    expect(extractProcessorLinks(document)).toEqual({ processorPath: null, macPath: null });
  });

  test('ignores off-site and noncanonical links', () => {
    const document = parseHTML(`
      <table class="system-table"><tbody><tr><td>
        <a href="https://example.com/processors/fake">Fake</a>
        <a href="/processors/valid-cpu/results">Results</a>
      </td></tr></tbody></table>
    `).document as unknown as Document;

    expect(extractProcessorLinks(document)).toEqual({ processorPath: null, macPath: null });
  });

  test('gives newly discovered explicit links precedence over cached values', () => {
    expect(
      mergeProcessorLinks(
        { processorPath: '/processors/old', macPath: '/macs/retained' },
        { processorPath: '/processors/current', macPath: null },
      ),
    ).toEqual({
      processorPath: '/processors/current',
      macPath: '/macs/retained',
    });
  });
});

describe('extractComparisonProcessorLinks', () => {
  test('maps primary and baseline links by system-table column', () => {
    const document = parseHTML(`
      <table class="system-information"><tbody>
        <tr><td>Model</td>
          <td><a href="/macs/primary-mac">Primary Mac</a></td>
          <td>Baseline model</td>
        </tr>
        <tr><td>Processor</td>
          <td><a href="/processors/primary-cpu">Primary CPU</a></td>
          <td><a href="https://browser.geekbench.com/processors/baseline-cpu">Baseline CPU</a></td>
        </tr>
      </tbody></table>
    `).document as unknown as Document;

    expect(extractComparisonProcessorLinks(document)).toEqual({
      primary: {
        processorPath: '/processors/primary-cpu',
        macPath: '/macs/primary-mac',
      },
      baseline: {
        processorPath: '/processors/baseline-cpu',
        macPath: null,
      },
    });
  });
});
