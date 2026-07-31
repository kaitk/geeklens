import { beforeEach, describe, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import { showStatus } from './statusBanner';

const SIGNED_OUT_NAV = '<nav><a href="/session/new">Log In</a></nav>';
const SIGNED_IN_NAV = '<nav><a href="/profile/example">Example User</a></nav>';

function render(nav: string): void {
  globalThis.document = parseHTML(`<!doctype html><html><body>${nav}</body></html>`)
    .document as unknown as Document;
}

function banner(): HTMLElement {
  const element = document.getElementById('geeklens-info');
  if (!element) throw new Error('banner was not created');
  return element;
}

beforeEach(() => {
  delete (globalThis as { document?: Document }).document;
});

describe('showStatus', () => {
  test('links a sign-in status to the page’s own login destination', () => {
    render(SIGNED_OUT_NAV);
    showStatus({
      text: 'GeekLens: Sign in to load instruction data',
      type: 'warning',
      action: 'sign-in',
    });

    const link = banner().querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://browser.geekbench.com/session/new');
    // A new tab keeps the result on screen; signing in cannot return here.
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener');
    expect(link?.textContent).toBe('GeekLens: Sign in to load instruction data');
  });

  test('still shows the message when no login link is rendered to point at', () => {
    render(SIGNED_IN_NAV);
    showStatus({
      text: 'GeekLens: Sign in to load instruction data',
      type: 'warning',
      action: 'sign-in',
    });

    expect(banner().querySelector('a')).toBeNull();
    expect(banner().textContent).toBe('GeekLens: Sign in to load instruction data');
  });

  test('does not offer a link for statuses signing in cannot fix', () => {
    render(SIGNED_OUT_NAV);
    showStatus({ text: 'GeekLens: No instruction data available', type: 'warning' });

    expect(banner().querySelector('a')).toBeNull();
  });

  test('drops the link once the status no longer calls for signing in', () => {
    render(SIGNED_OUT_NAV);
    showStatus({
      text: 'GeekLens: Sign in to load instruction data',
      type: 'warning',
      action: 'sign-in',
    });
    showStatus({ text: 'GeekLens Active', type: 'info' });

    // Updated in place, so a stale link would otherwise survive the transition.
    expect(banner().querySelector('a')).toBeNull();
    expect(banner().textContent).toBe('GeekLens Active');
    expect(banner().classList.contains('gb-extension-warning')).toBe(false);
  });
});
