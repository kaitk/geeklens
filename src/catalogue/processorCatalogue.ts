/** Reviewed processor facts and the sources that state them.
 *
 * Publisher tiers, the hosts that block automated retrieval, and what to do with
 * a citation that has rotted are in `docs/processor-catalogue-sources.md`. Read
 * it before re-dating a `retrievedOn` or swapping a URL: the date means the page
 * was read and still stated the claim, so moving it forward without re-reading
 * removes the only check these facts have.
 */
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
  coreComposition?: CoreComposition;
  l3CacheDispute?: ReportedValueDispute;
  scoreReferences?: readonly GeekbenchScoreReference[];
}

/** A value Geekbench reports that a reviewed source contradicts.
 *
 * The reported value is left exactly as Geekbench printed it and marked, rather
 * than replaced: the disagreement is the fact worth stating, and a quietly
 * substituted number would be indistinguishable from a measurement. `detail`
 * says what is wrong and what the source states instead. */
export interface ReportedValueDispute {
  detail: string;
  source: CatalogueSource;
}

/** One named group of cores, at the count the source states for the full part.
 *
 * `count` is nominal, so it is an upper bound rather than an observation: a
 * result may report fewer cores in this group when some are disabled. `label` is
 * recorded in the vendor's own wording and is never normalized across vendors.
 * Zen 5c is the case that makes this a correctness rule rather than a style
 * choice: it is the same microarchitecture at the same IPC as Zen 5, differing
 * in peak clock and L3 per CCX, so filing it under "efficiency" would state
 * something false. Intel's Low Power Efficient-cores are likewise not its
 * Efficient-cores, and Apple uses neither vocabulary.
 *
 * Within one vendor the wording is settled to the terms that vendor's current
 * range uses, rather than reproducing every phrasing its older announcements
 * happened to carry. Apple is the only range this applies to today: see
 * `APPLE_CORE_TIERS` for the three terms it is held to and what that costs. */
export interface CoreCompositionGroup {
  count: number;
  label: string;
}

/** What kinds of core a heterogeneous processor holds.
 *
 * The payload cannot supply this. Its per-cluster label only ever restates a
 * size (`6 Cores`), and neither cluster size nor cluster order identifies a
 * role: the 13900K's larger cluster is its E-cores, and vendors list clusters
 * fastest-first or slowest-first with no consistency between them.
 *
 * Groups are held apart rather than as one sentence so a reported cluster can be
 * matched to the group it belongs to. They stay in the source's own order, which
 * is the order they are presented in.
 */
export interface CoreComposition {
  groups: readonly CoreCompositionGroup[];
  source: CatalogueSource;
}

/** The composition as a sentence, used wherever the groups cannot be attached to
 * individual clusters. */
export function coreCompositionDescription(composition: CoreComposition): string {
  return composition.groups.map((group) => `${group.count} ${group.label}`).join(' + ');
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

/** Apple publishes only the headline bin of each chip in its newsroom posts, so
 * the binned configurations come from this per-generation summary, which cites
 * the primary sources. It also records the M5 rename that the October 2025 M5
 * post predates. */
const WIKIPEDIA_APPLE_M5_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Apple_M5',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
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

const WIKIPEDIA_APPLE_M2_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Apple_M2',
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

/** Core-type splits for x86 hybrids come from the same weaker tier.
 *
 * AMD markets Strix Point as a flat core count and does not publish the
 * Zen 5 / Zen 5c division on its product pages. Intel ARK does list P-core and
 * E-core counts as separate fields, but serves 403 to automated retrieval, and a
 * page that cannot be retrieved must not be cited as though it had been. These
 * tables state the split for both vendors and the publisher stays visible in the
 * provenance tooltip. */
const WIKIPEDIA_ZEN_5_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Zen_5',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

/** The Zen 4 article carries no per-SKU cache table; this section of the Ryzen
 * list is where the Raphael figures actually are. */
const WIKIPEDIA_ZEN_4_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/List_of_AMD_Ryzen_processors#Raphael_(7000_series,_Zen_4/RDNA2_based)',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

const WIKIPEDIA_ALDER_LAKE_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Alder_Lake',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

const WIKIPEDIA_RAPTOR_LAKE_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Raptor_Lake',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

const WIKIPEDIA_ARROW_LAKE_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Arrow_Lake_(microprocessor)',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

const WIKIPEDIA_METEOR_LAKE_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Meteor_Lake',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

const WIKIPEDIA_LUNAR_LAKE_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Lunar_Lake',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

const WIKIPEDIA_PANTHER_LAKE_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Panther_Lake_(microprocessor)',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

const QUALCOMM_X2_SOURCE: CatalogueSource = {
  url: 'https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-X2-Elite-Product-Brief.pdf',
  retrievedOn: '2026-08-01',
  publisher: 'Qualcomm',
};

/** The X Series product briefs state each SKU's core count in a single `Cores`
 * column with no tier rows, which is how they record that these parts are
 * uniform Oryon designs rather than hybrids. The X2 brief above adds separate
 * `Prime Cores` and `Performance Cores` rows, which is the split this
 * generation introduced. */
const QUALCOMM_X1_ELITE_BRIEF_SOURCE: CatalogueSource = {
  url: 'https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Product-Brief-Snapdragon-X-Elite.pdf',
  retrievedOn: '2026-08-01',
  publisher: 'Qualcomm',
};

const QUALCOMM_X1_PLUS_BRIEF_SOURCE: CatalogueSource = {
  url: 'https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-X-Plus-Product-Brief.pdf',
  retrievedOn: '2026-08-01',
  publisher: 'Qualcomm',
};

/** Qualcomm publishes no retrievable brief for the entry-level Snapdragon X:
 * the product page 404s and the brief PDF carries its specification table as
 * unextractable artwork. This list states the core count for that one part. */
const WIKIPEDIA_SNAPDRAGON_X_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/List_of_Qualcomm_Snapdragon_systems_on_chips#Snapdragon_X_series',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
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
function sharedCoreComposition(
  keys: readonly string[],
  groups: readonly CoreCompositionGroup[],
  source: CatalogueSource,
): Record<string, CoreComposition> {
  return Object.fromEntries(keys.map((key) => [key, { groups, source }]));
}

function coreGroup(count: number, label: string): CoreCompositionGroup {
  return { count, label };
}

/** Intel's own naming, in its own order. Low Power Efficient-cores sit on the
 * SoC tile and are not the same group as the Efficient-cores beside them, which
 * is why they are counted separately rather than folded in. */
function intelHybrid(
  performance: number,
  efficient: number,
  lowPowerEfficient?: number,
): CoreCompositionGroup[] {
  const groups = [
    coreGroup(performance, 'Performance-cores'),
    coreGroup(efficient, 'Efficient-cores'),
  ];
  if (lowPowerEfficient) groups.push(coreGroup(lowPowerEfficient, 'Low Power Efficient-cores'));
  return groups;
}

/** The three terms Apple's current range uses, written lowercase and unhyphenated
 * as Apple writes them. They are not Intel's vocabulary and must not be folded
 * into it.
 *
 * Apple's older announcements say `high-performance`, `high-efficiency`, and
 * `energy-efficient` for what its current pages call performance and efficiency
 * cores. Those are phrasings of the same two tiers rather than distinct designs,
 * so every Apple entry is held to these terms instead.
 *
 * `super` is the exception that has to survive that settling, because it marks a
 * real design boundary rather than a phrasing. Apple introduced the M5's top
 * core as a performance core and renamed it to a super core when M5 Pro and
 * M5 Max shipped a genuinely different second tier under the older name. So an
 * M5 Pro `performance core` is not an M4 Pro `performance core`, and the source
 * on each row is what separates them. */
const APPLE_CORE_TIERS = {
  super: 'super cores',
  performance: 'performance cores',
  efficiency: 'efficiency cores',
} as const;

type AppleCoreTier = keyof typeof APPLE_CORE_TIERS;

/** Apple has shipped two tiers per chip throughout, but not the same two: which
 * pair a part holds is a fact about that part and is passed in per entry. */
function appleHybrid(
  first: number,
  firstTier: AppleCoreTier,
  second: number,
  secondTier: AppleCoreTier,
): CoreCompositionGroup[] {
  return [
    coreGroup(first, APPLE_CORE_TIERS[firstTier]),
    coreGroup(second, APPLE_CORE_TIERS[secondTier]),
  ];
}

const REVIEWED_CORE_COMPOSITIONS: Readonly<Record<string, CoreComposition>> = {
  // Zen 5c is a density-optimized Zen 5, not an efficiency core: same
  // microarchitecture and IPC, lower peak clock and less L3 per CCX. AMD's own
  // naming is therefore the only accurate wording available.
  'amd-ryzen-ai-9-hx-370': {
    groups: [coreGroup(4, 'Zen 5'), coreGroup(8, 'Zen 5c')],
    source: WIKIPEDIA_ZEN_5_SOURCE,
  },
  'amd-ryzen-ai-9-365': {
    groups: [coreGroup(6, 'Zen 5'), coreGroup(4, 'Zen 5c')],
    source: WIKIPEDIA_ZEN_5_SOURCE,
  },
  ...sharedCoreComposition(
    ['intel-core-i9-12900k', 'intel-core-i9-12900kf'],
    intelHybrid(8, 8),
    WIKIPEDIA_ALDER_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    ['intel-core-i7-12700k', 'intel-core-i7-12700kf', 'intel-core-i7-12700f'],
    intelHybrid(8, 4),
    WIKIPEDIA_ALDER_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    ['intel-core-i5-12600k', 'intel-core-i5-12600kf'],
    intelHybrid(6, 4),
    WIKIPEDIA_ALDER_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    ['intel-core-i7-1265u', 'intel-core-i5-1235u'],
    intelHybrid(2, 8),
    WIKIPEDIA_ALDER_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(['intel-core-i3-1215u'], intelHybrid(2, 4), WIKIPEDIA_ALDER_LAKE_SOURCE),
  ...sharedCoreComposition(
    [
      'intel-core-i9-13900ks',
      'intel-core-i9-13900k',
      'intel-core-i9-13900kf',
      'intel-core-i9-14900ks',
      'intel-core-i9-14900k',
      'intel-core-i9-14900kf',
      'intel-core-i9-14900',
      'intel-core-i9-14900hx',
    ],
    intelHybrid(8, 16),
    WIKIPEDIA_RAPTOR_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    ['intel-core-i7-13700k', 'intel-core-i7-13700kf', 'intel-core-i7-13700'],
    intelHybrid(8, 8),
    WIKIPEDIA_RAPTOR_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    [
      'intel-core-i7-14700k',
      'intel-core-i7-14700kf',
      'intel-core-i7-14700',
      'intel-core-i7-14700f',
      'intel-core-i7-14700hx',
    ],
    intelHybrid(8, 12),
    WIKIPEDIA_RAPTOR_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    ['intel-core-i7-14650hx'],
    intelHybrid(8, 8),
    WIKIPEDIA_RAPTOR_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    [
      'intel-core-i5-13600k',
      'intel-core-i5-13600kf',
      'intel-core-i5-13500',
      'intel-core-i5-14600k',
      'intel-core-i5-14600kf',
      'intel-core-i5-14500',
      'intel-core-i5-14500t',
    ],
    intelHybrid(6, 8),
    WIKIPEDIA_RAPTOR_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    ['intel-core-i5-13400f', 'intel-core-i5-14400', 'intel-core-i5-14400f'],
    intelHybrid(6, 4),
    WIKIPEDIA_RAPTOR_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    ['intel-core-ultra-9-185h'],
    intelHybrid(6, 8, 2),
    WIKIPEDIA_METEOR_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    ['intel-core-ultra-7-165u'],
    intelHybrid(2, 8, 2),
    WIKIPEDIA_METEOR_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    ['intel-core-ultra-9-285k', 'intel-core-ultra-9-275hx'],
    intelHybrid(8, 16),
    WIKIPEDIA_ARROW_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    ['intel-core-ultra-7-265k'],
    intelHybrid(8, 12),
    WIKIPEDIA_ARROW_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    ['intel-core-ultra-9-285h', 'intel-core-ultra-7-255h'],
    intelHybrid(6, 8, 2),
    WIKIPEDIA_ARROW_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    ['intel-core-ultra-7-258v', 'intel-core-ultra-7-256v'],
    intelHybrid(4, 4),
    WIKIPEDIA_LUNAR_LAKE_SOURCE,
  ),
  ...sharedCoreComposition(
    ['intel-core-ultra-x9-388h'],
    intelHybrid(4, 8, 4),
    WIKIPEDIA_PANTHER_LAKE_SOURCE,
  ),
  // Qualcomm's X2 brief is the first to state a split: separate `Prime Cores`
  // and `Performance Cores` rows against the single `Cores` column the X1
  // briefs carry. Both 18-core parts hold the same 12 + 6.
  ...sharedCoreComposition(
    ['snapdragon-x2-elite-extreme-x2e-94-100', 'snapdragon-x2-elite-x2e-88-100'],
    [coreGroup(12, 'Prime cores'), coreGroup(6, 'Performance cores')],
    QUALCOMM_X2_SOURCE,
  ),
  // Every X1 part is one uniform group, so these state that the part has no
  // split rather than naming one. A single group cannot label the reported
  // clusters — there is nothing to tell apart — and renders as the sentence
  // alone, which is the point: two reported clusters of Oryon cores otherwise
  // leave a reader guessing at a hybrid that does not exist.
  ...sharedCoreComposition(
    [
      'snapdragon-x-elite-x1e-84-100',
      'snapdragon-x-elite-x1e-80-100',
      'snapdragon-x-elite-x1e-78-100',
    ],
    [coreGroup(12, 'Qualcomm Oryon CPU cores')],
    QUALCOMM_X1_ELITE_BRIEF_SOURCE,
  ),
  'snapdragon-x-plus-x1p-64-100': {
    groups: [coreGroup(10, 'Qualcomm Oryon CPU cores')],
    source: QUALCOMM_X1_PLUS_BRIEF_SOURCE,
  },
  'snapdragon-x-plus-x1p-42-100': {
    groups: [coreGroup(8, 'Qualcomm Oryon CPU cores')],
    source: QUALCOMM_X1_PLUS_BRIEF_SOURCE,
  },
  'snapdragon-x-x1-26-100': {
    groups: [coreGroup(8, 'Oryon cores')],
    source: WIKIPEDIA_SNAPDRAGON_X_SOURCE,
  },
  // Apple, oldest first. The processor-keyed entries below are paired with
  // `mac-*` entries further down: those resolve by Mac path rather than by
  // processor name, so they need their own composition even where the split is
  // the same.
  'apple-m1-pro-8c': {
    groups: appleHybrid(6, 'performance', 2, 'efficiency'),
    source: WIKIPEDIA_APPLE_M1_SOURCE,
  },
  'apple-m1-pro-10c': {
    groups: appleHybrid(8, 'performance', 2, 'efficiency'),
    source: APPLE_M1_PRO_MEMORY_SOURCE,
  },
  'apple-m2-8c': {
    groups: appleHybrid(4, 'performance', 4, 'efficiency'),
    source: WIKIPEDIA_APPLE_M2_SOURCE,
  },
  // Apple's M2 Pro post states only the 12-core bin ("up to eight
  // high-performance cores and four high-efficiency cores"), so the 10-core
  // bin's 6 + 4 comes from the summary instead.
  'apple-m2-pro-10c': {
    groups: appleHybrid(6, 'performance', 4, 'efficiency'),
    source: WIKIPEDIA_APPLE_M2_SOURCE,
  },
  'apple-m2-pro-12c': {
    groups: appleHybrid(8, 'performance', 4, 'efficiency'),
    source: APPLE_M2_PRO_MAX_SOURCE,
  },
  'apple-m2-max-12c': {
    groups: appleHybrid(8, 'performance', 4, 'efficiency'),
    source: APPLE_M2_PRO_MAX_SOURCE,
  },
  'apple-m2-ultra-24c': {
    groups: appleHybrid(16, 'performance', 8, 'efficiency'),
    source: APPLE_M2_ULTRA_SOURCE,
  },
  'apple-m3-8c': {
    groups: appleHybrid(4, 'performance', 4, 'efficiency'),
    source: WIKIPEDIA_APPLE_M3_SOURCE,
  },
  'apple-m3-pro-11c': {
    groups: appleHybrid(5, 'performance', 6, 'efficiency'),
    source: WIKIPEDIA_APPLE_M3_SOURCE,
  },
  'apple-m3-pro-12c': {
    groups: appleHybrid(6, 'performance', 6, 'efficiency'),
    source: WIKIPEDIA_APPLE_M3_SOURCE,
  },
  'apple-m3-max-14c': {
    groups: appleHybrid(10, 'performance', 4, 'efficiency'),
    source: WIKIPEDIA_APPLE_M3_SOURCE,
  },
  'apple-m3-max-16c': {
    groups: appleHybrid(12, 'performance', 4, 'efficiency'),
    source: WIKIPEDIA_APPLE_M3_SOURCE,
  },
  'apple-m3-ultra-28c': {
    groups: appleHybrid(20, 'performance', 8, 'efficiency'),
    source: WIKIPEDIA_APPLE_M3_SOURCE,
  },
  'apple-m3-ultra-32c': {
    groups: appleHybrid(24, 'performance', 8, 'efficiency'),
    source: APPLE_M3_ULTRA_SOURCE,
  },
  // The 8-core M4 has no single answer and so has no entry: it is 4 + 4 in the
  // two-port iMac and the MacBook Air, and 3 + 5 in the iPad Air. A result
  // matching `Apple M4` at 8 cores could be either, so only the Mac-path entry
  // below, where the machine is known, states a split.
  'apple-m4-9c': {
    groups: appleHybrid(3, 'performance', 6, 'efficiency'),
    source: WIKIPEDIA_APPLE_M4_SOURCE,
  },
  'apple-m4-10c': {
    groups: appleHybrid(4, 'performance', 6, 'efficiency'),
    source: APPLE_M4_FAMILY_SOURCE,
  },
  'apple-m4-pro-12c': {
    groups: appleHybrid(8, 'performance', 4, 'efficiency'),
    source: APPLE_M4_PRO_MAX_SOURCE,
  },
  'apple-m4-pro-14c': {
    groups: appleHybrid(10, 'performance', 4, 'efficiency'),
    source: APPLE_M4_PRO_MAX_SOURCE,
  },
  'apple-m4-max-14c': {
    groups: appleHybrid(10, 'performance', 4, 'efficiency'),
    source: APPLE_M4_PRO_MAX_SOURCE,
  },
  'apple-m4-max-16c': {
    groups: appleHybrid(12, 'performance', 4, 'efficiency'),
    source: APPLE_M4_PRO_MAX_SOURCE,
  },
  // The base M5 pairs super cores with efficiency cores; M5 Pro and M5 Max
  // replace the efficiency cores with a second tier Apple calls performance
  // cores. The two chips genuinely differ here, so the terms differ with them.
  'apple-m5-9c': {
    groups: appleHybrid(3, 'super', 6, 'efficiency'),
    source: WIKIPEDIA_APPLE_M5_SOURCE,
  },
  'apple-m5-10c': {
    groups: appleHybrid(4, 'super', 6, 'efficiency'),
    source: WIKIPEDIA_APPLE_M5_SOURCE,
  },
  'apple-m5-pro-15c': {
    groups: appleHybrid(5, 'super', 10, 'performance'),
    source: WIKIPEDIA_APPLE_M5_SOURCE,
  },
  ...sharedCoreComposition(
    ['apple-m5-pro-18c', 'apple-m5-max-18c'],
    appleHybrid(6, 'super', 12, 'performance'),
    APPLE_M5_PRO_MAX_SOURCE,
  ),
  // Mac-path entries. Each states the split of the chip that machine ships.
  ...sharedCoreComposition(
    [
      'mac-mac-mini-late-2020',
      'mac-imac-24-inch-mid-2021',
      'mac-imac-24-inch-mid-2021-apple-m1-3-2-ghz-8-cores',
    ],
    appleHybrid(4, 'performance', 4, 'efficiency'),
    WIKIPEDIA_APPLE_M1_SOURCE,
  ),
  'mac-mac-studio-apple-m1-max': {
    groups: appleHybrid(8, 'performance', 2, 'efficiency'),
    source: WIKIPEDIA_APPLE_M1_SOURCE,
  },
  'mac-mac-studio-apple-m1-ultra': {
    groups: appleHybrid(16, 'performance', 4, 'efficiency'),
    source: APPLE_M1_ULTRA_SOURCE,
  },
  'mac-mac-mini-2023-8c-cpu': {
    groups: appleHybrid(4, 'performance', 4, 'efficiency'),
    source: WIKIPEDIA_APPLE_M2_SOURCE,
  },
  'mac-mac-mini-2023-10c-cpu': {
    groups: appleHybrid(6, 'performance', 4, 'efficiency'),
    source: WIKIPEDIA_APPLE_M2_SOURCE,
  },
  'mac-mac-mini-2023-12c-cpu': {
    groups: appleHybrid(8, 'performance', 4, 'efficiency'),
    source: APPLE_M2_PRO_MAX_SOURCE,
  },
  // Both 2023 iMac entries are the 8-core M3; they differ in GPU cores only.
  ...sharedCoreComposition(
    ['mac-imac-24-inch-2023-8c-gpu', 'mac-imac-24-inch-2023-10c-gpu'],
    appleHybrid(4, 'performance', 4, 'efficiency'),
    WIKIPEDIA_APPLE_M3_SOURCE,
  ),
  'mac-imac-24-inch-2024-8c-cpu': {
    groups: appleHybrid(4, 'performance', 4, 'efficiency'),
    source: WIKIPEDIA_APPLE_M4_SOURCE,
  },
  ...sharedCoreComposition(
    ['mac-mac-mini-2024-10c-cpu', 'mac-imac-24-inch-2024-10c-cpu'],
    appleHybrid(4, 'performance', 6, 'efficiency'),
    APPLE_M4_FAMILY_SOURCE,
  ),
  'mac-mac-mini-2024-12c-cpu': {
    groups: appleHybrid(8, 'performance', 4, 'efficiency'),
    source: APPLE_M4_PRO_MAX_SOURCE,
  },
  'mac-mac-mini-2024-14c-cpu': {
    groups: appleHybrid(10, 'performance', 4, 'efficiency'),
    source: APPLE_M4_PRO_MAX_SOURCE,
  },
};

/** Processors whose reported L3 total cannot be believed.
 *
 * Geekbench states L3 as a size and a die count, and multiplies one die's size
 * by the count. That is right for the symmetric parts it was built for and wrong
 * for exactly one shape: a dual-die Ryzen with 3D V-Cache on only one of the two
 * dies, whose dies are not the same size.
 *
 * Which die gets read is not stable, so the wording must not name one. The same
 * 9950X3D has been observed reporting `96.0 MB x 2` (192 MB, the V-Cache die
 * doubled) and `32.0 MB x 2` (64 MB, the other die doubled). Both are wrong
 * against an actual 96 + 32, and only the total is safe to state.
 *
 * Keyed by SKU rather than matched on an `X3D` name, because the name says
 * nothing about the shape. Single-die X3D parts (9800X3D, 7800X3D, 5800X3D)
 * report correctly, and a dual-V-Cache part would too, since doubling one die is
 * then the right answer. Only the asymmetric four belong here.
 */
const ASYMMETRIC_V_CACHE_DETAIL =
  'Geekbench multiplies one die’s L3 by the die count, so this total is likely wrong: the two dies differ. This processor is published as 128 MB.';

const REVIEWED_L3_CACHE_DISPUTES: Readonly<Record<string, ReportedValueDispute>> = {
  'amd-ryzen-9-7900x3d': { detail: ASYMMETRIC_V_CACHE_DETAIL, source: WIKIPEDIA_ZEN_4_SOURCE },
  'amd-ryzen-9-7950x3d': { detail: ASYMMETRIC_V_CACHE_DETAIL, source: WIKIPEDIA_ZEN_4_SOURCE },
  'amd-ryzen-9-9900x3d': { detail: ASYMMETRIC_V_CACHE_DETAIL, source: WIKIPEDIA_ZEN_5_SOURCE },
  'amd-ryzen-9-9950x3d': { detail: ASYMMETRIC_V_CACHE_DETAIL, source: WIKIPEDIA_ZEN_5_SOURCE },
};

/** Reviewed chart identities plus explicitly observed device catalogue links. */
export const PROCESSOR_CATALOGUE: readonly ProcessorCatalogueEntry[] = [
  ...GENERATED_CATALOGUE,
  ...GENERATED_MAC_CATALOGUE,
  ...REVIEWED_PROCESSOR_IDENTITIES,
].map((entry) => {
  const coreComposition = REVIEWED_CORE_COMPOSITIONS[entry.key];
  const l3CacheDispute = REVIEWED_L3_CACHE_DISPUTES[entry.key];
  if (!coreComposition && !l3CacheDispute) return entry;
  return {
    ...entry,
    ...(coreComposition ? { coreComposition } : {}),
    ...(l3CacheDispute ? { l3CacheDispute } : {}),
  };
});
