import type { GeekbenchGeneration } from '../geekbench/generation';
import { getV6SupportedInstructions } from './benchmarkMap';
import { getV7SupportedInstructions } from './benchmarkMapV7';
import type { Instruction } from './instructions';

export interface WorkloadInstructions {
  instructions: Instruction[];
  /**
   * Present only when a generation's mapping is unconfirmed. Rendering this
   * as an amber warning is what keeps inferred Geekbench 7 mappings from
   * reading like documented fact, so it must survive any refactor here.
   */
  confidenceNote?: string;
}

const NONE: WorkloadInstructions = { instructions: [] };

/**
 * Resolves the accelerating instructions a workload is known to use, for the
 * generation of the page being annotated.
 *
 * Geekbench 6 mappings come from the published benchmark-internals document and
 * carry no note. Geekbench 7 mappings are inferred and always carry one. Keep
 * this the only place that branches on generation for workload lookup.
 */
export function workloadInstructions(
  generation: GeekbenchGeneration,
  benchmarkName: string,
  availableInstructions: Set<string>,
): WorkloadInstructions {
  // Captured Geekbench 5 payloads and pages expose no CPU instruction-set
  // capability string, so there is nothing trustworthy to intersect with its
  // distinct workload suite. Processor context remains supported separately.
  if (generation === 5) return NONE;

  if (generation === 6) {
    return { instructions: getV6SupportedInstructions(benchmarkName, availableInstructions) };
  }

  const match = getV7SupportedInstructions(benchmarkName, availableInstructions);
  if (!match) return NONE;

  return { instructions: match.instructions, confidenceNote: match.confidenceNote };
}
