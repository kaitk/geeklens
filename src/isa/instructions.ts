// instructions.ts

export type InstructionCategory = 'SIMD_MODERN_WIDE' | 'SIMD_MODERN' | 'SIMD_LEGACY' | 'CRYPTO' | 'ML' | 'SIMD_ML' | 'OTHER';
export type InstructionArchitecture = 'x86' | 'ARM' | 'RISC-V';

export interface Instruction {
  name: string;
  type: InstructionType;
}

export type InstructionType =
    // Vector & SIMD Extensions
    | 'SSE'        // Legacy x86 SIMD
    | 'AVX'        // Modern x86 SIMD
    | 'AVX-512'    // Wide x86 SIMD
    | 'NEON'       // ARM SIMD
    | 'SVE'        // ARM Scalable Vector (future)
    | 'AMX'        // x86 Matrix
    | 'FMA'        // Fused multiply-add (computational enhancement, not specifically SIMD)
    // ML instructions sharing Vector registers
    | 'VNNI'       // x86 Neural Network
    | 'DOTPROD'    // ARM ML
    // Matrix & AI Extensions
    | 'SME'        // ARM Matrix
    | 'I8MM'       // ARM ML
    // Cryptographic
    | 'AES'        // Encryption
    | 'SHA'        // Hashing
    | 'PCLMUL'     // Carry-less multiplication
    // Other
    | 'OTHER';



// used in CPU Information
export interface Instruction {
  name: string;
  fullName: string;
  description: string;
  type: InstructionType;
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
    type: 'SSE',
  },

  // Vector Extensions - AVX Type
  {
    name: 'AVX',
    fullName: 'Advanced Vector Extensions',
    description: 'Generic floating-point 256-bit SIMD instruction set',
    category: 'SIMD_MODERN',
    architecture: 'x86',
    type: 'AVX',
  },
  {
    name: 'AVX2',
    fullName: 'Advanced Vector Extensions 2',
    description: 'Generic 256-bit SIMD instruction set extending AVX with integer operations and new instructions',
    category: 'SIMD_MODERN',
    architecture: 'x86',
    type: 'AVX',
  },

  // Vector Extensions - AVX-512 Type
  {
    name: 'AVX-512',
    fullName: 'AVX-512',
    description: 'Wide Generic 512-bit SIMD instruction set',
    category: 'SIMD_MODERN_WIDE',
    architecture: 'x86',
    type: 'AVX-512',
  },

  // AI Extensions - VNNI Type
  {
    name: 'AVX-VNNI',
    fullName: 'AVX Vector Neural Network Instructions',
    description: 'x86 AI/ML acceleration (for 128 and 256 bit vectors) Accelerates quantized machine learning workloads',
    category: 'ML',
    architecture: 'x86',
    type: 'VNNI',
  },
  {
    name: 'AVX512-VNNI',
    fullName: 'AVX-512 Vector Neural Network Instructions',
    description: 'x86 AI/ML acceleration (part of AVX-512) Accelerates quantized machine learning workloads',
    category: 'ML',
    architecture: 'x86',
    type: 'VNNI',
  },

  // Vector Extensions - NEON Type
  {
    name: 'NEON',
    fullName: 'NEON',
    description: 'Generic 128-bit SIMD instruction set',
    category: 'SIMD_MODERN',
    architecture: 'ARM',
    type: 'NEON',
  },
  {
    name: 'NEON-FP16',
    fullName: 'NEON-FP16',
    description: 'Generic 128-bit SIMD instruction set with support for 16-bit floats',
    category: 'SIMD_MODERN',
    architecture: 'ARM',
    type: 'NEON',
  },

  // Matrix Extensions - SME Type
  {
    name: 'SME',
    fullName: 'Scalable Matrix Extension',
    description: 'ARM matrix processing instructions',
    category: 'ML',
    architecture: 'ARM',
    type: 'SME',
  },

  // Matrix Extensions - AMX Type
  {
    name: 'AMX',
    fullName: 'Advanced Matrix Extensions',
    description: 'Intel matrix processing for AI/ML workloads',
    category: 'ML',
    architecture: 'x86',
    type: 'AMX',
  },

  // AI Extensions - DOTPROD Type
  {
    name: 'DOTPROD',
    fullName: 'Dot Product',
    description: 'ARM dot product operations for ML',
    category: 'ML',
    architecture: 'ARM',
    type: 'DOTPROD',
  },

  // AI Extensions - I8MM Type
  {
    name: 'I8MM',
    fullName: 'Int8 Matrix Multiply',
    description: 'ARM 8-bit integer matrix operations',
    category: 'ML',
    architecture: 'ARM',
    type: 'I8MM',
  },

  // Cryptographic Extensions - AES Type
  {
    name: 'AES-NI',
    fullName: 'AES New Instructions',
    description: 'Accelerates AES encryption and decryption functions',
    category: 'CRYPTO',
    architecture: 'x86',
    type: 'AES',
  },
  {
    name: 'VAES',
    fullName: 'Vectorized AES',
    description: 'Accelerates AES encryption and decryption functions',
    category: 'CRYPTO',
    architecture: 'x86',
    type: 'AES',
  },
  {
    name: 'ARMv8 AES',
    fullName: 'ARMv8 AES',
    description: 'Accelerates AES encryption and decryption functions',
    category: 'CRYPTO',
    architecture: 'ARM',
    type: 'AES',
  },

  // Cryptographic Extensions - SHA Type
  {
    name: 'SHA-NI',
    fullName: 'SHA New Instructions',
    description: 'Accelerates SHA1 cryptographic hash functions',
    category: 'CRYPTO',
    architecture: 'x86',
    type: 'SHA',
  },
  {
    name: 'ARMv8 SHA1',
    fullName: 'ARMv8 SHA1',
    description: 'Accelerates SHA1 cryptographic hash functions',
    category: 'CRYPTO',
    architecture: 'ARM',
    type: 'SHA',
  },

  // Cryptographic Extensions - PCLMUL Type
  {
    name: 'PCLMUL',
    fullName: 'Carry-less Multiplication',
    description: 'Used for AES-GCM mode encryption',
    category: 'CRYPTO',
    architecture: 'x86',
    type: 'PCLMUL',
  },

];

export const instructionsByName: Record<string, Instruction> = {};
instructionDefinitions.forEach(instruction => {
  instructionsByName[instruction.name] = instruction;
});
