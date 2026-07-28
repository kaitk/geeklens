import { describe, expect, test } from 'bun:test';
import { getV6SupportedInstructions } from './benchmarkMap';

function instructionNames(benchmark: string, supported: string[]) {
  return getV6SupportedInstructions(benchmark, new Set(supported)).map(
    (instruction) => instruction.name,
  );
}

describe('getV6SupportedInstructions', () => {
  test('returns exact instruction matches in benchmark order', () => {
    expect(instructionNames('File Compression', ['SHA1', 'AESNI'])).toEqual(['AESNI', 'SHA1']);
  });

  test('maps AVX-512 feature flags to the generic workload badge', () => {
    expect(instructionNames('Background Blur', ['AVX512-F'])).toEqual(['AVX-512']);
    expect(instructionNames('Background Blur', ['AVX512-VNNI'])).toEqual([]);
  });

  test('maps AMX and SME variants without duplicate badges', () => {
    expect(instructionNames('Photo Library', ['AMX'])).toEqual(['AMX']);
    expect(instructionNames('Photo Library', ['AMX-INT8'])).toEqual(['AMX']);
    expect(instructionNames('Photo Library', ['SME', 'SME2'])).toEqual(['SME', 'SME2']);
  });

  test('returns no badges for unknown benchmarks or unaccelerated workloads', () => {
    expect(instructionNames('Unknown Benchmark', ['AVX2'])).toEqual([]);
    expect(instructionNames('Navigation', ['AVX2'])).toEqual([]);
  });
});
