import { getSupportedInstructions, type Benchmark } from './benchmarkMap';
import type { Instruction } from './instructions';

export type MappingConfidence = 'confirmed' | 'inferred';

export interface Geekbench7Benchmark extends Benchmark {
  confidence: MappingConfidence;
  confidenceNote: string;
}

/**
 * Geekbench 7 does not currently have a public benchmark-internals document.
 * Keep this map deliberately narrow: unchanged names alone are not enough.
 *
 * Sources:
 * - https://www.geekbench.com/doc/geekbench7-cpu-workloads.pdf
 * - https://www.geekbench.com/doc/geekbench6-benchmark-internals.pdf
 */
export const BENCHMARKS_V7: Record<string, Geekbench7Benchmark> = {
  'File Compression': {
    description: 'Compresses LZ4, zlib, and Zstandard archives and verifies them with SHA1',
    instructions: ['SHANI', 'SHA1'],
    confidence: 'inferred',
    confidenceNote:
      'Inferred: Geekbench 7 documents SHA1 verification, but does not confirm hardware SHA dispatch.',
  },
  'Photo Library': {
    description: 'Imports and tags photos using a MobileNetV1 SSD model',
    instructions: ['AVX-VNNI', 'AVX512-VNNI', 'AMX', 'NEON-DOTPROD', 'I8MM', 'SME', 'SME2'],
    confidence: 'inferred',
    confidenceNote:
      'Inferred: Geekbench 7 retains MobileNetV1 SSD, but does not document model quantization or ISA dispatch.',
  },
  'Structure from Motion': {
    description: 'Constructs 3D geometry from nine 2D images',
    instructions: ['AVX2', 'NEON', 'NEON-FP16'],
    confidence: 'inferred',
    confidenceNote:
      'Inferred: Geekbench 7 describes the same nine-image task, but does not document ISA dispatch.',
  },
};

export interface Geekbench7InstructionMatch {
  instructions: Instruction[];
  confidence: MappingConfidence;
  confidenceNote: string;
}

export function getV7SupportedInstructions(
  benchmarkName: string,
  supportedInstructions: Set<string>,
): Geekbench7InstructionMatch | null {
  const benchmark = BENCHMARKS_V7[benchmarkName];
  if (!benchmark) return null;

  const instructions = getSupportedInstructions(benchmark, supportedInstructions);
  if (instructions.length === 0) return null;

  return {
    instructions,
    confidence: benchmark.confidence,
    confidenceNote: benchmark.confidenceNote,
  };
}
