import type { GeekbenchGeneration } from './generation';

export interface InstructionDataStatus {
  text: string;
  type: 'info' | 'warning';
}

export function initialInstructionStatus(
  generation: GeekbenchGeneration,
  signedOut: boolean,
): InstructionDataStatus {
  if (generation === 7 && signedOut) {
    return {
      text: 'GeekLens: Sign in to load instruction data',
      type: 'warning',
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
): InstructionDataStatus {
  if (hasPrimaryInstructions && hasBaselineInstructions) {
    return { text: 'GeekLens Active', type: 'info' };
  }

  if (hasPrimaryInstructions || hasBaselineInstructions) {
    return generation === 7
      ? {
          text: 'GeekLens: Partial data — sign in and reload',
          type: 'warning',
        }
      : {
          text: 'GeekLens: Partial instruction data',
          type: 'warning',
        };
  }

  return singleResultInstructionStatus(generation, false);
}
