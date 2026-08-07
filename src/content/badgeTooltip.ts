/** Escape closes a keyboard-opened CSS tooltip by removing its focus trigger.
 * This also leaves the badge tab sequence; retaining focus would require a
 * stateful visibility override rather than the deliberately CSS-only tooltip. */
export function dismissBadgeTooltip(event: KeyboardEvent): void {
  if (event.key === 'Escape') (event.currentTarget as HTMLButtonElement).blur();
}
