export interface Instruction {
    name: string;
    type: InstructionType;
}

export type InstructionType = 'AVX-512' | 'AVX' | 'SSE' | 'AES' | 'SHA' | 'OTHER';

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
        { name: "SHA-NI", type: "SHA" }
    ],
    "Navigation": [],
    "HTML5 Browser": [
        { name: "AVX2", type: "AVX" }
    ],
    "PDF Renderer": [],
    "Photo Library": [
        { name: "AVX512-VNNI", type: "AVX-512" }
    ],
    "Clang": [],
    "Text Processing": [
        { name: "VAES", type: "AES" }
    ],
    "Asset Compression": [],
    "Object Detection": [
        { name: "AVX512-VNNI", type: "AVX-512" }
    ],
    "Background Blur": [
        { name: "AVX512-F", type: "AVX-512" },
        { name: "AVX512-BW", type: "AVX-512" }
    ],
    "Horizon Detection": [],
    "Object Remover": [],
    "HDR": [],
    "Photo Filter": [
        { name: "AVX2", type: "AVX" }
    ],
    "Ray Tracer": [],
    "Structure from Motion": [
        { name: "AVX2", type: "AVX" }
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
        'OTHER': []
    };

    // Process each instruction individually
    instructionSets.forEach(instr => {
        // Clean up the instruction name
        const instrLower = instr.toLowerCase().trim();

        if (instrLower.includes('avx512') || instrLower.includes('avx-512')) {
            groups['AVX-512'].push(instr);
        } else if (instrLower.includes('avx')) {
            groups['AVX'].push(instr);
        } else if (instrLower.includes('sse')) {
            groups['SSE'].push(instr);
        } else if (instrLower.includes('aes') || instrLower.includes('vaes')) {
            groups['AES'].push(instr);
        } else if (instrLower.includes('sha')) {
            groups['SHA'].push(instr);
        } else if (instr.trim() !== '') {
            groups['OTHER'].push(instr);
        }
    });

    return groups;
}
