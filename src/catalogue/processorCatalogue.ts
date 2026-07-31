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
  publisher: 'AnandTech' | 'Apple' | 'Lenovo' | 'Qualcomm';
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
    systemName: 'LENOVO 21CQS02000',
    processorName: 'AMD Ryzen 7 PRO 6850U',
    memoryType: 'LPDDR5',
    transferRateMTs: 6400,
    source: {
      url: 'https://psref.lenovo.com/syspool/Sys/PDF/ThinkPad/ThinkPad_X13_Gen_3_AMD/ThinkPad_X13_Gen_3_AMD_Spec.html',
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

const APPLE_M1_PRO_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2021/10/apple-unveils-game-changing-macbook-pro/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

const APPLE_M1_PRO_MEMORY_SOURCE: CatalogueSource = {
  url: 'https://www.anandtech.com/show/17024/apple-m1-max-performance-review',
  retrievedOn: '2026-08-01',
  publisher: 'AnandTech',
};

const APPLE_M4_PRO_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/uk/newsroom/2024/10/apples-new-mac-mini-is-more-mighty-more-mini-and-built-for-apple-intelligence/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

const QUALCOMM_X2_SOURCE: CatalogueSource = {
  url: 'https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-X2-Elite-Product-Brief.pdf',
  retrievedOn: '2026-08-01',
  publisher: 'Qualcomm',
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

const REVIEWED_PROCESSOR_IDENTITIES: readonly ProcessorCatalogueEntry[] = [
  {
    key: 'apple-m1-pro-10c',
    displayName: 'Apple M1 Pro (10-core CPU)',
    vendor: 'apple',
    architecture: 'arm',
    pageUrl: APPLE_M1_PRO_SOURCE.url,
    processorPaths: [],
    macPaths: [],
    aliases: ['Apple M1 Pro'],
    requiredConfiguration: { physicalCores: 10 },
    hardware: {
      memoryType: 'LPDDR5',
      transferRateMTs: 6400,
      busWidthBits: 256,
      bandwidthGBs: 200,
      bandwidthQualifier: 'up-to',
      source: APPLE_M1_PRO_MEMORY_SOURCE,
    },
  },
];

/** Reviewed chart identities plus explicitly observed device catalogue links. */
export const PROCESSOR_CATALOGUE: readonly ProcessorCatalogueEntry[] = [
  ...GENERATED_CATALOGUE,
  ...GENERATED_MAC_CATALOGUE,
  ...REVIEWED_PROCESSOR_IDENTITIES,
];
