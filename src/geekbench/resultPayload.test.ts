import { describe, expect, test } from 'bun:test';
import { extractInstructionSetsFromPayload } from './resultPayload';

describe('extractInstructionSetsFromPayload', () => {
  test('extracts metric 20000 from a matching Geekbench payload', () => {
    const payload = {
      document_version: 7,
      metrics: [
        { id: 1, value: 'Windows AVX2' },
        { id: 20000, value: 'sse2 aesni avx2' },
      ],
    };

    expect(extractInstructionSetsFromPayload(payload, 7)).toBe('sse2 aesni avx2');
  });

  test('accepts numeric strings but rejects the wrong generation', () => {
    const payload = {
      document_version: '7',
      metrics: [{ id: '20000', value: ' avx2 ' }],
    };

    expect(extractInstructionSetsFromPayload(payload, 7)).toBe('avx2');
    expect(extractInstructionSetsFromPayload(payload, 6)).toBeNull();
  });

  test('rejects missing, empty, and malformed metrics', () => {
    expect(extractInstructionSetsFromPayload({ metrics: [] })).toBeNull();
    expect(extractInstructionSetsFromPayload({ metrics: [{ id: 20000, value: ' ' }] })).toBeNull();
    expect(extractInstructionSetsFromPayload(null)).toBeNull();
  });
});
