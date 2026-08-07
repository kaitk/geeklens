import type { GeekbenchGeneration } from '../geekbench/generation';
import { versionSupportsInstructionSets } from '../geekbench/generation';

export interface ComparisonFetchState {
  generation: GeekbenchGeneration;
  signedOut: boolean;
  hasMetadata: boolean;
  hasInstructions: boolean;
  version: string | null;
}

/** Whether one side of a comparison is missing data its generation can load.
 * Payload-backed generations need metadata; signed-out v6 retains its public
 * HTML instruction-set fallback. Geekbench 5 has no public fallback at all. */
export function needsComparisonResultFetch(state: ComparisonFetchState): boolean {
  if (!state.signedOut || state.generation === 7) return !state.hasMetadata;
  if (state.generation === 5) return false;
  return (
    !state.hasInstructions &&
    (state.version === null || versionSupportsInstructionSets(state.version))
  );
}
