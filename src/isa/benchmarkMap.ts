// benchmarks.ts

import type {Instruction} from './instructions';
import {instructionsByName} from './instructions';

export interface Benchmark {
    name: string;
    category: string;
    description: string;
    instructions: string[];
}

/**
 *  Based on: https://www.geekbench.com/doc/geekbench6-benchmark-internals.pdf
 *  AMX support confirmed here: http://support.primatelabs.com/discussions/geekbench/85341-does-geekbench-take-advantage-of-intels-amx-instructions
 *
 *  RISC-V dibits https://www.reddit.com/r/RISCV/comments/1ic58jw/geekbench_64_released_with_support_for_riscv_rvv/
 */
export const BENCHMARKS_V6: Record<string, Benchmark> = {
    "File Compression": {
        name: "File Compression",
        category: "Cryptographic",
        description: "Compresses and encrypts files",
        instructions: ['AESNI', 'VAES', 'SHANI', 'AES', 'SHA1']
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
        instructions: ['AVX-VNNI', 'AVX512-VNNI', 'AMX', 'NEON-DOTPROD', 'I8MM', 'SME', 'SME2']
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
        instructions: ['AESNI', 'VAES', 'AES']
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
        instructions: ['AVX-VNNI', 'AVX512-VNNI', 'AMX', 'NEON-DOTPROD', 'I8MM', 'SME', 'SME2']
    },
    "Background Blur": {
        name: "Background Blur",
        category: "Image Processing",
        description: "Image processing with blur effects",
        instructions: ['AVX', 'AVX2', 'AVX512', 'NEON', 'SME', 'SME2']
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

export function getV6SupportedInstructions(
    benchmarkName: string,
    supportedInstructions: Set<string>
): Instruction[] {
    const benchmark = BENCHMARKS_V6[benchmarkName];
    if (!benchmark || !benchmark.instructions?.length) {
        return [];
    }

    const instructions = benchmark.instructions
        .filter(instruction => supportedInstructions.has(instruction))
        .map(instruction => instructionsByName[instruction])
        .filter(Boolean);

    // ADD SME and AES matches
    const supportedArray = Array.from(supportedInstructions);

    if (benchmark.instructions.includes('SME') &&
        supportedArray.some(inst => inst === 'SME2' || inst.startsWith('SME-'))) {
        const smeInst = instructionsByName['SME'];
        instructions.push(instructionsByName['SME']);
    }

    if (benchmark.instructions.includes('AMX') && supportedArray.some(inst => inst.includes('AMX'))) {
        instructions.push(instructionsByName['AMX']);
    }

    if (benchmark.instructions.includes('AVX512') &&
        supportedArray.some(inst => !inst.includes('VNNI') && (inst.startsWith('AVX512') || inst.startsWith('AVX-512')))) {
        instructions.push(instructionsByName['AVX-512']);
    }

    return instructions;
}
