// benchmarks.ts

import type { Instruction } from './instructions';
import { instructionsByName } from './instructions';

export type BenchmarkName = keyof typeof BENCHMARKS_V6;

export interface Benchmark {
  name: string;
  category: string;
  description: string;
  instructions: string[]; // References to INSTRUCTIONS keys
}

export const BENCHMARKS_V6: Record<string, Benchmark> = {
  "File Compression": {
    name: "File Compression",
    category: "Cryptographic",
    description: "Compresses and encrypts files",
    instructions: ['AES-NI', 'VAES', 'SHA-NI', 'ARMv8 AES', 'ARMv8 SHA1']
  },
  "Navigation": {
    name: "Navigation",
    category: "General",
    description: "Navigation computation workload",
    instructions: []
  },
  "HTML5 Browser": {
    name: "HTML5 Browser",
    category: "General",
    description: "Web browser rendering benchmark",
    instructions: []
  },
  "PDF Renderer": {
    name: "PDF Renderer",
    category: "General",
    description: "PDF document rendering",
    instructions: []
  },
  "Photo Library": {
    name: "Photo Library",
    category: "AI/ML",
    description: "Photo organization with ML-based features",
    instructions: ['AVX-VNNI', 'AVX512-VNNI', 'AMX', 'DOTPROD', 'I8MM', 'SME']
  },
  "Clang": {
    name: "Clang",
    category: "General",
    description: "Compiler benchmark",
    instructions: []
  },
  "Text Processing": {
    name: "Text Processing",
    category: "Cryptographic",
    description: "Text manipulation with encryption",
    instructions: ['AES-NI', 'VAES', 'ARMv8 AES']
  },
  "Asset Compression": {
    name: "Asset Compression",
    category: "General",
    description: "Asset compression workload",
    instructions: []
  },
  "Object Detection": {
    name: "Object Detection",
    category: "AI/ML",
    description: "ML-based object detection",
    instructions: ['AVX-VNNI', 'AVX512-VNNI', 'AMX', 'DOTPROD', 'I8MM', 'SME']
  },
  "Background Blur": {
    name: "Background Blur",
    category: "Image Processing",
    description: "Image processing with blur effects",
    instructions: ['AVX', 'AVX2', 'AVX-512', 'NEON', 'SME']
  },
  "Horizon Detection": {
    name: "Horizon Detection",
    category: "Image Processing",
    description: "Computer vision horizon detection",
    instructions: []
  },
  "Object Remover": {
    name: "Object Remover",
    category: "Image Processing",
    description: "AI-based object removal from images",
    instructions: []
  },
  "HDR": {
    name: "HDR",
    category: "Image Processing",
    description: "High Dynamic Range processing",
    instructions: []
  },
  "Photo Filter": {
    name: "Photo Filter",
    category: "Image Processing",
    description: "Apply filters to photos",
    instructions: ['AVX2', 'NEON', 'NEON-FP16']
  },
  "Ray Tracer": {
    name: "Ray Tracer",
    category: "Graphics",
    description: "Ray tracing rendering",
    instructions: []
  },
  "Structure from Motion": {
    name: "Structure from Motion",
    category: "Computer Vision",
    description: "3D reconstruction from images",
    instructions: ['AVX2', 'NEON', 'NEON-FP16']
  }
};


/**
 * Get instructions for a benchmark
 */
export function getBenchmarkInstructions(benchmarkName: string): Instruction[] {
  const benchmark = BENCHMARKS_V6[benchmarkName];
  if (!benchmark) return [];

  return benchmark.instructions
      .map(instrName => instructionsByName[instrName])
      .filter(Boolean);
}
