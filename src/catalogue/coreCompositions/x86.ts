import type { CoreComposition } from '../catalogue.types';
import {
  WIKIPEDIA_ALDER_LAKE_SOURCE,
  WIKIPEDIA_ARROW_LAKE_SOURCE,
  WIKIPEDIA_LUNAR_LAKE_SOURCE,
  WIKIPEDIA_METEOR_LAKE_SOURCE,
  WIKIPEDIA_PANTHER_LAKE_SOURCE,
  WIKIPEDIA_RAPTOR_LAKE_SOURCE,
  WIKIPEDIA_ZEN_5_SOURCE,
} from '../catalogueSources';
import { coreGroup, intelHybrid, sharedCoreComposition } from './helpers';

export const X86_CORE_COMPOSITIONS: Readonly<Record<string, CoreComposition>> = {
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
};
