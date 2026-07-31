import { getSupportedInstructions, type Benchmark } from './benchmarkMap';
import type { Instruction } from './instructions';

/**
 * `suspected` workloads carry a note but no instruction names: the workload is
 * near-certainly SIMD-accelerated, yet naming extensions would be a guess. Such
 * entries keep `instructions` empty and render nothing at all; their notes exist
 * so the reasoning survives here rather than being rediscovered. Promote one to
 * `inferred` only once it can name instructions.
 */
export type MappingConfidence = 'confirmed' | 'inferred' | 'suspected';

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
  'Ray Tracer': {
    description: 'Renders a scene with Blender Cycles and Intel Embree',
    instructions: [],
    confidence: 'suspected',
    confidenceNote:
      'Likely SIMD-accelerated. Embree and Blender Cycles ship vectorized kernels with runtime dispatch, but Geekbench 7 does not document which paths run in the shipped build.',
  },
  'Game Physics': {
    description: 'Simulates rigid-body physics with Jolt Physics',
    instructions: [],
    confidence: 'suspected',
    confidenceNote:
      'Likely SIMD-accelerated. Jolt Physics requires SSE2 or NEON and can build with AVX2/AVX-512, but Geekbench 7 does not document which paths are compiled or dispatched.',
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

  // A `suspected` workload names no instructions, so it resolves to no match
  // and renders nothing. Its note is retained above as documentation of what is
  // and is not known, not as page content: a lone warning on a row with no
  // badges clutters the table without telling the reader anything actionable.
  const instructions = getSupportedInstructions(benchmark, supportedInstructions);
  if (instructions.length === 0) return null;

  return {
    instructions,
    confidence: benchmark.confidence,
    confidenceNote: benchmark.confidenceNote,
  };
}
