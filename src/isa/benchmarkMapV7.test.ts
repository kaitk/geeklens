import { describe, expect, test } from 'bun:test';
import { BENCHMARKS_V7, getV7SupportedInstructions } from './benchmarkMapV7';

describe('Geekbench 7 benchmark mappings', () => {
  test('keeps the provisional map deliberately narrow', () => {
    expect(Object.keys(BENCHMARKS_V7)).toEqual([
      'File Compression',
      'Photo Library',
      'Structure from Motion',
    ]);
    expect(BENCHMARKS_V7['File Compression'].instructions).not.toContain('AESNI');
  });

  test('marks inherited mappings as inferred', () => {
    const match = getV7SupportedInstructions('Photo Library', new Set(['AVX512-VNNI', 'AMX-INT8']));

    expect(match?.instructions.map((instruction) => instruction.name)).toEqual([
      'AVX512-VNNI',
      'AMX',
    ]);
    expect(match?.confidence).toBe('inferred');
  });

  test('does not guess mappings for changed or new workloads', () => {
    expect(getV7SupportedInstructions('Photo Editor', new Set(['AVX2']))).toBeNull();
    expect(getV7SupportedInstructions('Video Decoder', new Set(['AVX-VNNI']))).toBeNull();
  });
});
