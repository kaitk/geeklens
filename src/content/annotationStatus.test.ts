import { describe, expect, test } from 'bun:test';
import { completedAnnotationStatus } from './annotationStatus';

describe('completedAnnotationStatus', () => {
  test('keeps complete pages active regardless of ISA availability', () => {
    expect(
      completedAnnotationStatus({ hasDetails: true, payloadComplete: true, signedOut: false }),
    ).toEqual({ state: 'active', text: 'GeekLens Active' });
  });

  test('offers one neutral sign-in action when payload details are locked', () => {
    expect(
      completedAnnotationStatus({ hasDetails: true, payloadComplete: false, signedOut: true }),
    ).toEqual({
      state: 'sign-in',
      text: 'GeekLens: Sign in to load result details',
      action: 'sign-in',
    });
  });

  test('describes partial and unavailable authenticated results without warning', () => {
    expect(
      completedAnnotationStatus({ hasDetails: true, payloadComplete: false, signedOut: false }),
    ).toEqual({ state: 'limited', text: 'GeekLens: Some result details unavailable' });
    expect(
      completedAnnotationStatus({ hasDetails: false, payloadComplete: false, signedOut: false }),
    ).toEqual({ state: 'limited', text: 'GeekLens: Result details unavailable' });
  });
});
