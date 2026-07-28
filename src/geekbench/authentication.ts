const SIGN_IN_TEXT = /^(log|sign) in$/i;
const SIGN_IN_PATH = /\/(login|sign[-_]?in|session\/new)\/?$/i;

/**
 * Detects an explicit signed-out marker in Geekbench's rendered navigation.
 * An absent marker is treated as unknown, not authenticated.
 */
export function isGeekbenchSignedOut(root: ParentNode = document): boolean {
  return Array.from(root.querySelectorAll<HTMLAnchorElement>('nav a')).some((link) => {
    const text = link.textContent?.trim() ?? '';
    const path = link.getAttribute('href') ?? '';
    return SIGN_IN_TEXT.test(text) || SIGN_IN_PATH.test(path);
  });
}
