import type { CoreComposition } from './catalogue.types';
import { APPLE_CORE_COMPOSITIONS } from './coreCompositions/apple';
import { QUALCOMM_CORE_COMPOSITIONS } from './coreCompositions/qualcomm';
import { X86_CORE_COMPOSITIONS } from './coreCompositions/x86';

export const REVIEWED_CORE_COMPOSITIONS: Readonly<Record<string, CoreComposition>> = {
  ...X86_CORE_COMPOSITIONS,
  ...QUALCOMM_CORE_COMPOSITIONS,
  ...APPLE_CORE_COMPOSITIONS,
};
