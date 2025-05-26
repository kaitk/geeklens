// instructions.ts

export type InstructionCategory =
    'SIMD_MODERN_WIDE'
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
        description: 'Generic 256-bit SIMD instruction set extending AVX with integer operations and new instructions',
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
        description: 'x86 AI/ML acceleration (for 128 and 256 bit vectors) Accelerates quantized machine learning workloads',
        category: 'SIMD_ML',
        architecture: 'x86',
    },
    {
        name: 'AVX512-VNNI',
        fullName: 'AVX-512 Vector Neural Network Instructions',
        description: 'x86 AI/ML acceleration (part of AVX-512) Accelerates quantized machine learning workloads',
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
        description: 'Vector length-agnostic SIMD instruction set supporting variable vector lengths from 128 to 65,536 bits',
        category: 'SIMD_MODERN',
        architecture: 'RISC-V',
    },
    {
        name: 'ZVFH',
        fullName: 'Vector Extension for Half-Precision Floating-Point',
        description: 'RISC-V vector extension adding IEEE 754-2008 16-bit half-precision floating-point operations',
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
        description: 'Intel matrix processing for AI/ML workloads. Accelerates machine learning on quantized networks',
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
];


// Used by the System Instruction tooltips
// TODO try to unify these
const detailedDescriptions: Record<string, string> = {
    // Intel/AMD x86 SIMD Extensions
    "SSE": "Streaming SIMD Extensions - Legacy x86 vector instructions providing 128-bit SIMD operations for single-precision floating-point data. Foundation for modern x86 vector processing.",

    "SSE2": "Streaming SIMD Extensions 2 - Adds 128-bit vector operations for double-precision floating-point and integer data types. Includes packed arithmetic, logical operations, and data movement instructions.",

    "SSE3": "Streaming SIMD Extensions 3 - Adds horizontal arithmetic operations, complex number support, and improved data loading/conversion instructions. Introduces FISTTP for faster floating-point to integer conversion.",

    "SSE41": "Streaming SIMD Extensions 4.1 - Adds 47 new instructions including blend operations, dot products, maximum/minimum operations, and improved string/text processing capabilities.",

    "FMA3": "Fused Multiply-Add 3-operand - Provides fused multiply-add operations that perform multiplication and addition in a single instruction with higher precision and performance than separate operations.",

    // AVX Extensions
    "AVX": "Advanced Vector Extensions - Generic floating-point 256-bit SIMD instruction set extending SSE with wider vectors and improved performance for floating-point operations.",

    "AVX2": "Advanced Vector Extensions 2 - Generic 256-bit SIMD instruction set extending AVX with integer operations, new instructions, and gather operations for improved performance.",

    // AVX-512 Extensions
    "AVX-512": "AVX-512 - Wide Generic 512-bit SIMD instruction set providing high-performance vector operations with increased register count and advanced features for compute-intensive workloads.",

    "AVX512-F": "AVX-512 Foundation - The core AVX-512 instruction set that provides basic 512-bit vector operations. Includes fundamental arithmetic, logical, and data movement instructions for 32-bit and 64-bit elements.",

    "AVX512-DQ": "AVX-512 Doubleword and Quadword - Adds instructions for processing 32-bit (doubleword) and 64-bit (quadword) integer data types. Includes operations like integer multiplication and conversion between floating-point and integer formats.",

    "AVX512-BW": "AVX-512 Byte and Word - Extends AVX-512 to handle 8-bit (byte) and 16-bit (word) data types efficiently. Particularly useful for text processing, image manipulation, and applications working with smaller integer data types.",

    "AVX512-VL": "AVX-512 Vector Length - Allows AVX-512 instructions to operate on 128-bit and 256-bit vectors (not just 512-bit). Provides flexibility to use AVX-512 features on smaller vector sizes for improved compatibility.",

    "AVX512-FP16": "AVX-512 Half Precision Floating Point - Adds support for 16-bit floating-point operations, increasingly important for machine learning workloads where reduced precision improves performance while maintaining acceptable accuracy.",

    // AI/ML Extensions - x86
    "AVX-VNNI": "AVX Vector Neural Network Instructions - x86 AI/ML acceleration for 128 and 256 bit vectors. Accelerates quantized machine learning workloads with specialized dot product operations.",

    "AVX512-VNNI": "AVX-512 Vector Neural Network Instructions - x86 AI/ML acceleration as part of AVX-512. Accelerates quantized machine learning workloads with 512-bit vector neural network operations.",

    "AMX": "Advanced Matrix Extensions - Intel matrix processing for AI/ML workloads. Accelerates machine learning on quantized networks with dedicated matrix multiplication units.",

    "AMX-INT8": "Advanced Matrix Extensions INT8 - Subset of AMX focused specifically on 8-bit integer matrix multiplication operations. Enables the TMUL (Tile Matrix Multiply) unit for quantized neural network inference.",

    // ARM SIMD Extensions
    "NEON": "NEON - Generic 128-bit SIMD instruction set for ARM processors. Provides vector processing capabilities similar to x86 SSE for multimedia and signal processing applications.",

    "NEON-FP16": "NEON-FP16 - Generic 128-bit SIMD instruction set with support for 16-bit floats. Extends NEON with half-precision floating-point operations for improved ML performance.",

    "NEON-DOTPROD": "Dot Product - ARM dot product operations for ML. Accelerates machine learning inference with specialized dot product instructions within the NEON framework.",

    // ARM Scalable Vector Extensions
    "SVE": "Scalable Vector Extension - Vector length-agnostic SIMD instruction set for ARMv8-A. Allows code to work efficiently across different vector lengths from 128 to 2048 bits.",

    "SVE2": "Scalable Vector Extension 2 - Enhanced vector processing capabilities for ARMv9-A. Adds new instructions and improved performance over SVE for general-purpose computing.",

    // ARM Matrix Extensions (SME)
    "SME": "Scalable Matrix Extension - ARM matrix processing instructions providing hardware acceleration for matrix operations in AI/ML and scientific computing workloads.",
    "SME-I8I32": "Scalable Matrix Extension Integer 8-bit to 32-bit - ARM's matrix extension for 8-bit integer input operations producing 32-bit results. Optimized for AI/ML workloads requiring integer matrix computations.",

    "SME-F32F32": "Scalable Matrix Extension Float 32-bit - ARM's matrix extension for 32-bit floating-point matrix operations. Provides hardware acceleration for single-precision floating-point matrix multiplication and accumulation.",

    "SME2": "Scalable Matrix Extension 2 - Second generation of ARM's matrix extensions with enhanced capabilities, improved performance, and additional data type support for AI/ML acceleration and general matrix computations.",

    // x86 Cryptographic Extensions
    "AESNI": "AES New Instructions - Accelerates AES encryption and decryption functions with dedicated hardware instructions for improved security and performance.",

    "VAES": "Vectorized AES - Vectorized AES processing multiple blocks in parallel, extending AES-NI with SIMD capabilities for higher throughput encryption/decryption.",

    "SHANI": "SHA New Instructions - Hardware acceleration for SHA1/SHA256 cryptographic hash functions providing faster secure hashing operations.",

    "PCLMUL": "Carry-less Multiplication - Polynomial multiplication for GCM mode and CRC calculations, essential for authenticated encryption and error detection.",

    // ARM Cryptographic Extensions
    "AES": "ARMv8 AES - ARM hardware AES acceleration equivalent to x86 AES-NI, providing efficient symmetric encryption and decryption operations.",

    "SHA1": "ARMv8 SHA1 - ARM hardware SHA1 acceleration for cryptographic hashing, optimized for secure hash computation in embedded and server applications.",

    // RISC-V Vector Extensions
    "RVV": "RISC-V Vector Extension - Vector length-agnostic SIMD instruction set for RISC-V processors. Supports variable vector lengths from 128 to 65,536 bits, enabling portable vector code across different implementations.",

    "ZVFH": "Vector Extension for Half-Precision Floating-Point - RISC-V vector extension adding IEEE 754-2008 16-bit half-precision floating-point operations to the vector instruction set for improved ML and AI performance."
};

export const instructionsByName: Record<string, Instruction> = {};
instructionDefinitions.forEach(instruction => {
    instructionsByName[instruction.name] = instruction;
});

export function instructionsByCategory(category: InstructionCategory) {
    const instructions: Record<string, Instruction> = {}
    instructionDefinitions
        .filter(i => i.category === category)
        .forEach(instruction => instructions[instruction.name] = instruction);
    return instructions
}


export function extractIndividualInstructions(instructionSetString: string | null): Set<string> {
    return new Set(
        instructionSetString?.split(' ')
            .filter(x => x.trim() !== '')
            .map(x => x.toUpperCase().trim())
    );
}

export function findDetailedDescription(name: string) {
    return detailedDescriptions[name]
}
