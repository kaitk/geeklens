import { scoreDelta } from '../scoreDelta';
import type { ProcessorContextViewModel } from './model';

function unavailableReference(): HTMLElement {
  const indicator = document.createElement('span');
  indicator.dataset.geeklensPreviewReference = '';
  indicator.className = 'geeklens-preview-comparison-reference is-unavailable';
  indicator.tabIndex = 0;
  indicator.textContent = '(avg unavailable)';
  indicator.setAttribute(
    'aria-label',
    'Geekbench Browser average unavailable. No Geekbench 7 average is currently available for this exact processor or device configuration.',
  );
  const tooltip = document.createElement('span');
  tooltip.className = 'geeklens-preview-row-tooltip geeklens-preview-reference-tooltip';
  const title = document.createElement('strong');
  title.className = 'geeklens-preview-reference-tooltip-title';
  title.textContent = 'Geekbench Browser average unavailable';
  const explanation = document.createElement('span');
  explanation.className = 'geeklens-preview-reference-tooltip-note';
  explanation.textContent =
    'No Geekbench 7 average is currently available for this exact processor or device configuration.';
  tooltip.append(title, explanation);
  indicator.appendChild(tooltip);
  return indicator;
}

function referenceLink(
  current: number,
  reference: number,
  cataloguePath: string,
  generation: string,
  minimumUniqueResults?: number,
): HTMLElement {
  const delta = scoreDelta(current, reference);
  if (!delta) return unavailableReference();
  const { absolute: difference, percentage: percent } = delta;
  const sign = difference >= 0 ? '+' : '−';
  const fullText = `${reference.toLocaleString()} avg ${sign}${Math.abs(difference).toLocaleString()} (${sign}${Math.abs(percent).toFixed(1)}%)`;
  const link = document.createElement('a');
  link.dataset.geeklensPreviewReference = '';
  link.className = `geeklens-preview-comparison-reference ${difference >= 0 ? 'is-positive' : 'is-negative'}`;
  link.href = cataloguePath;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = `(${sign}${Math.abs(percent).toFixed(1)}% vs avg)`;
  link.setAttribute('aria-label', `${fullText}. Open reference source in a new tab.`);

  const tooltip = document.createElement('span');
  tooltip.className = 'geeklens-preview-row-tooltip geeklens-preview-reference-tooltip';
  const title = document.createElement('strong');
  title.className = 'geeklens-preview-reference-tooltip-title';
  title.textContent = 'Geekbench Browser average';
  tooltip.appendChild(title);
  for (const [label, value] of [
    ['This result', current.toLocaleString()],
    ['Average', reference.toLocaleString()],
    [
      'Difference',
      `${sign}${Math.abs(difference).toLocaleString()} (${sign}${Math.abs(percent).toFixed(1)}%)`,
    ],
  ] as const) {
    const row = document.createElement('span');
    row.className = 'geeklens-preview-reference-tooltip-row';
    const rowLabel = document.createElement('span');
    rowLabel.textContent = label;
    const rowValue = document.createElement('strong');
    rowValue.textContent = value;
    row.append(rowLabel, rowValue);
    tooltip.appendChild(row);
  }
  const provenance = document.createElement('span');
  provenance.className = 'geeklens-preview-reference-tooltip-note';
  provenance.textContent = minimumUniqueResults
    ? `${generation} · at least ${minimumUniqueResults} unique results`
    : generation;
  const action = document.createElement('span');
  action.className = 'geeklens-preview-reference-tooltip-note';
  action.textContent = 'Click to open source';
  tooltip.append(provenance, action);
  link.appendChild(tooltip);
  return link;
}

function referenceElement(
  viewModel: ProcessorContextViewModel,
  current: number,
  scoreKind: 'singleCore' | 'multiCore',
): HTMLElement | null {
  const reference = viewModel.reference;
  if (reference && viewModel.cataloguePath) {
    return referenceLink(
      current,
      reference[scoreKind],
      viewModel.cataloguePath,
      reference.generation,
      reference.minimumUniqueResults,
    );
  }
  return viewModel.hasReferenceDataset ? unavailableReference() : null;
}

export function annotateSingleScoreReferences(viewModel: ProcessorContextViewModel): void {
  const desktopContainers = document.querySelectorAll('.score-container.desktop');
  const scoreContainers = desktopContainers.length
    ? desktopContainers
    : document.querySelectorAll('.score-container');
  scoreContainers.forEach((container, index) => {
    if (container.querySelector('[data-geeklens-preview-reference]')) return;
    const current = Number(
      container.querySelector('.score')?.textContent?.replaceAll(',', '').trim(),
    );
    if (!Number.isFinite(current) || current <= 0) return;
    const reference = referenceElement(
      viewModel,
      current,
      index === 0 ? 'singleCore' : 'multiCore',
    );
    if (!reference) return;
    const note = document.createElement('div');
    note.dataset.geeklensPreviewReference = '';
    note.className = 'geeklens-preview-reference';
    note.appendChild(reference);
    container.querySelector('.score')?.appendChild(note);
  });

  for (const table of Array.from(document.querySelectorAll('table.benchmark-table'))) {
    const scoreRow = Array.from(table.querySelectorAll('thead tr')).find((row) =>
      /^(Single|Multi)-Core Score/.test(row.firstElementChild?.textContent?.trim() ?? ''),
    );
    const scoreCell = scoreRow?.querySelector('.score');
    if (!scoreRow || !scoreCell || scoreCell.querySelector('[data-geeklens-preview-reference]'))
      continue;
    const current = Number(scoreCell.textContent?.replaceAll(',', '').trim());
    if (!Number.isFinite(current)) continue;
    const scoreKind = scoreRow.firstElementChild?.textContent?.trim().startsWith('Single-Core')
      ? 'singleCore'
      : 'multiCore';
    const reference = referenceElement(viewModel, current, scoreKind);
    if (reference) scoreCell.appendChild(reference);
  }
}

export function annotateComparisonReferences(
  viewModels: readonly [ProcessorContextViewModel, ProcessorContextViewModel],
): void {
  for (const table of Array.from(document.querySelectorAll('table.comparison-benchmark-table'))) {
    for (const scoreRow of Array.from(table.querySelectorAll('tbody tr'))) {
      const scoreLabel = scoreRow.firstElementChild?.textContent?.trim() ?? '';
      if (!/^(Single|Multi)-Core Score/.test(scoreLabel)) continue;
      const scoreKind = scoreLabel.startsWith('Single-Core') ? 'singleCore' : 'multiCore';
      Array.from(scoreRow.children)
        .slice(1, 3)
        .forEach((cell, index) => {
          if (cell.querySelector('[data-geeklens-preview-reference]')) return;
          const current = Number(cell.textContent?.replaceAll(',', '').trim());
          if (!Number.isFinite(current)) return;
          const reference = referenceElement(viewModels[index], current, scoreKind);
          if (reference) cell.appendChild(reference);
        });
    }
  }
}
