import { isComparisonPath } from '../geekbench/generation';
import type { Settings } from '../settings/settings';

interface AnnotationAdapters {
  single: (settings: Settings) => Promise<unknown>;
  comparison: (settings: Settings) => Promise<unknown>;
}

export function routeAnnotation(
  pathname: string,
  settings: Settings,
  adapters: AnnotationAdapters,
): Promise<unknown> | undefined {
  if (!settings.enabled) return;
  return isComparisonPath(pathname) ? adapters.comparison(settings) : adapters.single(settings);
}
