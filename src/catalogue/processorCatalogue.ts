import type { ProcessorArchitecture, ProcessorVendor } from '../geekbench/resultPayload';
import { GENERATED_PROCESSOR_IDENTITIES } from './processorCatalogue.generated';
import { GENERATED_MAC_IDENTITIES } from './macCatalogue.generated';

export interface ProcessorCatalogueEntry {
  key: string;
  displayName: string;
  vendor: ProcessorVendor;
  architecture: ProcessorArchitecture;
  pageUrl: string;
  processorPaths: readonly string[];
  macPaths: readonly string[];
  aliases: readonly string[];
  requiredConfiguration?: {
    physicalCores?: number;
    gpuCores?: number;
    modelIdentifier?: string;
  };
  hardware?: HardwareSpecification;
  scoreReferences?: readonly GeekbenchScoreReference[];
}

export interface GeekbenchScoreReference {
  generation: 7;
  singleCore: number;
  multiCore: number;
  minimumUniqueResults: number;
}

export interface CatalogueSource {
  url: string;
  retrievedOn: string;
  publisher: 'Apple' | 'Lenovo' | 'Notebookcheck' | 'Qualcomm' | 'Wikipedia';
}

export interface SystemMemorySpecification {
  systemName: string;
  processorName: string;
  memoryType: string;
  transferRateMTs: number;
  source: CatalogueSource;
}

export const SYSTEM_MEMORY_SPECIFICATIONS: readonly SystemMemorySpecification[] = [
  {
    // Lenovo machine-type 21CQ is ThinkPad T14s Gen 3 (AMD); X13 Gen 3 (AMD) is
    // 21CM/21CN. Both ship LPDDR5-6400, which is why the earlier X13 citation
    // produced a correct value from the wrong document.
    systemName: 'LENOVO 21CQS02000',
    processorName: 'AMD Ryzen 7 PRO 6850U',
    memoryType: 'LPDDR5',
    transferRateMTs: 6400,
    source: {
      url: 'https://psref.lenovo.com/syspool/Sys/PDF/ThinkPad/ThinkPad_T14s_Gen_3_AMD/ThinkPad_T14s_Gen_3_AMD_Spec.html',
      retrievedOn: '2026-08-01',
      publisher: 'Lenovo',
    },
  },
];

export interface HardwareSpecification {
  memoryType?: string;
  transferRateMTs?: number;
  busWidthBits?: number;
  bandwidthGBs: number;
  bandwidthQualifier: 'published' | 'up-to';
  source: CatalogueSource;
}

export const PROCESSOR_CATALOGUE_SOURCE = {
  url: 'https://browser.geekbench.com/processor-benchmarks',
  retrievedOn: '2026-07-31',
  generation: 7,
  minimumUniqueResults: 5,
} as const;

export const MAC_CATALOGUE_SOURCE = {
  url: 'https://browser.geekbench.com/macs/mac-mini-2024-12c-cpu',
  retrievedOn: '2026-08-01',
  identityOnly: true,
  scoreGeneration: 'unresolved-conflicting-page-copy',
} as const;

const REVIEWED_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'snapdragon-x2-elite-extreme-x2e-94-100': [
    'Snapdragon(R) X2 Elite Extreme - X2E94100 - Qualcomm Oryon(TM) CPU',
  ],
};

/** The former AnandTech citation 301-redirects to an unrelated Tom's Hardware
 * pre-launch news post that does not contain the claim, so it can no longer
 * support the M1 Pro LPDDR5-6400 / 256-bit exception. This page states the
 * memory type, bus width, and bandwidth together. */
const APPLE_M1_PRO_MEMORY_SOURCE: CatalogueSource = {
  url: 'https://www.notebookcheck.net/Apple-M1-Pro-14-Core-GPU-Benchmarks-and-Specs.576651.0.html',
  retrievedOn: '2026-08-01',
  publisher: 'Notebookcheck',
};

const APPLE_M1_ULTRA_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2022/03/apple-unveils-m1-ultra-the-worlds-most-powerful-chip-for-a-personal-computer/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

const APPLE_M2_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2022/06/apple-unveils-m2-with-breakthrough-performance-and-capabilities/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

const APPLE_M2_PRO_MAX_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2023/01/apple-unveils-m2-pro-and-m2-max-next-generation-chips-for-next-level-workflows/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

const APPLE_M2_ULTRA_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2023/06/apple-introduces-m2-ultra/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

const APPLE_M3_ULTRA_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2025/03/apple-reveals-m3-ultra-taking-apple-silicon-to-a-new-extreme/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

const APPLE_M4_FAMILY_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2024/10/new-macbook-pro-features-m4-family-of-chips-and-apple-intelligence/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

const APPLE_M4_PRO_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/uk/newsroom/2024/10/apples-new-mac-mini-is-more-mighty-more-mini-and-built-for-apple-intelligence/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

const APPLE_M4_PRO_MAX_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

const APPLE_M5_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

const APPLE_M5_PRO_MAX_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

/** Apple publishes unified-memory bandwidth only for chips it chose to headline,
 * and never publishes memory type, transfer rate, or bus width for any of them.
 * These pages carry the remaining figures. They are a weaker tier than the
 * first-party sources above, which is why the publisher is named explicitly in
 * the provenance tooltip rather than blended into an `Apple` attribution. */
const WIKIPEDIA_APPLE_M1_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Apple_M1',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

const WIKIPEDIA_APPLE_M3_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Apple_M3',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

const WIKIPEDIA_APPLE_M4_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Apple_M4',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

const QUALCOMM_X2_SOURCE: CatalogueSource = {
  url: 'https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-X2-Elite-Product-Brief.pdf',
  retrievedOn: '2026-08-01',
  publisher: 'Qualcomm',
};

/** Qualcomm publishes memory type and peak bandwidth for the X Series but not
 * transfer rate or bus width, so only the two stated values are recorded. */
const QUALCOMM_X1_SOURCE: CatalogueSource = {
  url: 'https://www.qualcomm.com/products/mobile/snapdragon/pcs-and-tablets/snapdragon-x-elite',
  retrievedOn: '2026-08-01',
  publisher: 'Qualcomm',
};

/** Every Snapdragon X Series (X1) part shares Qualcomm's published
 * "LPDDR5x, up to 135 GB/s" platform memory figure. */
const QUALCOMM_X1_HARDWARE: HardwareSpecification = {
  memoryType: 'LPDDR5x',
  bandwidthGBs: 135,
  bandwidthQualifier: 'up-to',
  source: QUALCOMM_X1_SOURCE,
};

const APPLE_M1_HARDWARE: HardwareSpecification = {
  memoryType: 'LPDDR4X',
  transferRateMTs: 4266,
  busWidthBits: 128,
  bandwidthGBs: 68.3,
  bandwidthQualifier: 'published',
  source: WIKIPEDIA_APPLE_M1_SOURCE,
};

const REVIEWED_HARDWARE: Readonly<Record<string, HardwareSpecification>> = {
  'snapdragon-x2-elite-extreme-x2e-94-100': {
    memoryType: 'LPDDR5x',
    transferRateMTs: 9523,
    busWidthBits: 192,
    bandwidthGBs: 228,
    bandwidthQualifier: 'published',
    source: QUALCOMM_X2_SOURCE,
  },
  'snapdragon-x-elite-x1e-84-100': QUALCOMM_X1_HARDWARE,
  'snapdragon-x-elite-x1e-80-100': QUALCOMM_X1_HARDWARE,
  'snapdragon-x-elite-x1e-78-100': QUALCOMM_X1_HARDWARE,
  'snapdragon-x-plus-x1p-64-100': QUALCOMM_X1_HARDWARE,
  'snapdragon-x-plus-x1p-42-100': QUALCOMM_X1_HARDWARE,
  'snapdragon-x-x1-26-100': QUALCOMM_X1_HARDWARE,
  'mac-mac-mini-2024-12c-cpu': {
    memoryType: 'Unified memory',
    bandwidthGBs: 273,
    bandwidthQualifier: 'published',
    source: APPLE_M4_PRO_SOURCE,
  },
  'mac-mac-mini-2024-14c-cpu': {
    memoryType: 'Unified memory',
    bandwidthGBs: 273,
    bandwidthQualifier: 'published',
    source: APPLE_M4_PRO_SOURCE,
  },
  // `Apple M1 Ultra` alias-matches this unconfigured Mac entry today. Attaching
  // its hardware here rather than adding a second identity keeps that match
  // unique; a new entry sharing the alias would resolve to `ambiguous-alias`.
  'mac-mac-studio-apple-m1-ultra': {
    memoryType: 'Unified memory',
    bandwidthGBs: 800,
    bandwidthQualifier: 'published',
    source: APPLE_M1_ULTRA_SOURCE,
  },
  'mac-mac-studio-apple-m1-max': {
    memoryType: 'LPDDR5',
    busWidthBits: 512,
    bandwidthGBs: 409.6,
    bandwidthQualifier: 'published',
    source: WIKIPEDIA_APPLE_M1_SOURCE,
  },
  // `Apple M1` is shared by three unconfigured Mac entries, so it always
  // resolves to `ambiguous-alias`. Attaching hardware to each of them keeps the
  // facts available on the canonical Mac-path matches, which do resolve.
  'mac-mac-mini-late-2020': APPLE_M1_HARDWARE,
  'mac-imac-24-inch-mid-2021': APPLE_M1_HARDWARE,
  'mac-imac-24-inch-mid-2021-apple-m1-3-2-ghz-8-cores': APPLE_M1_HARDWARE,
};

const GENERATED_CATALOGUE: readonly ProcessorCatalogueEntry[] = GENERATED_PROCESSOR_IDENTITIES.map(
  (identity) => ({
    ...identity,
    aliases: [identity.displayName, ...(REVIEWED_ALIASES[identity.key] ?? [])],
    macPaths: [],
    hardware: REVIEWED_HARDWARE[identity.key],
    scoreReferences:
      'singleCore' in identity && 'multiCore' in identity
        ? [
            {
              generation: 7,
              singleCore: identity.singleCore,
              multiCore: identity.multiCore,
              minimumUniqueResults: PROCESSOR_CATALOGUE_SOURCE.minimumUniqueResults,
            },
          ]
        : undefined,
  }),
);

const GENERATED_MAC_CATALOGUE: readonly ProcessorCatalogueEntry[] = GENERATED_MAC_IDENTITIES.map(
  (identity) =>
    identity.key === 'mac-mac-mini-2024-10c-cpu'
      ? {
          ...identity,
          processorPaths: ['/processors/apple-m4'],
          requiredConfiguration: {
            ...identity.requiredConfiguration,
            modelIdentifier: 'Mac16,10',
          },
        }
      : { ...identity, hardware: REVIEWED_HARDWARE[identity.key] },
);

/** Apple identities carry published memory facts only.
 *
 * Apple chips are absent from the Geekbench 7 Processor Benchmark Chart, so
 * these entries intentionally have no `scoreReferences` and render no average.
 * Each `requiredConfiguration.physicalCores` keeps the shared family alias
 * unique against the generated Mac entries; see the M1 Ultra note above for the
 * case where an existing unconfigured Mac entry owns the alias instead.
 *
 * Apple publishes unified-memory bandwidth per chip but not memory type,
 * transfer rate, or bus width, so only bandwidth is recorded unless an exact
 * technical source supports more (currently only M1 Pro).
 */
function appleIdentity(
  key: string,
  displayName: string,
  alias: string,
  physicalCores: number,
  hardware: HardwareSpecification,
): ProcessorCatalogueEntry {
  return {
    key,
    displayName,
    vendor: 'apple',
    architecture: 'arm',
    pageUrl: hardware.source.url,
    processorPaths: [],
    macPaths: [],
    aliases: [alias],
    requiredConfiguration: { physicalCores },
    hardware,
  };
}

function appleUnifiedMemory(
  bandwidthGBs: number,
  bandwidthQualifier: 'published' | 'up-to',
  source: CatalogueSource,
): HardwareSpecification {
  return { memoryType: 'Unified memory', bandwidthGBs, bandwidthQualifier, source };
}

const REVIEWED_PROCESSOR_IDENTITIES: readonly ProcessorCatalogueEntry[] = [
  // M1 Pro ships in 8- and 10-core bins on one 256-bit interface.
  ...([8, 10] as const).map((cores) =>
    appleIdentity(
      `apple-m1-pro-${cores}c`,
      `Apple M1 Pro (${cores}-core CPU)`,
      'Apple M1 Pro',
      cores,
      {
        memoryType: 'LPDDR5',
        transferRateMTs: 6400,
        busWidthBits: 256,
        bandwidthGBs: 200,
        bandwidthQualifier: 'up-to',
        source: APPLE_M1_PRO_MEMORY_SOURCE,
      },
    ),
  ),
  appleIdentity(
    'apple-m2-8c',
    'Apple M2 (8-core CPU)',
    'Apple M2',
    8,
    appleUnifiedMemory(100, 'published', APPLE_M2_SOURCE),
  ),
  // M2 Pro ships in 10- and 12-core bins sharing one published bandwidth.
  ...([10, 12] as const).map((cores) =>
    appleIdentity(
      `apple-m2-pro-${cores}c`,
      `Apple M2 Pro (${cores}-core CPU)`,
      'Apple M2 Pro',
      cores,
      appleUnifiedMemory(200, 'published', APPLE_M2_PRO_MAX_SOURCE),
    ),
  ),
  appleIdentity(
    'apple-m2-max-12c',
    'Apple M2 Max (12-core CPU)',
    'Apple M2 Max',
    12,
    appleUnifiedMemory(400, 'published', APPLE_M2_PRO_MAX_SOURCE),
  ),
  appleIdentity(
    'apple-m2-ultra-24c',
    'Apple M2 Ultra (24-core CPU)',
    'Apple M2 Ultra',
    24,
    appleUnifiedMemory(800, 'published', APPLE_M2_ULTRA_SOURCE),
  ),
  appleIdentity('apple-m3-8c', 'Apple M3 (8-core CPU)', 'Apple M3', 8, {
    memoryType: 'LPDDR5',
    transferRateMTs: 6400,
    busWidthBits: 128,
    bandwidthGBs: 102.4,
    bandwidthQualifier: 'published',
    source: WIKIPEDIA_APPLE_M3_SOURCE,
  }),
  // M3 Pro ships in 11- and 12-core bins that share one memory configuration.
  ...([11, 12] as const).map((cores) =>
    appleIdentity(
      `apple-m3-pro-${cores}c`,
      `Apple M3 Pro (${cores}-core CPU)`,
      'Apple M3 Pro',
      cores,
      {
        memoryType: 'LPDDR5',
        transferRateMTs: 6400,
        busWidthBits: 192,
        bandwidthGBs: 153.6,
        bandwidthQualifier: 'published',
        source: WIKIPEDIA_APPLE_M3_SOURCE,
      },
    ),
  ),
  // The M3 Max bins differ in bandwidth: the 14-core part populates fewer memory
  // controllers than the 16-core part.
  appleIdentity('apple-m3-max-14c', 'Apple M3 Max (14-core CPU)', 'Apple M3 Max', 14, {
    memoryType: 'LPDDR5',
    transferRateMTs: 6400,
    bandwidthGBs: 300,
    bandwidthQualifier: 'published',
    source: WIKIPEDIA_APPLE_M3_SOURCE,
  }),
  appleIdentity('apple-m3-max-16c', 'Apple M3 Max (16-core CPU)', 'Apple M3 Max', 16, {
    memoryType: 'LPDDR5',
    transferRateMTs: 6400,
    bandwidthGBs: 400,
    bandwidthQualifier: 'published',
    source: WIKIPEDIA_APPLE_M3_SOURCE,
  }),
  // M3 Ultra ships in 28- and 32-core bins sharing one published bandwidth.
  ...([28, 32] as const).map((cores) =>
    appleIdentity(
      `apple-m3-ultra-${cores}c`,
      `Apple M3 Ultra (${cores}-core CPU)`,
      'Apple M3 Ultra',
      cores,
      appleUnifiedMemory(800, 'up-to', APPLE_M3_ULTRA_SOURCE),
    ),
  ),
  // M4 ships in 8-, 9-, and 10-core bins sharing one published bandwidth.
  ...([8, 9, 10] as const).map((cores) =>
    appleIdentity(
      `apple-m4-${cores}c`,
      `Apple M4 (${cores}-core CPU)`,
      'Apple M4',
      cores,
      appleUnifiedMemory(120, 'published', APPLE_M4_FAMILY_SOURCE),
    ),
  ),
  appleIdentity(
    'apple-m4-pro-12c',
    'Apple M4 Pro (12-core CPU)',
    'Apple M4 Pro',
    12,
    appleUnifiedMemory(273, 'published', APPLE_M4_PRO_SOURCE),
  ),
  appleIdentity(
    'apple-m4-pro-14c',
    'Apple M4 Pro (14-core CPU)',
    'Apple M4 Pro',
    14,
    appleUnifiedMemory(273, 'published', APPLE_M4_PRO_SOURCE),
  ),
  // Apple states 546 GB/s for M4 Max but publishes nothing for the 14-core bin.
  appleIdentity('apple-m4-max-14c', 'Apple M4 Max (14-core CPU)', 'Apple M4 Max', 14, {
    memoryType: 'LPDDR5X',
    transferRateMTs: 8533,
    bandwidthGBs: 410,
    bandwidthQualifier: 'published',
    source: WIKIPEDIA_APPLE_M4_SOURCE,
  }),
  appleIdentity(
    'apple-m4-max-16c',
    'Apple M4 Max (16-core CPU)',
    'Apple M4 Max',
    16,
    appleUnifiedMemory(546, 'up-to', APPLE_M4_PRO_MAX_SOURCE),
  ),
  // M5 ships in 9- and 10-core bins sharing one published bandwidth.
  ...([9, 10] as const).map((cores) =>
    appleIdentity(
      `apple-m5-${cores}c`,
      `Apple M5 (${cores}-core CPU)`,
      'Apple M5',
      cores,
      appleUnifiedMemory(153, 'published', APPLE_M5_SOURCE),
    ),
  ),
  // M5 Pro ships in 15- and 18-core bins sharing one published bandwidth.
  ...([15, 18] as const).map((cores) =>
    appleIdentity(
      `apple-m5-pro-${cores}c`,
      `Apple M5 Pro (${cores}-core CPU)`,
      'Apple M5 Pro',
      cores,
      appleUnifiedMemory(307, 'up-to', APPLE_M5_PRO_MAX_SOURCE),
    ),
  ),
  appleIdentity(
    'apple-m5-max-18c',
    'Apple M5 Max (18-core CPU)',
    'Apple M5 Max',
    18,
    appleUnifiedMemory(614, 'up-to', APPLE_M5_PRO_MAX_SOURCE),
  ),
];

/** Reviewed chart identities plus explicitly observed device catalogue links. */
export const PROCESSOR_CATALOGUE: readonly ProcessorCatalogueEntry[] = [
  ...GENERATED_CATALOGUE,
  ...GENERATED_MAC_CATALOGUE,
  ...REVIEWED_PROCESSOR_IDENTITIES,
];
