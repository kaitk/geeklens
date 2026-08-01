import type { HardwareSpecification } from './catalogue.types';
import {
  APPLE_M1_ULTRA_SOURCE,
  APPLE_M4_PRO_SOURCE,
  QUALCOMM_X1_SOURCE,
  QUALCOMM_X2_SOURCE,
  WIKIPEDIA_APPLE_M1_SOURCE,
} from './catalogueSources';

export const QUALCOMM_X1_HARDWARE: HardwareSpecification = {
  memoryType: 'LPDDR5x',
  bandwidthGBs: 135,
  bandwidthQualifier: 'up-to',
  source: QUALCOMM_X1_SOURCE,
};

export const APPLE_M1_HARDWARE: HardwareSpecification = {
  memoryType: 'LPDDR4X',
  transferRateMTs: 4266,
  busWidthBits: 128,
  bandwidthGBs: 68.3,
  bandwidthQualifier: 'published',
  source: WIKIPEDIA_APPLE_M1_SOURCE,
};

export const REVIEWED_HARDWARE: Readonly<Record<string, HardwareSpecification>> = {
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
