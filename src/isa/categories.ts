//FIXME CLEANUP
export const instructionCategories = {
  'Vector Extensions': {
    description: 'SIMD (Single Instruction, Multiple Data) instructions for parallel processing. Uses blue color tones.',
    instructions: {
      'SSE': {
        name: 'Streaming SIMD Extensions',
        type:  'SSE',
        description: 'Legacy x86 vector instructions (128-bit)',
        architecture: 'x86'
      },
      'AVX': {
        name: 'Advanced Vector Extensions',
        type:  'AVX',
        description: 'Generic floating-point 256-bit SIMD instruction set',
        architecture: 'x86'
      },
      'AVX2': {
        name: 'Advanced Vector Extensions 2',
        type:  'AVX',
        description: 'Generic 256-bit SIMD instruction set',
        architecture: 'x86'
      },
      'AVX-512': {
        name: 'AVX-512',
        type:  'AVX-512',
        description: 'Wide Generic 512-bit SIMD instruction set',
        architecture: 'x86'
      },
      'NEON': {
        name: 'NEON',
        type:  'NEON',
        description: 'Generic 128-bit SIMD instruction set',
        architecture: 'ARM'
      },
      'NEON FP16': {
        name: 'NEON FP16',
        type:  'NEON',
        description: 'Generic 128-bit SIMD instruction set with support for 16-bit floats',
        architecture: 'ARM'
      }
    }
  },
  'Matrix & AI Accelerators': {
    description: 'Specialized instructions for matrix operations and machine learning. Uses amber/orange tones for better readability.',
    instructions: {
      'SME': {
        name: 'Scalable Matrix Extension',
        type:  'SME',
        description: 'ARM matrix processing instructions',
        architecture: 'ARM'
      },
      'AMX': {
        name: 'Advanced Matrix Extensions',
        type:  'AMX',
        description: 'Intel matrix processing for AI/ML workloads',
        architecture: 'x86'
      },
      'AVX-VNNI': {
        name: 'AVX Vector Neural Network Instructions',
        type:  'VNNI',
        description: 'x86 AI/ML acceleration (for 128 adn 256 bit vectors) Accelerates quantized machine learning workloads',
        architecture: 'x86'
      },
      'AVX512-VNNI': {
        name: 'AVX-512 Vector Neural Network Instructions',
        type:  'VNNI',
        description: 'x86 AI/ML acceleration (part of AVX-512) Accelerates quantized machine learning workloads',
        architecture: 'x86'
      },
      'DOTPROD': {
        name: 'Dot Product',
        type:  'DOTPROD',
        description: 'ARM dot product operations for ML',
        architecture: 'ARM'
      },
      'I8MM': {
        name: 'Int8 Matrix Multiply',
        type:  'I8MM',
        description: 'ARM 8-bit integer matrix operations',
        architecture: 'ARM'
      }
    }
  },
  'Cryptographic Accelerators': {
    description: 'Hardware-accelerated cryptographic operations. Uses green color tones.',
    instructions: {
      'AES-NI': {
        name: 'AES New Instructions',
        type:  'AES',
        description: 'Accelerates AES encryption and decryption functions',
        architecture: 'x86'
      },
      'VAES': {
        name: 'Vectorized AES',
        type:  'AES',
        description: 'Accelerates AES encryption and decryption functions',
        architecture: 'x86'
      },
      'SHA-NI': {
        name: 'SHA New Instructions',
        description: 'Accelerates SHA1 cryptographic hash functions',
        type:  'SHA',
        architecture: 'x86'
      },
      'ARMv8 AES': {
        name: 'ARMv8 AES',
        description: 'Accelerates AES encryption and decryption functions',
        type:  'AES',
        architecture: 'ARM'
      },
      'ARMv8 SHA1': {
        name: 'ARMv8 SHA1',
        description: 'Accelerates SHA1 cryptographic hash functions',
        type:  'SHA',
        architecture: 'ARM'
      },
      'PCLMUL': {
        name: 'Carry-less Multiplication',
        type:  'PCLMUL',
        description: 'Used for AES-GCM mode encryption',
        architecture: 'x86'
      }
    }
  },
  'General Compute': {
    description: 'Other computational extensions not listed above (and not usually applied in tests) use gray color tones.',
    instructions: {
      'FMA3': {
        name: 'Fused Multiply-Add (3-operand)',
        type:  'FMA',
        description: 'Single-step multiply-add for improved precision and performance',
        architecture: 'x86'
      }
    }
  }
};
