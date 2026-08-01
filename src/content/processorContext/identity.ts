import type { ProcessorContextViewModel } from './model';
import { createIcon } from '../icons';

function linkHost(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

export function renderIdentity(name: string, preview: ProcessorContextViewModel): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'geeklens-preview-processor';
  const heading = document.createElement('div');
  heading.className = 'geeklens-preview-identity';
  const nameElement = document.createElement('strong');
  nameElement.textContent = name.replace(new RegExp(`^${preview.vendor}\\s+`, 'i'), '');
  const vendorBadge = document.createElement('span');
  vendorBadge.className = `geeklens-preview-badge geeklens-preview-badge-${preview.vendorKey}`;
  vendorBadge.textContent = preview.vendor;
  const architectureBadge = document.createElement('span');
  architectureBadge.className = 'geeklens-preview-badge geeklens-preview-badge-architecture';
  architectureBadge.textContent = preview.architecture;
  heading.append(vendorBadge, nameElement, architectureBadge);

  if (preview.cataloguePath) {
    const link = document.createElement('a');
    link.className = 'geeklens-preview-external-link';
    link.href = preview.cataloguePath;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Open processor page in a new tab.');
    link.appendChild(createIcon('info'));
    const tooltip = document.createElement('span');
    tooltip.className = 'geeklens-preview-row-tooltip geeklens-preview-source-tooltip';
    const title = document.createElement('strong');
    title.className = 'geeklens-preview-source-tooltip-title';
    title.textContent = 'Processor page';
    const detail = document.createElement('span');
    detail.textContent = linkHost(preview.cataloguePath) ?? '';
    const hint = document.createElement('span');
    hint.className = 'geeklens-preview-source-tooltip-hint';
    hint.textContent = 'Click to open in a new tab.';
    tooltip.append(title, detail, hint);
    link.appendChild(tooltip);
    heading.appendChild(link);
  }
  wrapper.appendChild(heading);
  return wrapper;
}
