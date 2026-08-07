import { describe, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import { dismissBadgeTooltip } from './badgeTooltip';

describe('InstructionBadge', () => {
  test('keeps the authored tooltip outside the button and references it as a description', async () => {
    // Bun's test runner does not apply Vite's Svelte transform, so parse the
    // component's authored DOM to guard this accessibility relationship. This
    // verifies sibling placement and matching expressions, not their rendered IDs.
    const source = await Bun.file(new URL('InstructionBadge.svelte', import.meta.url)).text();
    const document = parseHTML(`<body>${source}</body>`).document;
    const button = document.querySelector('button.gb-instruction-badge')!;
    const tooltip = document.querySelector('[role="tooltip"]')!;
    expect(button.contains(tooltip)).toBe(false);
    expect(button.nextElementSibling).toBe(tooltip);
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
  });

  test('dismisses a keyboard-opened tooltip with Escape', () => {
    let blurred = false;
    dismissBadgeTooltip({
      key: 'Escape',
      currentTarget: { blur: () => (blurred = true) },
    } as unknown as KeyboardEvent);
    expect(blurred).toBe(true);
  });
});
