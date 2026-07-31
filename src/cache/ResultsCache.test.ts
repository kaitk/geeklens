import { describe, expect, test } from 'bun:test';
import { extractResultMetadata } from '../geekbench/resultPayload';
import {
  mergeStoredResultRecord,
  normalizeStoredResultRecord,
  type StoredResultRecord,
} from './ResultsCache';

describe('ResultsCache record migration', () => {
  test('reads a version-1 instruction-only row without rewriting it', () => {
    const legacy: StoredResultRecord = {
      resultId: 'v7:cpu:123',
      instructionSet: 'sse2 avx2',
      timestamp: 100,
    };

    expect(normalizeStoredResultRecord(legacy)).toEqual({
      instructionSet: 'sse2 avx2',
      metadata: null,
      processorLinks: { processorPath: null, macPath: null },
      timestamp: 100,
    });
  });

  test('enriches a legacy row while preserving its instruction text', () => {
    const legacy: StoredResultRecord = {
      resultId: 'v7:cpu:123',
      instructionSet: 'sse2 avx2',
      timestamp: 100,
    };

    expect(
      mergeStoredResultRecord(
        legacy.resultId,
        legacy,
        { processorLinks: { processorPath: '/processors/example-cpu', macPath: null } },
        200,
      ),
    ).toEqual({
      resultId: legacy.resultId,
      instructionSet: 'sse2 avx2',
      metadata: undefined,
      processorLinks: { processorPath: '/processors/example-cpu', macPath: null },
      timestamp: 200,
    });
  });

  test('derives the compatibility instruction string from newly cached metadata', () => {
    const metadata = extractResultMetadata(
      {
        document_version: 7,
        metrics: [{ id: 20000, value: 'neon sme2' }],
      },
      7,
    );
    expect(metadata).not.toBeNull();
    if (!metadata) throw new Error('Expected valid fixture metadata');

    const stored = mergeStoredResultRecord('v7:cpu:456', undefined, { metadata }, 300);

    expect(stored.instructionSet).toBe('neon sme2');
    expect(normalizeStoredResultRecord(stored).metadata).toEqual(metadata);
  });

  test('new explicit links override stale links without erasing undiscovered kinds', () => {
    const existing: StoredResultRecord = {
      resultId: 'v7:cpu:789',
      timestamp: 100,
      processorLinks: {
        processorPath: '/processors/old-cpu',
        macPath: '/macs/known-mac',
      },
    };

    const stored = mergeStoredResultRecord(
      existing.resultId,
      existing,
      {
        processorLinks: {
          processorPath: '/processors/canonical-cpu',
          macPath: null,
        },
      },
      200,
    );

    expect(stored.processorLinks).toEqual({
      processorPath: '/processors/canonical-cpu',
      macPath: '/macs/known-mac',
    });
  });
});
