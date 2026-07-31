import { describe, expect, test } from 'bun:test';
import { BENCHMARKS_V7, getV7SupportedInstructions } from './benchmarkMapV7';

describe('Geekbench 7 benchmark mappings', () => {
  test('keeps the provisional map deliberately narrow', () => {
    expect(Object.keys(BENCHMARKS_V7)).toEqual([
      'File Compression',
      'Photo Library',
      'Structure from Motion',
      'Ray Tracer',
      'Game Physics',
    ]);
    expect(BENCHMARKS_V7['File Compression'].instructions).not.toContain('AESNI');
  });

  test('resolves no match for suspected workloads regardless of reported support', () => {
    for (const name of ['Ray Tracer', 'Game Physics']) {
      // SSE2 and NEON are reported by every x86 and ARM result respectively, so
      // badging the library minimums would discriminate nothing. With nothing
      // specific to name, these render nothing rather than a lone warning.
      expect(getV7SupportedInstructions(name, new Set(['SSE2', 'AVX2', 'NEON']))).toBeNull();
      expect(getV7SupportedInstructions(name, new Set())).toBeNull();
    }
  });

  test('retains suspected notes as documentation even though they never render', () => {
    for (const name of ['Ray Tracer', 'Game Physics']) {
      expect(BENCHMARKS_V7[name].confidence).toBe('suspected');
      expect(BENCHMARKS_V7[name].confidenceNote).toContain('Likely SIMD-accelerated');
    }
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
