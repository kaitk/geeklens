import { createIcon, type IconName } from '../icons';

/** A processor-context source affordance: hovering says where the fact came
 * from, while clicking opens it. The custom tooltip replaces the delayed
 * browser title popup and can state that the icon is actionable. */
export function sourceLink(options: {
  href: string;
  title: string;
  detail?: string | readonly string[];
  ariaLabel: string;
  icon?: IconName;
  className?: string;
}): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = ['geeklens-preview-external-link', options.className].filter(Boolean).join(' ');
  link.href = options.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', options.ariaLabel);
  link.appendChild(createIcon(options.icon ?? 'info'));

  const tooltip = document.createElement('span');
  tooltip.className = 'geeklens-preview-row-tooltip geeklens-preview-source-tooltip';
  const title = document.createElement('strong');
  title.className = 'geeklens-preview-source-tooltip-title';
  title.textContent = options.title;
  tooltip.appendChild(title);
  for (const line of [options.detail ?? []].flat()) {
    const detail = document.createElement('span');
    detail.textContent = line;
    tooltip.appendChild(detail);
  }
  const hint = document.createElement('span');
  hint.className = 'geeklens-preview-source-tooltip-hint';
  hint.textContent = 'Click to open in a new tab.';
  tooltip.appendChild(hint);
  link.appendChild(tooltip);
  return link;
}
