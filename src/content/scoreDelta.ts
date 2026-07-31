export interface ScoreDelta {
  absolute: number;
  percentage: number;
}

export function scoreDelta(current: number | null, reference: number | null): ScoreDelta | null {
  if (
    current === null ||
    reference === null ||
    !Number.isFinite(current) ||
    !Number.isFinite(reference) ||
    reference <= 0
  ) {
    return null;
  }
  const absolute = current - reference;
  return { absolute, percentage: (absolute / reference) * 100 };
}
