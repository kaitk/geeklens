import { describe, expect, test } from 'bun:test';
import { categorizeInstructionSets } from './categories';

describe('categorizeInstructionSets', () => {
  test('normalizes and categorizes representative instruction families', () => {
    const groups = categorizeInstructionSets(
      'avx512-f AVX2 F16C SSE41 AMX-INT8 NEON-DOTPROD SVE2 RVV AESNI unknown',
    );

    expect(groups.SIMD_MODERN_WIDE).toEqual(['AVX512-F', 'SVE2']);
    expect(groups.SIMD_MODERN).toEqual(['AVX2', 'F16C', 'RVV']);
    expect(groups.SIMD_LEGACY).toEqual(['SSE41']);
    expect(groups.ML).toEqual(['AMX-INT8']);
    expect(groups.SIMD_ML).toEqual(['NEON-DOTPROD']);
    expect(groups.CRYPTO).toEqual(['AESNI']);
    expect(groups.OTHER).toEqual(['UNKNOWN']);
  });

  test('accepts arbitrary whitespace and empty input', () => {
    expect(categorizeInstructionSets('AVX2\n\tAESNI').SIMD_MODERN).toEqual(['AVX2']);
    expect(categorizeInstructionSets().OTHER).toEqual([]);
  });
});
