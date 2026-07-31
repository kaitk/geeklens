import { findGeekbenchSignInUrl } from '../geekbench/authentication';
import type { InstructionDataStatus } from '../geekbench/instructionDataStatus';

const BANNER_ID = 'geeklens-info';

/**
 * The fixed-position status pill. Both page adapters also use its presence as
 * their "already annotated" guard, so it is created on the first call and
 * updated in place afterwards.
 */
export function showStatus({ text, type, action }: InstructionDataStatus) {
  const banner = document.getElementById(BANNER_ID) ?? createBanner();
  // Cleared rather than overwritten so a status that drops the sign-in link
  // does not leave the previous one behind.
  banner.textContent = '';
  // toggle, not add: a status can go from warning back to info.
  banner.classList.toggle('gb-extension-warning', type === 'warning');

  const signInUrl = action === 'sign-in' ? findGeekbenchSignInUrl() : null;
  if (!signInUrl) {
    banner.textContent = text;
    return;
  }

  banner.appendChild(createSignInLink(text, signInUrl));
}

export function isPageAnnotated(): boolean {
  return document.getElementById(BANNER_ID) !== null;
}

function createBanner(): HTMLElement {
  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.classList.add('gb-extension-info');
  document.body.appendChild(banner);
  return banner;
}

/**
 * The whole pill becomes the link; the message already says to sign in, so a
 * separate call to action would only repeat it.
 *
 * Opens a new tab, which keeps the result on screen. That is not merely
 * convenient: signing in cannot return the user here anyway, because Geekbench
 * only restores a destination it previously rejected, and an explicit visit to
 * the login page leaves it with nothing to restore. Hence the reload hint.
 */
function createSignInLink(text: string, signInUrl: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = 'geeklens-status-link';
  link.href = signInUrl;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = text;
  link.title = 'Opens Geekbench sign-in in a new tab. Reload this page afterwards.';
  return link;
}
