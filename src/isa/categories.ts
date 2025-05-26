import type { InstructionCategory } from "./instructions";

/**
 * Helper function to categorize instruction set strings by type
 * This converts a space-separated list of instruction sets into categorized groups
 */
export function categorizeInstructionSets(instructionSetString = ''): Record<InstructionCategory, string[]> {
  // Split by space and filter out empty strings
  const instructionSets = instructionSetString.split(' ').filter(x => x.trim() !== '');

  const groups: Record<InstructionCategory, string[]> = {
    'SIMD_MODERN_WIDE': [],
    'SIMD_ML': [],
    'SIMD_MODERN': [],
    'SIMD_LEGACY': [],
    'ML': [],
    'CRYPTO': [],
    'OTHER': []
  };

  // Process each instruction individually
  instructionSets.forEach(name => {
    // Clean up the instruction name
    const instr = name.toUpperCase().trim();

    // dot product NN and matrix
    if (instr.includes('SME') || instr.includes('AMX')) {
      groups['ML'].push(instr);
    }
    // ARM dot product and matrix
    else if (instr.includes('DOTPROD') || instr.includes('I8MM') || instr.includes('VNNI')) {
      groups['SIMD_ML'].push(instr);  // These are NEON extensions
    }

    // x86 instructions
    else if (instr.includes('AVX512') || instr.includes('AVX-512')) {
      groups['SIMD_MODERN_WIDE'].push(instr);
    } else if (instr.includes('AVX')) {
      groups['SIMD_MODERN'].push(instr);
    } else if (instr.includes('SSE')) {
      groups['SIMD_LEGACY'].push(instr);
    } else if (instr.includes('FMA')) {
      groups['SIMD_LEGACY'].push(instr); // also has 256 bit but not actually used
    }
    // ARM instructions TODO different colors per ISA?
    else if (instr.includes('SVE')) {
      groups['SIMD_MODERN_WIDE'].push(instr);
    } else if (instr.includes('NEON')) {
      groups['SIMD_MODERN'].push(instr);
    }

    //RISC_V
    else if (instr.includes('RVV') || instr.includes('ZVFH')) {
      groups['SIMD_MODERN'].push(instr);
    }

    // Cryptographic instructions (both x86 and ARM)
    else if (instr.includes('AES') || instr.includes('SHA') || instr.includes('PCLMUL')) {
      groups['CRYPTO'].push(instr);
    }

    // Anything else
    else if (instr.trim() !== '') {
      groups['OTHER'].push(instr);
    }
  });

  return groups;
}
