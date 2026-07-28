// instructions.ts

export type InstructionCategory =
  | 'SIMD_MODERN_WIDE'
  | 'SIMD_MODERN'
  | 'SIMD_LEGACY'
  | 'CRYPTO'
  | 'ML'
  | 'SIMD_ML'
  | 'OTHER';

export type InstructionArchitecture = 'x86' | 'ARM' | 'RISC-V';

// used in CPU Information
export interface Instruction {
  name: string;
  fullName: string;
  description: string;
  category: InstructionCategory;
  architecture: InstructionArchitecture;
}

// Define all instructions with their properties
const instructionDefinitions: Instruction[] = [
  // Vector Extensions (Blues) - SSE Type
  {
    name: 'SSE',
    fullName: 'Streaming SIMD Extensions',
    description: 'Legacy x86 vector instructions (128-bit)',
    category: 'SIMD_LEGACY',
    architecture: 'x86',
  },

  // Vector Extensions - AVX Type
  {
    name: 'AVX',
    fullName: 'Advanced Vector Extensions',
    description: 'Generic floating-point 256-bit SIMD instruction set',
    category: 'SIMD_MODERN',
    architecture: 'x86',
  },
  {
    name: 'AVX2',
    fullName: 'Advanced Vector Extensions 2',
    description:
      'Generic 256-bit SIMD instruction set extending AVX with integer operations and new instructions',
    category: 'SIMD_MODERN',
    architecture: 'x86',
  },

  // Vector Extensions - AVX-512 Type
  {
    name: 'AVX-512',
    fullName: 'AVX-512',
    description: 'Wide Generic 512-bit SIMD instruction set',
    category: 'SIMD_MODERN_WIDE',
    architecture: 'x86',
  },

  // AI Extensions - VNNI Type
  {
    name: 'AVX-VNNI',
    fullName: 'AVX Vector Neural Network Instructions',
    description:
      'x86 AI/ML acceleration (for 128 and 256 bit vectors) Accelerates quantized machine learning workloads',
    category: 'SIMD_ML',
    architecture: 'x86',
  },
  {
    name: 'AVX512-VNNI',
    fullName: 'AVX-512 Vector Neural Network Instructions',
    description:
      'x86 AI/ML acceleration (part of AVX-512) Accelerates quantized machine learning workloads',
    category: 'SIMD_ML',
    architecture: 'x86',
  },

  // Vector Extensions - NEON Type
  {
    name: 'NEON',
    fullName: 'NEON',
    description: 'Generic 128-bit SIMD instruction set',
    category: 'SIMD_MODERN',
    architecture: 'ARM',
  },
  {
    name: 'NEON-FP16',
    fullName: 'NEON-FP16',
    description: 'Generic 128-bit SIMD instruction set with support for 16-bit floats',
    category: 'SIMD_MODERN',
    architecture: 'ARM',
  },
  // RISC-V
  {
    name: 'RVV',
    fullName: 'RISC-V Vector Extension',
    description:
      'Vector length-agnostic SIMD instruction set supporting variable vector lengths from 128 to 65,536 bits',
    category: 'SIMD_MODERN',
    architecture: 'RISC-V',
  },
  {
    name: 'ZVFH',
    fullName: 'Vector Extension for Half-Precision Floating-Point',
    description:
      'RISC-V vector extension adding IEEE 754-2008 16-bit half-precision floating-point operations',
    category: 'SIMD_MODERN',
    architecture: 'RISC-V',
  },

  // SVE
  {
    name: 'SVE',
    fullName: 'Scalable Vector Extension',
    description: 'Vector length-agnostic SIMD instruction set for ARMv8-A',
    category: 'SIMD_MODERN',
    architecture: 'ARM',
  },

  {
    name: 'SVE2',
    fullName: 'Scalable Vector Extension 2',
    description: 'Enhanced vector processing capabilities for ARMv9-A',
    category: 'SIMD_MODERN',
    architecture: 'ARM',
  },

  // Matrix Extensions - SME Type
  {
    name: 'SME',
    fullName: 'Scalable Matrix Extension',
    description: 'ARM matrix processing instructions',
    category: 'ML',
    architecture: 'ARM',
  },
  {
    name: 'SME2',
    fullName: 'Scalable Matrix Extension 2',
    description: 'ARM enhanced matrix processing instructions',
    category: 'ML',
    architecture: 'ARM',
  },

  // Matrix Extensions - AMX Type
  {
    name: 'AMX',
    fullName: 'Advanced Matrix Extensions',
    description:
      'Intel matrix processing for AI/ML workloads. Accelerates machine learning on quantized networks',
    category: 'ML',
    architecture: 'x86',
  },

  // AI Extensions - DOTPROD Type
  {
    name: 'NEON-DOTPROD',
    fullName: 'Dot Product',
    description: 'ARM dot product operations for ML',
    category: 'SIMD_ML',
    architecture: 'ARM',
  },

  // AI Extensions - I8MM Type
  {
    name: 'I8MM',
    fullName: 'Int8 Matrix Multiply',
    description: 'ARM 8-bit integer matrix operations',
    category: 'ML',
    architecture: 'ARM',
  },

  // Cryptographic Extensions - AES Type
  {
    name: 'AESNI',
    fullName: 'AES New Instructions',
    description: 'Accelerates AES encryption and decryption functions',
    category: 'CRYPTO',
    architecture: 'x86',
  },
  {
    name: 'VAES',
    fullName: 'Vectorized AES',
    description: 'Vectorized AES processing multiple blocks in parallel',
    category: 'CRYPTO',
    architecture: 'x86',
  },
  {
    name: 'AES',
    fullName: 'ARMv8 AES',
    description: 'ARM hardware AES acceleration equivalent to x86 AES-NI',
    category: 'CRYPTO',
    architecture: 'ARM',
  },

  // Cryptographic Extensions - SHA Type
  {
    name: 'SHANI',
    fullName: 'SHA New Instructions',
    description: 'Hardware acceleration for SHA1/SHA256 cryptographic hash functions',
    category: 'CRYPTO',
    architecture: 'x86',
  },
  {
    name: 'SHA1',
    fullName: 'ARMv8 SHA1',
    description: 'ARM hardware SHA1 acceleration for cryptographic hashing',
    category: 'CRYPTO',
    architecture: 'ARM',
  },

  // Cryptographic Extensions - PCLMUL Type
  {
    name: 'PCLMUL',
    fullName: 'Carry-less Multiplication',
    description: 'Polynomial multiplication for GCM mode and CRC calculations',
    category: 'CRYPTO',
    architecture: 'x86',
  },
  {
    name: 'SSE2',
    fullName: 'Streaming SIMD Extensions 2',
    description:
      'Adds 128-bit vector operations for double-precision floating-point and integer data',
    category: 'SIMD_LEGACY',
    architecture: 'x86',
  },
  {
    name: 'SSE3',
    fullName: 'Streaming SIMD Extensions 3',
    description:
      'Adds horizontal arithmetic, complex-number support, and improved data conversion instructions',
    category: 'SIMD_LEGACY',
    architecture: 'x86',
  },
  {
    name: 'SSE41',
    fullName: 'Streaming SIMD Extensions 4.1',
    description: 'Adds blend, dot-product, min/max, and improved text-processing instructions',
    category: 'SIMD_LEGACY',
    architecture: 'x86',
  },
  {
    name: 'FMA3',
    fullName: 'Fused Multiply-Add 3-operand',
    description:
      'Performs multiplication and addition in one instruction with a single rounding step',
    category: 'SIMD_LEGACY',
    architecture: 'x86',
  },
  {
    name: 'F16C',
    fullName: '16-bit Floating-Point Conversion',
    description: 'Converts between half-precision and single-precision floating-point values',
    category: 'SIMD_MODERN',
    architecture: 'x86',
  },
  {
    name: 'AVX512-F',
    fullName: 'AVX-512 Foundation',
    description: 'Core AVX-512 arithmetic, logical, and data-movement instructions',
    category: 'SIMD_MODERN_WIDE',
    architecture: 'x86',
  },
  {
    name: 'AVX512-DQ',
    fullName: 'AVX-512 Doubleword and Quadword',
    description: 'AVX-512 operations for 32-bit and 64-bit integer data',
    category: 'SIMD_MODERN_WIDE',
    architecture: 'x86',
  },
  {
    name: 'AVX512-BW',
    fullName: 'AVX-512 Byte and Word',
    description: 'AVX-512 operations for 8-bit and 16-bit integer data',
    category: 'SIMD_MODERN_WIDE',
    architecture: 'x86',
  },
  {
    name: 'AVX512-VL',
    fullName: 'AVX-512 Vector Length',
    description: 'Allows AVX-512 instructions to operate on 128-bit and 256-bit vectors',
    category: 'SIMD_MODERN_WIDE',
    architecture: 'x86',
  },
  {
    name: 'AVX512-FP16',
    fullName: 'AVX-512 Half-Precision Floating Point',
    description: 'Adds AVX-512 operations for 16-bit floating-point data',
    category: 'SIMD_MODERN_WIDE',
    architecture: 'x86',
  },
  {
    name: 'AMX-INT8',
    fullName: 'Advanced Matrix Extensions INT8',
    description: 'Intel matrix multiplication operations for quantized 8-bit integer workloads',
    category: 'ML',
    architecture: 'x86',
  },
  {
    name: 'SME-I8I32',
    fullName: 'Scalable Matrix Extension Integer 8-bit to 32-bit',
    description: 'ARM matrix operations using 8-bit integer inputs and 32-bit results',
    category: 'ML',
    architecture: 'ARM',
  },
  {
    name: 'SME-F32F32',
    fullName: 'Scalable Matrix Extension Float 32-bit',
    description: 'ARM matrix multiplication and accumulation for 32-bit floating-point data',
    category: 'ML',
    architecture: 'ARM',
  },
];

export const instructionsByName = Object.fromEntries(
  instructionDefinitions.map((instruction) => [instruction.name, instruction]),
) as Record<string, Instruction>;

export function instructionsByCategory(category: InstructionCategory) {
  const instructions: Record<string, Instruction> = {};
  instructionDefinitions
    .filter((i) => i.category === category)
    .forEach((instruction) => (instructions[instruction.name] = instruction));
  return instructions;
}

/**
 * Splits Geekbench's space-separated instruction-set string into normalized
 * names. Geekbench renders these lowercase in page HTML and in metric 20000,
 * so uppercasing here is what lets the rest of the app compare them by name.
 */
export function tokenizeInstructionSets(instructionSetString: string | null = ''): string[] {
  return (
    instructionSetString
      ?.split(/\s+/)
      .filter(Boolean)
      .map((name) => name.toUpperCase()) ?? []
  );
}

export function extractIndividualInstructions(instructionSetString: string | null): Set<string> {
  return new Set(tokenizeInstructionSets(instructionSetString));
}
