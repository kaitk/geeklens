import { describe, expect, test } from 'bun:test';
import { extractResultMetadata } from '../geekbench/resultPayload';
import { processorPresentation } from './processorPresentation';

describe('processorPresentation', () => {
  test('removes legal markers and the separately badged vendor', () => {
    expect(processorPresentation('Intel(R) Core(TM) Ultra 9 290K Plus', 'intel', 24)).toEqual({
      name: 'Core Ultra 9 290K Plus',
      status: null,
    });
    expect(
      processorPresentation('Snapdragon® X Elite - Qualcomm Oryon™ CPU', 'qualcomm', 12),
    ).toEqual({ name: 'Snapdragon X Elite - Qualcomm Oryon CPU', status: null });
  });

  test('removes a generic core-count suffix only when the payload corroborates it', () => {
    expect(processorPresentation('AMD Ryzen 9 9950X3D2 16-Core Processor', 'amd', 16)).toEqual({
      name: 'Ryzen 9 9950X3D2',
      status: null,
    });
    expect(processorPresentation('AMD Example 32-Core Processor', 'amd', 16).name).toBe(
      'Example 32-Core Processor',
    );
    expect(processorPresentation('AMD Example 16-Core Processor', 'amd', null).name).toBe(
      'Example 16-Core Processor',
    );
  });

  test('extracts engineering-sample status without changing its identifier', () => {
    expect(processorPresentation('AMD Eng Sample: 100-000001535-05', 'amd', 128)).toEqual({
      name: '100-000001535-05',
      status: 'engineering-sample',
    });
    expect(
      processorPresentation('AMD Engineering Sample: 100-000000425_37/24_N @ 3.72 GHz', 'amd', 16),
    ).toEqual({
      name: '100-000000425_37/24_N @ 3.72 GHz',
      status: 'engineering-sample',
    });
  });

  test('presents the captured engineering-sample payload without inventing a product name', async () => {
    const payload = await Bun.file(
      new URL('../geekbench/__fixtures__/6312.gb6.json', import.meta.url),
    ).json();
    const metadata = extractResultMetadata(payload, 7);

    expect(
      processorPresentation(
        metadata?.processor.name?.value ?? '',
        metadata?.processor.vendor.value ?? 'unknown',
        metadata?.topology.physicalCores?.value ?? null,
      ),
    ).toEqual({ name: '100-000001535-05', status: 'engineering-sample' });
  });

  test('does not interpret sample wording outside the explicit prefix form', () => {
    expect(processorPresentation('AMD Sample Processor', 'amd', 8)).toEqual({
      name: 'Sample Processor',
      status: null,
    });
  });
});
