import type { CoreComposition, CoreCompositionGroup } from '../catalogue.types';
import {
  APPLE_M1_PRO_MEMORY_SOURCE,
  APPLE_M1_ULTRA_SOURCE,
  APPLE_M2_PRO_MAX_SOURCE,
  APPLE_M2_ULTRA_SOURCE,
  APPLE_M3_ULTRA_SOURCE,
  APPLE_M4_FAMILY_SOURCE,
  APPLE_M4_PRO_MAX_SOURCE,
  APPLE_M5_PRO_MAX_SOURCE,
  WIKIPEDIA_APPLE_M1_SOURCE,
  WIKIPEDIA_APPLE_M2_SOURCE,
  WIKIPEDIA_APPLE_M3_SOURCE,
  WIKIPEDIA_APPLE_M4_SOURCE,
  WIKIPEDIA_APPLE_M5_SOURCE,
} from '../catalogueSources';
import { coreGroup, sharedCoreComposition } from './helpers';

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

export const APPLE_CORE_COMPOSITIONS: Readonly<Record<string, CoreComposition>> = {
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
