import type { GeekbenchGeneration } from './generation';

export interface InstructionDataStatus {
  text: string;
  type: 'info' | 'warning';
  /**
   * Set when signing in is what unblocks the data, so the banner can offer the
   * link. Kept as a flag rather than a URL: these functions stay pure, and the
   * destination is only knowable from the rendered page.
   */
  action?: 'sign-in';
}

export function initialInstructionStatus(
  generation: GeekbenchGeneration,
  signedOut: boolean,
): InstructionDataStatus {
  if (generation === 7 && signedOut) {
    return {
      text: 'GeekLens: Sign in to load instruction data',
      type: 'warning',
      action: 'sign-in',
    };
  }

  return {
    text: 'GeekLens: Loading instruction data…',
    type: 'info',
  };
}

export function singleResultInstructionStatus(
  generation: GeekbenchGeneration,
  hasInstructions: boolean,
): InstructionDataStatus {
  if (hasInstructions) {
    return { text: 'GeekLens Active', type: 'info' };
  }

  return generation === 7
    ? {
        text: 'GeekLens: Sign in to load instruction data',
        type: 'warning',
        action: 'sign-in',
      }
    : {
        text: 'GeekLens: No instruction data available',
        type: 'warning',
      };
}

export function comparisonInstructionStatus(
  generation: GeekbenchGeneration,
  hasPrimaryInstructions: boolean,
  hasBaselineInstructions: boolean,
  predatesInstructionData: { primary: boolean; baseline: boolean } = {
    primary: false,
    baseline: false,
  },
): InstructionDataStatus {
  if (hasPrimaryInstructions && hasBaselineInstructions) {
    return { text: 'GeekLens Active', type: 'info' };
  }

  if (hasPrimaryInstructions || hasBaselineInstructions) {
    if (generation === 6) {
      const unavailableResult =
        !hasPrimaryInstructions && predatesInstructionData.primary
          ? 'primary'
          : !hasBaselineInstructions && predatesInstructionData.baseline
            ? 'baseline'
            : null;

      if (unavailableResult) {
        return {
          text: `GeekLens: Partial data — ${unavailableResult} result predates Geekbench 6.4`,
          type: 'warning',
        };
      }
    }

    return generation === 7
      ? {
          text: 'GeekLens: Partial data — sign in and reload',
          type: 'warning',
          action: 'sign-in',
        }
      : {
          text: 'GeekLens: Partial instruction data',
          type: 'warning',
        };
  }

  if (generation === 6 && predatesInstructionData.primary && predatesInstructionData.baseline) {
    return {
      text: 'GeekLens: No instruction data — both results predate Geekbench 6.4',
      type: 'warning',
    };
  }

  return singleResultInstructionStatus(generation, false);
}
