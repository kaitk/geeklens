import { instructionsByCategory } from '../isa/instructions';

export const instructionCategories = {
  'Vector & general SIMD Extensions': {
    description: 'SIMD (Single Instruction, Multiple Data) instructions for parallel processing. Modern ones uses blue color tones.',
    instructions: {
      ...instructionsByCategory('SIMD_MODERN_WIDE'),
      ...instructionsByCategory('SIMD_MODERN'),
      ...instructionsByCategory('SIMD_LEGACY'),
    }
  },
  'Matrix & AI Accelerators': {
    description: 'Specialized instructions for matrix operations and machine learning use amber/orange tones. Instructions sharing other SIMD registers use blue',
    instructions: {
      ...instructionsByCategory('SIMD_ML'),
      ...instructionsByCategory('ML'),
    }
  },
  'Cryptographic Accelerators': {
    description: 'Hardware-accelerated cryptographic operations. Use green color tones.',
    instructions: {
      ...instructionsByCategory('CRYPTO'),
    }
  },
  'Other': {
    description: 'Other extensions not listed above use gray color tones. These are usually not used to accelerate workloads.',
    instructions: {}
  }
};
