import type { ProcessorContextViewModel } from './model';
import { createIcon } from '../icons';

function linkHost(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

export function renderIdentity(viewModel: ProcessorContextViewModel): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'geeklens-preview-processor';
  const heading = document.createElement('div');
  heading.className = 'geeklens-preview-identity';
  const nameElement = document.createElement('strong');
  nameElement.textContent = viewModel.displayName;
  if (viewModel.displayName !== viewModel.name) {
    nameElement.className = 'geeklens-preview-reported-name';
    nameElement.tabIndex = 0;
    nameElement.setAttribute(
      'aria-label',
      `${viewModel.displayName}. Reported processor name: ${viewModel.name}`,
    );
    const tooltip = document.createElement('span');
    tooltip.className = 'geeklens-preview-row-tooltip geeklens-preview-source-tooltip';
    const title = document.createElement('strong');
    title.className = 'geeklens-preview-source-tooltip-title';
    title.textContent = 'Reported processor name';
    const detail = document.createElement('span');
    detail.textContent = viewModel.name;
    tooltip.append(title, detail);
    nameElement.appendChild(tooltip);
  }
  const vendorBadge = document.createElement('span');
  vendorBadge.className = `geeklens-preview-badge geeklens-preview-badge-${viewModel.vendorKey}`;
  vendorBadge.textContent = viewModel.vendor;
  const architectureBadge = document.createElement('span');
  architectureBadge.className = 'geeklens-preview-badge geeklens-preview-badge-architecture';
  architectureBadge.textContent = viewModel.architecture;
  heading.append(vendorBadge, nameElement);
  if (viewModel.status === 'engineering-sample') {
    const statusBadge = document.createElement('span');
    statusBadge.className = 'geeklens-preview-badge geeklens-preview-badge-status';
    statusBadge.textContent = 'ES';
    statusBadge.tabIndex = 0;
    statusBadge.setAttribute('aria-label', 'Engineering sample');
    const tooltip = document.createElement('span');
    tooltip.className = 'geeklens-preview-row-tooltip geeklens-preview-status-tooltip';
    tooltip.textContent = 'Engineering sample';
    statusBadge.appendChild(tooltip);
    heading.appendChild(statusBadge);
  }
  heading.appendChild(architectureBadge);

  if (viewModel.cataloguePath) {
    const link = document.createElement('a');
    link.className = 'geeklens-preview-external-link';
    link.href = viewModel.cataloguePath;
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
    detail.textContent = linkHost(viewModel.cataloguePath) ?? '';
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
