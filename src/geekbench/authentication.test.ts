import { describe, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import { isGeekbenchSignedOut } from './authentication';

function documentFor(body: string): Document {
  return parseHTML(`<!doctype html><html><body>${body}</body></html>`)
    .document as unknown as Document;
}

describe('isGeekbenchSignedOut', () => {
  test('detects Geekbench login links by visible label', () => {
    const document = documentFor('<nav><a href="/account">Log In</a></nav>');
    expect(isGeekbenchSignedOut(document)).toBe(true);
  });

  test('detects login routes if navigation text changes', () => {
    const document = documentFor('<nav><a href="/session/new">Account</a></nav>');
    expect(isGeekbenchSignedOut(document)).toBe(true);
  });

  test('does not assume that an absent marker means signed out', () => {
    const document = documentFor('<nav><a href="/profile/example">Example User</a></nav>');
    expect(isGeekbenchSignedOut(document)).toBe(false);
  });
});
