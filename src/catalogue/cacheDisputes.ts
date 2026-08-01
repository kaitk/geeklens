import type { ReportedValueDispute } from './catalogue.types';
import { WIKIPEDIA_ZEN_4_SOURCE, WIKIPEDIA_ZEN_5_SOURCE } from './catalogueSources';

export const ASYMMETRIC_V_CACHE_DETAIL =
  'Geekbench multiplies one die’s L3 by the die count, so this total is likely wrong: the two dies differ. This processor is published as 128 MB.';

export const REVIEWED_L3_CACHE_DISPUTES: Readonly<Record<string, ReportedValueDispute>> = {
  'amd-ryzen-9-7900x3d': { detail: ASYMMETRIC_V_CACHE_DETAIL, source: WIKIPEDIA_ZEN_4_SOURCE },
  'amd-ryzen-9-7950x3d': { detail: ASYMMETRIC_V_CACHE_DETAIL, source: WIKIPEDIA_ZEN_4_SOURCE },
  'amd-ryzen-9-9900x3d': { detail: ASYMMETRIC_V_CACHE_DETAIL, source: WIKIPEDIA_ZEN_5_SOURCE },
  'amd-ryzen-9-9950x3d': { detail: ASYMMETRIC_V_CACHE_DETAIL, source: WIKIPEDIA_ZEN_5_SOURCE },
};
