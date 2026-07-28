import type { InstructionDataStatus } from '../geekbench/instructionDataStatus';

const BANNER_ID = 'geeklens-info';

/**
 * The fixed-position status pill. Both page adapters also use its presence as
 * their "already annotated" guard, so it is created on the first call and
 * updated in place afterwards.
 */
export function showStatus({ text, type }: InstructionDataStatus) {
  const banner = document.getElementById(BANNER_ID) ?? createBanner();
  banner.textContent = text;
  // toggle, not add: a status can go from warning back to info.
  banner.classList.toggle('gb-extension-warning', type === 'warning');
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
