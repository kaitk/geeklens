import type { CoreComposition } from '../catalogue.types';
import {
  QUALCOMM_X1_ELITE_BRIEF_SOURCE,
  QUALCOMM_X1_PLUS_BRIEF_SOURCE,
  QUALCOMM_X2_SOURCE,
  WIKIPEDIA_SNAPDRAGON_X_SOURCE,
} from '../catalogueSources';
import { coreGroup, sharedCoreComposition } from './helpers';

export const QUALCOMM_CORE_COMPOSITIONS: Readonly<Record<string, CoreComposition>> = {
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
};
