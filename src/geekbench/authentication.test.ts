import { describe, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import { findGeekbenchSignInUrl, isGeekbenchSignedOut } from './authentication';

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

describe('findGeekbenchSignInUrl', () => {
  test('resolves the rendered link against the Geekbench browser origin', () => {
    const document = documentFor('<nav><a href="/session/new">Account</a></nav>');
    expect(findGeekbenchSignInUrl(document)).toBe('https://browser.geekbench.com/session/new');
  });

  test('keeps the rendered path even when the link is matched by its label', () => {
    const document = documentFor('<nav><a href="/account">Log In</a></nav>');
    expect(findGeekbenchSignInUrl(document)).toBe('https://browser.geekbench.com/account');
  });

  test('has nothing to offer a signed-in visitor', () => {
    const document = documentFor('<nav><a href="/profile/example">Example User</a></nav>');
    expect(findGeekbenchSignInUrl(document)).toBeNull();
  });

  test('finds the link in captured Geekbench 7 markup', async () => {
    // The nav also renders "Account" and "Sign Up" ahead of it, neither of
    // which should win.
    const html = await Bun.file(
      new URL('../content/__fixtures__/geekbench7-single.html', import.meta.url),
    ).text();
    const document = parseHTML(html).document as unknown as Document;

    expect(findGeekbenchSignInUrl(document)).toBe('https://browser.geekbench.com/session/new');
  });

  test('refuses an off-origin destination', () => {
    // A modified page must not be able to borrow the badge to advertise its
    // own login form.
    const document = documentFor('<nav><a href="https://example.invalid/login">Sign In</a></nav>');
    expect(findGeekbenchSignInUrl(document)).toBeNull();
  });
});
