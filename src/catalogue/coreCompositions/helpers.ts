import type { CatalogueSource, CoreComposition, CoreCompositionGroup } from '../catalogue.types';

export function sharedCoreComposition(
  keys: readonly string[],
  groups: readonly CoreCompositionGroup[],
  source: CatalogueSource,
): Record<string, CoreComposition> {
  return Object.fromEntries(keys.map((key) => [key, { groups, source }]));
}

export function coreGroup(count: number, label: string): CoreCompositionGroup {
  return { count, label };
}

/** Intel's own naming, in its own order. Low Power Efficient-cores sit on the
 * SoC tile and are not the same group as the Efficient-cores beside them, which
 * is why they are counted separately rather than folded in. */
export function intelHybrid(
  performance: number,
  efficient: number,
  lowPowerEfficient?: number,
): CoreCompositionGroup[] {
  const groups = [
    coreGroup(performance, 'Performance-cores'),
    coreGroup(efficient, 'Efficient-cores'),
  ];
  if (lowPowerEfficient) groups.push(coreGroup(lowPowerEfficient, 'Low Power Efficient-cores'));
  return groups;
}
