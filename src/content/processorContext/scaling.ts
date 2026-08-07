import type { ProcessorContextViewModel } from './model';

/** Multi-core scaling belongs beside the score it divides. It is printed as a
 * bare ratio: comparing it against core count implies an efficiency figure,
 * which heterogeneous clusters make meaningless. */
function scalingNote(scaling: NonNullable<ProcessorContextViewModel['scaling']>): HTMLElement {
  const ratio = `${scaling.ratio.toFixed(2)}×`;
  const note = document.createElement('span');
  note.dataset.geeklensPreviewScaling = '';
  note.className = 'geeklens-preview-scaling';
  note.tabIndex = 0;
  note.textContent = `${ratio} single-core`;
  note.setAttribute(
    'aria-label',
    `Multi-core score is ${ratio} the single-core score of ${scaling.singleCore.toLocaleString()}.`,
  );
  const tooltip = document.createElement('span');
  tooltip.className = 'geeklens-preview-row-tooltip geeklens-preview-scaling-tooltip';
  const title = document.createElement('strong');
  title.className = 'geeklens-preview-reference-tooltip-title';
  title.textContent = 'Multi-core scaling';
  tooltip.appendChild(title);
  for (const [label, text] of [
    ['Single-core', scaling.singleCore.toLocaleString()],
    ['Multi-core', scaling.multiCore.toLocaleString()],
    ['Ratio', ratio],
  ] as const) {
    const row = document.createElement('span');
    row.className = 'geeklens-preview-reference-tooltip-row';
    const rowLabel = document.createElement('span');
    rowLabel.textContent = label;
    const value = document.createElement('strong');
    value.textContent = text;
    row.append(rowLabel, value);
    tooltip.appendChild(row);
  }
  const caveat = document.createElement('span');
  caveat.className = 'geeklens-preview-reference-tooltip-note';
  caveat.textContent =
    'Multi-core score divided by single-core score. Mixed core clusters make this ratio a poor comparison against the core count.';
  tooltip.appendChild(caveat);
  note.appendChild(tooltip);
  return note;
}

function appendScalingNote(
  cell: Element | null | undefined,
  viewModel: ProcessorContextViewModel,
  alignToScore = false,
): void {
  if (!cell || !viewModel.scaling || cell.querySelector('[data-geeklens-preview-scaling]')) return;
  const note = scalingNote(viewModel.scaling);
  if (alignToScore) note.classList.add('is-score-aligned');
  cell.appendChild(note);
}

export function annotateSingleScaling(viewModel: ProcessorContextViewModel): void {
  const desktopContainers = document.querySelectorAll('.score-container.desktop');
  const scoreContainers = desktopContainers.length
    ? desktopContainers
    : document.querySelectorAll('.score-container');
  appendScalingNote(scoreContainers[1]?.querySelector('.score'), viewModel);
  for (const table of Array.from(document.querySelectorAll('table.benchmark-table'))) {
    const scoreRow = Array.from(table.querySelectorAll('thead tr, tbody tr')).find((row) =>
      (row.firstElementChild?.textContent?.trim() ?? '').startsWith('Multi-Core Score'),
    );
    for (const cell of Array.from(scoreRow?.querySelectorAll('.score') ?? [])) {
      appendScalingNote(cell.parentElement?.querySelector('.graph') ?? cell, viewModel);
    }
  }
}

export function annotateComparisonScaling(
  viewModels: readonly (ProcessorContextViewModel | null)[],
): void {
  for (const table of Array.from(document.querySelectorAll('table.comparison-benchmark-table'))) {
    const rows = Array.from(table.querySelectorAll('thead tr, tbody tr')).filter((row) =>
      (row.firstElementChild?.textContent?.trim() ?? '').startsWith('Multi-Core Score'),
    );
    for (const row of rows) {
      Array.from(row.querySelectorAll('.score'))
        .slice(0, 2)
        .forEach((cell, index) => {
          const viewModel = viewModels[index];
          if (viewModel)
            appendScalingNote(
              cell,
              viewModel,
              !cell.querySelector('[data-geeklens-preview-reference]'),
            );
        });
    }
  }
}
