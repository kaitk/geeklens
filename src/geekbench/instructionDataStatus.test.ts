import { describe, expect, test } from 'bun:test';
import {
  comparisonInstructionStatus,
  initialInstructionStatus,
  processorContextStatus,
  singleResultInstructionStatus,
} from './instructionDataStatus';

describe('processorContextStatus', () => {
  test('reports loaded, signed-out, and unavailable processor context', () => {
    expect(processorContextStatus(true, true)).toEqual({
      text: 'GeekLens Active',
      type: 'info',
    });
    expect(processorContextStatus(false, true)).toEqual({
      text: 'GeekLens: Sign in to load processor data',
      type: 'warning',
      action: 'sign-in',
    });
    expect(processorContextStatus(false, false)).toEqual({
      text: 'GeekLens: No processor data available',
      type: 'warning',
    });
  });
});

describe('initialInstructionStatus', () => {
  test('describes Geekbench 5 as processor data rather than instruction data', () => {
    expect(initialInstructionStatus(5, false)).toEqual({
      text: 'GeekLens: Loading processor data…',
      type: 'info',
    });
    expect(initialInstructionStatus(5, true)).toEqual({
      text: 'GeekLens: Sign in to load processor data',
      type: 'warning',
      action: 'sign-in',
    });
  });

  test('immediately guides signed-out Geekbench 7 users', () => {
    expect(initialInstructionStatus(7, true)).toEqual({
      text: 'GeekLens: Sign in to load instruction data',
      type: 'warning',
      action: 'sign-in',
    });
  });

  test('does not claim the extension is active before data loads', () => {
    expect(initialInstructionStatus(7, false)).toEqual({
      text: 'GeekLens: Loading instruction data…',
      type: 'info',
    });
    expect(initialInstructionStatus(6, true).text).toContain('Loading');
  });
});

describe('singleResultInstructionStatus', () => {
  test('guides unauthenticated Geekbench 7 users', () => {
    expect(singleResultInstructionStatus(7, false)).toEqual({
      text: 'GeekLens: Sign in to load instruction data',
      type: 'warning',
      action: 'sign-in',
    });
  });

  test('does not imply that signing in fixes missing Geekbench 6 data', () => {
    expect(singleResultInstructionStatus(6, false).text).toBe(
      'GeekLens: No instruction data available',
    );
    // Signing in cannot produce Geekbench 6 data, so the banner must not offer it.
    expect(singleResultInstructionStatus(6, false).action).toBeUndefined();
  });
});

describe('comparisonInstructionStatus', () => {
  test('reports active only when both results have data', () => {
    expect(comparisonInstructionStatus(7, true, true)).toEqual({
      text: 'GeekLens Active',
      type: 'info',
    });
  });

  test('warns when only one Geekbench 7 result is available', () => {
    expect(comparisonInstructionStatus(7, true, false)).toEqual({
      text: 'GeekLens: Partial data — sign in and reload',
      type: 'warning',
      action: 'sign-in',
    });
    expect(comparisonInstructionStatus(7, false, true).type).toBe('warning');
  });

  test('guides users to sign in when neither Geekbench 7 result is available', () => {
    expect(comparisonInstructionStatus(7, false, false).text).toContain('Sign in');
  });

  test('identifies a Geekbench 6 result that predates instruction data', () => {
    expect(
      comparisonInstructionStatus(6, true, false, {
        primary: false,
        baseline: true,
      }),
    ).toEqual({
      text: 'GeekLens: Partial data — baseline result predates Geekbench 6.4',
      type: 'warning',
    });

    expect(
      comparisonInstructionStatus(6, false, true, {
        primary: true,
        baseline: false,
      }).text,
    ).toContain('primary result predates Geekbench 6.4');
  });

  test('identifies when both Geekbench 6 results predate instruction data', () => {
    expect(
      comparisonInstructionStatus(6, false, false, {
        primary: true,
        baseline: true,
      }).text,
    ).toBe('GeekLens: No instruction data — both results predate Geekbench 6.4');
  });
});
