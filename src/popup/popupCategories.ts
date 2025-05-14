//FIXME CLEANUP
export const instructionCategories = {
  'Vector & general SIMD Extensions': {
    description: 'SIMD (Single Instruction, Multiple Data) instructions for parallel processing. Modern ones uses blue color tones.',
    instructions: {
      'AVX': {
        name: 'Advanced Vector Extensions',
        type: 'AVX',
        category: 'SIMD_MODERN',
        description: 'Generic floating-point 256-bit SIMD instruction set',
        architecture: 'x86'
      },
      'AVX2': {
        name: 'Advanced Vector Extensions 2',
        type: 'AVX',
        category: 'SIMD_MODERN',
        description: 'Generic 256-bit SIMD instruction set extending AVX with integer operations and new instructions',
        architecture: 'x86'
      },
      'AVX-512': {
        name: 'AVX-512',
        type: 'AVX-512',
        category: 'SIMD_MODERN_WIDE',
        description: 'Wide Generic 512-bit SIMD instruction set',
        architecture: 'x86'
      },
      'NEON': {
        name: 'NEON',
        type: 'NEON',
        category: 'SIMD_MODERN',
        description: 'ARM\'s primary 128-bit SIMD for both integer and floating-point',
        architecture: 'ARM'
      },
      'NEON-FP16': {
        name: 'NEON-FP16',
        type: 'NEON',
        category: 'SIMD_MODERN',
        description: 'NEON with half-precision (16-bit) floating-point support',
        architecture: 'ARM'
      },
      'FMA3': {
        name: 'Fused Multiply-Add (3-operand)',
        type: 'FMA',
        category: 'SIMD_LEGACY',
        description: '128-bit SIMD, foundational x86 vector extension',
        architecture: 'x86'
      },
      'SSE': {
        name: 'Streaming SIMD Extensions',
        type: 'SSE',
        category: 'SIMD_LEGACY',
        description: 'Legacy x86 vector instructions (128-bit)',
        architecture: 'x86'
      },
    }
  },
  'Matrix & AI Accelerators': {
    description: 'Specialized instructions for matrix operations and machine learning use amber/orange tones. Instructions sharing other SIMD registers use blue',
    instructions: {
      'AVX-VNNI': {
        name: 'AVX Vector Neural Network Instructions',
        type: 'VNNI',
        category: 'SIMD_ML',
        description: 'SIMD dot product for int8/int16 on 128/256-bit vectors, targets inference',
        architecture: 'x86'
      },
      'AVX512-VNNI': {
        name: 'AVX-512 Vector Neural Network Instructions',
        type: 'VNNI',
        category: 'SIMD_ML',
        description: '512-bit SIMD dot product acceleration for quantized neural networks',
        architecture: 'x86'
      },
      'NEON-DOTPROD': {
        name: 'Dot Product',
        type: 'DOTPROD',
        category: 'SIMD_ML',
        description: 'NEON extension for int8 dot products, common in ML convolutions',
        architecture: 'ARM'
      },
      'SME': {
        name: 'Scalable Matrix Extension',
        type: 'SME',
        category: 'ML',
        description: 'ARM matrix extension with dedicated 2D register file for large matrices',
        architecture: 'ARM'
      },
      'AMX': {
        name: 'Advanced Matrix Extensions',
        type: 'AMX',
        category: 'ML',
        description: 'Intel\'s matrix tiles for accelerating GEMM and convolution operations',
        architecture: 'x86'
      },
      'I8MM': {
        name: 'Int8 Matrix Multiply',
        type: 'I8MM',
        category: 'ML',
        description: 'NEON int8 matrix multiply, bridges SIMD and matrix operations',
        architecture: 'ARM'
      }
    }
  },
  'Cryptographic Accelerators': {
    description: 'Hardware-accelerated cryptographic operations. Use green color tones.',
    instructions: {
      'AES-NI': {
        name: 'AES New Instructions',
        type: 'AES',
        category: 'CRYPTO',
        description: 'Hardware AES rounds, 5-10x faster than software implementation',
        architecture: 'x86'
      },
      'VAES': {
        name: 'Vectorized AES',
        type: 'AES',
        category: 'CRYPTO',
        description: 'Vectorized AES processing multiple blocks in parallel',
        architecture: 'x86'
      },
      'SHA-NI': {
        name: 'SHA New Instructions',
        description: 'Hardware SHA1/SHA256 rounds for faster hashing',
        type: 'SHA',
        category: 'CRYPTO',
        architecture: 'x86'
      },
      'ARMv8 AES': {
        name: 'ARMv8 AES',
        description: 'ARM hardware AES acceleration equivalent to x86 AES-NI',
        type: 'AES',
        category: 'CRYPTO',
        architecture: 'ARM'
      },
      'ARMv8 SHA1': {
        name: 'ARMv8 SHA1',
        description: 'ARM hardware SHA1 acceleration for cryptographic hashing',
        type: 'SHA',
        category: 'CRYPTO',
        architecture: 'ARM'
      },
      'PCLMUL': {
        name: 'Carry-less Multiplication',
        type: 'PCLMUL',
        category: 'CRYPTO',
        description: 'Polynomial multiplication for GCM mode and CRC calculations',
        architecture: 'x86'
      }
    }
  },
  'Other': {
    description: 'Other extensions not listed above use gray color tones. These are usually not used to accelerate workloads.',
    instructions: {}
  }
};
