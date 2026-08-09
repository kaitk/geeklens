import type { ProcessorContextViewModel } from './model';
import { sourceLink } from './sourceLink';

/** Flag one reported L3 total that a reviewed source contradicts.
 *
 * One affordance, not two: the warning triangle is itself the source link. It
 * sits on the value because comparison view shares a row and only one processor
 * may be affected. The number is never rewritten; this objects to Geekbench's
 * value, it does not replace it. */
export function markDisputedL3Cache(
  valueCell: Element | null | undefined,
  dispute: ProcessorContextViewModel['disputedL3Cache'] | undefined,
): void {
  if (!valueCell || !dispute || valueCell.querySelector('.geeklens-preview-cache-dispute')) return;
  // The objection is to a total assembled from one die's size and a die count.
  // Which die gets read is unstable, but a count above one makes the total wrong.
  // If Geekbench reports one figure, there is nothing left to dispute.
  const dies = /[x×]\s*(\d+)/i.exec(valueCell.textContent ?? '');
  if (!dies || Number(dies[1]) < 2) return;
  valueCell.appendChild(
    sourceLink({
      href: dispute.source.url,
      title: 'Reported L3 is likely wrong',
      detail: [dispute.detail, dispute.source.label],
      ariaLabel: `Reported L3 is likely wrong. ${dispute.detail} Source: ${dispute.source.label}. Opens in a new tab.`,
      icon: 'warning',
      className: 'geeklens-preview-cache-dispute',
    }),
  );
}
