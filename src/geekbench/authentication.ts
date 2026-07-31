import { BROWSER_HOST, BROWSER_ORIGIN } from './urls';

const SIGN_IN_TEXT = /^(log|sign) in$/i;
const SIGN_IN_PATH = /\/(login|sign[-_]?in|session\/new)\/?$/i;

/**
 * Detects an explicit signed-out marker in Geekbench's rendered navigation.
 * An absent marker is treated as unknown, not authenticated.
 */
export function isGeekbenchSignedOut(root: ParentNode = document): boolean {
  return findSignInLink(root) !== null;
}

/**
 * The rendered sign-in link as an absolute URL, or `null` when the navigation
 * has none.
 *
 * Read from the page rather than hardcoded: Geekbench's login path is an
 * undocumented external interface, and the link it renders is the only version
 * of it guaranteed to be current. Off-origin destinations are rejected so a
 * modified page cannot borrow the extension's badge to advertise its own.
 */
export function findGeekbenchSignInUrl(root: ParentNode = document): string | null {
  const href = findSignInLink(root)?.getAttribute('href');
  if (!href) return null;

  try {
    const url = new URL(href, BROWSER_ORIGIN);
    return url.hostname === BROWSER_HOST ? url.href : null;
  } catch {
    return null;
  }
}

function findSignInLink(root: ParentNode): HTMLAnchorElement | null {
  return (
    Array.from(root.querySelectorAll<HTMLAnchorElement>('nav a')).find((link) => {
      const text = link.textContent?.trim() ?? '';
      const path = link.getAttribute('href') ?? '';
      return SIGN_IN_TEXT.test(text) || SIGN_IN_PATH.test(path);
    }) ?? null
  );
}
