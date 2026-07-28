import { describe, expect, test } from 'bun:test';
import {
  comparisonInstructionStatus,
  initialInstructionStatus,
  singleResultInstructionStatus,
} from './instructionDataStatus';

describe('initialInstructionStatus', () => {
  test('immediately guides signed-out Geekbench 7 users', () => {
    expect(initialInstructionStatus(7, true)).toEqual({
      text: 'GeekLens: Sign in to load instruction data',
      type: 'warning',
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
    });
  });

  test('does not imply that signing in fixes missing Geekbench 6 data', () => {
    expect(singleResultInstructionStatus(6, false).text).toBe(
      'GeekLens: No instruction data available',
    );
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
    });
    expect(comparisonInstructionStatus(7, false, true).type).toBe('warning');
  });

  test('guides users to sign in when neither Geekbench 7 result is available', () => {
    expect(comparisonInstructionStatus(7, false, false).text).toContain('Sign in');
  });
});
