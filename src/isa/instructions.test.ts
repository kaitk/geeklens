import { describe, expect, test } from 'bun:test';
import {
  extractIndividualInstructions,
  instructionsByCategory,
  instructionsByName,
} from './instructions';

describe('instruction catalog', () => {
  test('contains metadata for benchmark and raw system variants', () => {
    expect(instructionsByName['AVX2'].fullName).toBe('Advanced Vector Extensions 2');
    expect(instructionsByName['AVX512-F'].category).toBe('SIMD_MODERN_WIDE');
    expect(instructionsByName.F16C.category).toBe('SIMD_MODERN');
    expect(instructionsByName['SME-I8I32'].architecture).toBe('ARM');
  });

  test('groups catalog entries by category', () => {
    const crypto = instructionsByCategory('CRYPTO');

    expect(crypto.AESNI).toBe(instructionsByName.AESNI);
    expect(crypto.AVX2).toBeUndefined();
  });
});

describe('extractIndividualInstructions', () => {
  test('normalizes case and arbitrary whitespace', () => {
    expect(extractIndividualInstructions(' avx2\nAESNI\tSme2 ')).toEqual(
      new Set(['AVX2', 'AESNI', 'SME2']),
    );
  });

  test('handles missing input', () => {
    expect(extractIndividualInstructions(null)).toEqual(new Set());
  });
});
