import { describe, expect, mock, test } from 'bun:test';
import { defaultSettings } from '../settings/settings';
import { routeAnnotation } from './annotationRouting';

describe('routeAnnotation', () => {
  test('forwards the same settings snapshot to a single-result adapter', async () => {
    const settings = { ...defaultSettings };
    const single = mock(async () => undefined);
    const comparison = mock(async () => undefined);

    await routeAnnotation('/v7/cpu/12345', settings, { single, comparison });

    expect(single).toHaveBeenCalledWith(settings);
    expect(comparison).not.toHaveBeenCalled();
  });

  test('forwards the same settings snapshot to a comparison adapter', async () => {
    const settings = { ...defaultSettings };
    const single = mock(async () => undefined);
    const comparison = mock(async () => undefined);

    await routeAnnotation('/v6/cpu/compare/12345', settings, { single, comparison });

    expect(comparison).toHaveBeenCalledWith(settings);
    expect(single).not.toHaveBeenCalled();
  });

  test('does not call an adapter when GeekLens is disabled', () => {
    const settings = { ...defaultSettings, enabled: false };
    const single = mock(async () => undefined);
    const comparison = mock(async () => undefined);

    expect(routeAnnotation('/v7/cpu/12345', settings, { single, comparison })).toBeUndefined();
    expect(single).not.toHaveBeenCalled();
    expect(comparison).not.toHaveBeenCalled();
  });
});
