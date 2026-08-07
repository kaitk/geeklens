import { GENERATED_MAC_IDENTITIES } from './generated/macCatalogue.generated';
import { GENERATED_PROCESSOR_IDENTITIES } from './generated/processorCatalogue.generated';
import type {
  CatalogueSource,
  HardwareSpecification,
  ProcessorCatalogueEntry,
} from './catalogue.types';
import {
  APPLE_M1_PRO_MEMORY_SOURCE,
  APPLE_M2_PRO_MAX_SOURCE,
  APPLE_M2_SOURCE,
  APPLE_M2_ULTRA_SOURCE,
  APPLE_M3_ULTRA_SOURCE,
  APPLE_M4_FAMILY_SOURCE,
  APPLE_M4_PRO_SOURCE,
  APPLE_M4_PRO_MAX_SOURCE,
  APPLE_M5_PRO_MAX_SOURCE,
  APPLE_M5_SOURCE,
  MAC_CATALOGUE_SOURCE,
  PROCESSOR_CATALOGUE_SOURCE,
  WIKIPEDIA_APPLE_M3_SOURCE,
  WIKIPEDIA_APPLE_M4_SOURCE,
  WIKIPEDIA_PANTHER_LAKE_SOURCE,
} from './catalogueSources';
import { REVIEWED_HARDWARE } from './processorHardware';

const REVIEWED_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'snapdragon-x2-elite-extreme-x2e-94-100': [
    'Snapdragon(R) X2 Elite Extreme - X2E94100 - Qualcomm Oryon(TM) CPU',
  ],
};

export const GENERATED_CATALOGUE: readonly ProcessorCatalogueEntry[] =
  GENERATED_PROCESSOR_IDENTITIES.map((identity) => ({
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
  }));

export const GENERATED_MAC_CATALOGUE: readonly ProcessorCatalogueEntry[] =
  GENERATED_MAC_IDENTITIES.map((identity) => ({
    ...identity,
    ...(identity.key === 'mac-mac-mini-2024-10c-cpu'
      ? {
          processorPaths: ['/processors/apple-m4'],
          requiredConfiguration: {
            ...identity.requiredConfiguration,
            modelIdentifier: 'Mac16,10',
          },
        }
      : { hardware: REVIEWED_HARDWARE[identity.key] }),
    scoreReferences:
      'singleCore' in identity && 'multiCore' in identity
        ? [
            {
              generation: MAC_CATALOGUE_SOURCE.generation,
              singleCore: identity.singleCore,
              multiCore: identity.multiCore,
            },
          ]
        : undefined,
  }));

/** Apple identities carry published memory facts only.
 *
 * Apple chips are absent from the Geekbench 7 Processor Benchmark Chart, so
 * reviewed chip-family entries intentionally have no `scoreReferences`. Exact
 * generated Mac identities carry averages from the Geekbench 7 Mac table.
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

export const REVIEWED_PROCESSOR_IDENTITIES: readonly ProcessorCatalogueEntry[] = [
  {
    key: 'intel-core-ultra-x9-388h',
    displayName: 'Intel Core Ultra X9 388H',
    vendor: 'intel',
    architecture: 'x86',
    pageUrl: WIKIPEDIA_PANTHER_LAKE_SOURCE.url,
    processorPaths: [],
    macPaths: [],
    aliases: ['Intel Core Ultra X9 388H', 'Intel(R) Core(TM) Ultra X9 388H'],
    requiredConfiguration: { physicalCores: 16 },
  },
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

/** Core compositions, keyed like `REVIEWED_HARDWARE`.
 *
 * The Apple entries reuse a source already reviewed for this catalogue; each of
 * those pages states the CPU core split alongside the memory figures it was
 * originally captured for. Absent entries render exactly as before, so partial
 * coverage is a valid shipping state.
 */
