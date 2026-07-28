// benchmarks.ts

import type { Instruction } from './instructions';
import { instructionsByName } from './instructions';

export interface Benchmark {
  /**
   * Documentation only: what the workload does, and why the mapping below is
   * plausible. Not rendered — the workload's display name is the record key,
   * which is also how Geekbench's page HTML identifies it.
   */
  description: string;
  /** Names from `instructionsByName` that this workload is known to use. */
  instructions: string[];
}

/**
 *  Based on: https://www.geekbench.com/doc/geekbench6-benchmark-internals.pdf
 *  AMX support confirmed here: http://support.primatelabs.com/discussions/geekbench/85341-does-geekbench-take-advantage-of-intels-amx-instructions
 *
 *  RISC-V dibits https://www.reddit.com/r/RISCV/comments/1ic58jw/geekbench_64_released_with_support_for_riscv_rvv/
 */
export const BENCHMARKS_V6: Record<string, Benchmark> = {
  'File Compression': {
    description: 'Compresses and encrypts files',
    instructions: ['AESNI', 'VAES', 'SHANI', 'AES', 'SHA1'],
  },
  Navigation: {
    description: 'Navigation computation workload',
    instructions: [],
  },
  'HTML5 Browser': {
    description: 'Web browser rendering benchmark',
    instructions: [],
  },
  'PDF Renderer': {
    description: 'PDF document rendering',
    instructions: [],
  },
  'Photo Library': {
    description: 'Photo organization with ML-based features',
    instructions: ['AVX-VNNI', 'AVX512-VNNI', 'AMX', 'NEON-DOTPROD', 'I8MM', 'SME', 'SME2'],
  },
  Clang: {
    description: 'Compiler benchmark',
    instructions: [],
  },
  'Text Processing': {
    description: 'Text manipulation with encryption',
    instructions: ['AESNI', 'VAES', 'AES'],
  },
  'Asset Compression': {
    description: 'Asset compression workload',
    instructions: [],
  },
  'Object Detection': {
    description: 'ML-based object detection',
    instructions: ['AVX-VNNI', 'AVX512-VNNI', 'AMX', 'NEON-DOTPROD', 'I8MM', 'SME', 'SME2'],
  },
  'Background Blur': {
    description: 'Image processing with blur effects',
    instructions: ['AVX', 'AVX2', 'AVX512', 'NEON', 'SME', 'SME2'],
  },
  'Horizon Detection': {
    description: 'Computer vision horizon detection',
    instructions: [],
  },
  'Object Remover': {
    description: 'AI-based object removal from images',
    instructions: [],
  },
  HDR: {
    description: 'High Dynamic Range processing',
    instructions: [],
  },
  'Photo Filter': {
    description: 'Apply filters to photos',
    instructions: ['AVX2', 'NEON', 'NEON-FP16'],
  },
  'Ray Tracer': {
    description: 'Ray tracing rendering',
    instructions: [],
  },
  'Structure from Motion': {
    description: '3D reconstruction from images',
    instructions: ['AVX2', 'NEON', 'NEON-FP16'],
  },
};

export function getV6SupportedInstructions(
  benchmarkName: string,
  supportedInstructions: Set<string>,
): Instruction[] {
  const benchmark = BENCHMARKS_V6[benchmarkName];
  return getSupportedInstructions(benchmark, supportedInstructions);
}

export function getSupportedInstructions(
  benchmark: Benchmark | undefined,
  supportedInstructions: Set<string>,
): Instruction[] {
  if (!benchmark || !benchmark.instructions?.length) {
    return [];
  }

  const matchedInstructionNames = new Set(
    benchmark.instructions.filter((instruction) => supportedInstructions.has(instruction)),
  );
  const supportedArray = Array.from(supportedInstructions);

  if (
    benchmark.instructions.includes('SME') &&
    supportedArray.some((inst) => inst === 'SME2' || inst.startsWith('SME-'))
  ) {
    matchedInstructionNames.add('SME');
  }

  if (
    benchmark.instructions.includes('AMX') &&
    supportedArray.some((inst) => inst.includes('AMX'))
  ) {
    matchedInstructionNames.add('AMX');
  }

  if (
    benchmark.instructions.includes('AVX512') &&
    supportedArray.some(
      (inst) => !inst.includes('VNNI') && (inst.startsWith('AVX512') || inst.startsWith('AVX-512')),
    )
  ) {
    matchedInstructionNames.add('AVX-512');
  }

  return Array.from(matchedInstructionNames)
    .map((instruction) => instructionsByName[instruction])
    .filter(Boolean);
}
