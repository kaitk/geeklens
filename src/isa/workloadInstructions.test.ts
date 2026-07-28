import { describe, expect, test } from 'bun:test';
import { workloadInstructions } from './workloadInstructions';

const names = (result: { instructions: { name: string }[] }) =>
  result.instructions.map((instruction) => instruction.name);

describe('workloadInstructions', () => {
  test('resolves Geekbench 6 mappings without a confidence note', () => {
    const result = workloadInstructions(6, 'File Compression', new Set(['AESNI', 'SHA1']));

    expect(names(result)).toEqual(['AESNI', 'SHA1']);
    expect(result.confidenceNote).toBeUndefined();
  });

  test('always carries the confidence note for inferred Geekbench 7 mappings', () => {
    const result = workloadInstructions(7, 'Photo Library', new Set(['AVX512-VNNI']));

    expect(names(result)).toEqual(['AVX512-VNNI']);
    expect(result.confidenceNote).toContain('Inferred');
  });

  test('does not apply Geekbench 6 mappings to Geekbench 7 workloads', () => {
    // Text Processing is deliberately unmapped in v7: its v6 AES association
    // came from an encrypted filesystem the v7 workload document omits.
    expect(names(workloadInstructions(6, 'Text Processing', new Set(['AESNI'])))).toEqual([
      'AESNI',
    ]);
    expect(names(workloadInstructions(7, 'Text Processing', new Set(['AESNI'])))).toEqual([]);
  });

  test('returns no instructions for workloads a generation does not map', () => {
    expect(names(workloadInstructions(7, 'Photo Editor', new Set(['AVX2'])))).toEqual([]);
    expect(names(workloadInstructions(6, 'Unknown Benchmark', new Set(['AVX2'])))).toEqual([]);
  });
});
