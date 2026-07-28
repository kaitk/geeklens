import type { GeekbenchGeneration } from './generation';

const INSTRUCTION_SETS_METRIC_ID = 20_000;

interface GeekbenchMetric {
  id?: unknown;
  value?: unknown;
}

interface GeekbenchResultPayload {
  document_version?: unknown;
  metrics?: unknown;
}

export function extractInstructionSetsFromPayload(
  payload: unknown,
  expectedGeneration?: GeekbenchGeneration,
): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const result = payload as GeekbenchResultPayload;
  if (expectedGeneration !== undefined && Number(result.document_version) !== expectedGeneration) {
    return null;
  }

  if (!Array.isArray(result.metrics)) return null;

  const metric = (result.metrics as GeekbenchMetric[]).find(
    (candidate) => Number(candidate.id) === INSTRUCTION_SETS_METRIC_ID,
  );
  if (typeof metric?.value !== 'string') return null;

  const instructionSets = metric.value.trim();
  return instructionSets || null;
}
