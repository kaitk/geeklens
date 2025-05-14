export interface Instruction {
    name: string;
    type: InstructionType;
}

export type InstructionType = 'AVX-512' | 'AVX' | 'SSE' | 'AES' | 'SHA' | 'NEON' | 'SME' | 'OTHER';

export interface BenchmarkInstructionMap {
    [benchmarkName: string]: Instruction[];
}

/**
 * This mapping is based on Geekbench 6 documentation and test analysis
 * Source: https://www.geekbench.com/doc/geekbench6-benchmark-internals.pdf
 *
 * The keys match EXACTLY the benchmark names as they appear in Geekbench results.
 */
export const instructionSets: BenchmarkInstructionMap = {
    "File Compression": [
        { name: "VAES", type: "AES" },
        { name: "SHA-NI", type: "SHA" },
        // ARM
        { name: "AES", type: "AES" },
        { name: "SHA1", type: "SHA" }
    ],
    "Navigation": [],
    "HTML5 Browser": [
        { name: "AVX2", type: "AVX" }
    ],
    "PDF Renderer": [],
    "Photo Library": [
        { name: "AVX512-VNNI", type: "AVX-512" },
        // ARM
        { name: "DOTPROD", type: "NEON" },
        { name: "I8MM", type: "NEON" },
        { name: "SME", type: "SME" },
        { name: "SME2", type: "SME" }
    ],
    "Clang": [],
    "Text Processing": [
        { name: "VAES", type: "AES" },
        // ARM
        { name: "AES", type: "AES" }
    ],
    "Asset Compression": [],
    "Object Detection": [
        { name: "AVX512-VNNI", type: "AVX-512" },
        // ARM
        { name: "DOTPROD", type: "NEON" },
        { name: "I8MM", type: "NEON" },
        { name: "SME", type: "SME" },
        { name: "SME-I8I32", type: "SME" },
        { name: "SME2", type: "SME" }
    ],
    "Background Blur": [
        { name: "AVX512-F", type: "AVX-512" },
        { name: "AVX512-BW", type: "AVX-512" },
        // ARM
        { name: "NEON", type: "NEON" },
        { name: "SME", type: "SME" },
        { name: "SME-F32F32", type: "SME" },
        { name: "SME2", type: "SME" }
    ],
    "Horizon Detection": [],
    "Object Remover": [],
    "HDR": [],
    "Photo Filter": [
        { name: "AVX2", type: "AVX" },
        // ARM
        { name: "NEON", type: "NEON" },
        { name: "NEON-FP16", type: "NEON" }
    ],
    "Ray Tracer": [],
    "Structure from Motion": [
        { name: "AVX2", type: "AVX" },
        // ARM
        { name: "NEON", type: "NEON" },
        { name: "NEON-FP16", type: "NEON" }
    ]
};

/**
 * Helper function to categorize instruction set strings by type
 * This converts a space-separated list of instruction sets into categorized groups
 */
/**
 * Helper function to categorize instruction set strings by type
 * This converts a space-separated list of instruction sets into categorized groups
 */
export function categorizeInstructionSets(instructionSetString = ''): Record<InstructionType, string[]> {
    // Split by space and filter out empty strings
    const instructionSets = instructionSetString.split(' ').filter(x => x.trim() !== '');

    const groups: Record<InstructionType, string[]> = {
        'AVX-512': [],
        'AVX': [],
        'SSE': [],
        'AES': [],
        'SHA': [],
        'NEON': [],
        'SME': [],
        'OTHER': []
    };

    // Process each instruction individually
    instructionSets.forEach(instr => {
        // Clean up the instruction name
        const instrUpper = instr.toUpperCase().trim();

        // x86 instructions
        if (instrUpper.includes('AVX512') || instrUpper.includes('AVX-512')) {
            groups['AVX-512'].push(instr);
        } else if (instrUpper.includes('AVX')) {
            groups['AVX'].push(instr);
        } else if (instrUpper.includes('SSE')) {
            groups['SSE'].push(instr);
        }
        // Cryptographic instructions (both x86 and ARM)
        else if (instrUpper.includes('AES') || instrUpper.includes('VAES')) {
            groups['AES'].push(instr);
        } else if (instrUpper.includes('SHA')) {
            groups['SHA'].push(instr);
        }
        // ARM instructions
        else if (instrUpper.includes('NEON')) {
            groups['NEON'].push(instr);
        } else if (instrUpper.includes('SME')) {
            groups['SME'].push(instr);
        }
        // ARM dot product and matrix
        else if (instrUpper.includes('DOTPROD') || instrUpper.includes('I8MM')) {
            groups['NEON'].push(instr);  // These are NEON extensions
        }
        // Anything else
        else if (instr.trim() !== '') {
            groups['OTHER'].push(instr);
        }
    });

    return groups;
}
