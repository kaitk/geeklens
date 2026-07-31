/** Canonical processor-context presentation approved during the UI design pass.
 *
 * This renderer deliberately accepts a display model and performs no fetching,
 * payload parsing, catalogue matching, or fallback guessing. It is currently
 * detached from runtime until the real result-context view model is implemented.
 */
import type { Settings } from '../settings/settings';
import { createAddedRowMarker } from './addedRowMarker';

export interface ProcessorContextViewModel {
  name: string;
  vendor: string;
  architecture: string;
  cataloguePath: string;
  frequency: {
    minGHz: number;
    q1GHz: number;
    medianGHz: number;
    meanGHz: number;
    q3GHz: number;
    maxGHz: number;
  };
  clusters: string;
  scaling: string;
  reference: {
    singleCore: number;
    multiCore: number;
    generation: 'Geekbench 7';
    minimumUniqueResults?: number;
  } | null;
  memory: Array<{
    value: string;
    provenance: 'reported' | 'computed' | 'published';
  }>;
}

const MEMORY_PROVENANCE_HELP = {
  reported: 'Reported by the Geekbench result payload.',
  computed: 'Theoretical peak calculated from the reported memory configuration; not measured.',
  published: 'Published for the matched processor or device; not measured by this result.',
} as const;

function nameWithoutVendor(name: string, vendor: string): string {
  return name.replace(new RegExp(`^${vendor}\\s+`, 'i'), '');
}

function processorNameAndTopology(cell: Element): { name: string; topology: string } {
  const lines = (cell.textContent ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const rawName = lines[0] ?? 'Unknown processor';
  return {
    name: rawName.replace(/\s+@\s+[\d.]+\s*(?:GHz|MHz).*$/i, ''),
    topology: lines.slice(1).join(' · '),
  };
}

function identity(name: string, preview: ProcessorContextViewModel): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'geeklens-preview-processor';

  const heading = document.createElement('div');
  heading.className = 'geeklens-preview-identity';

  const nameElement = document.createElement('strong');
  nameElement.textContent = nameWithoutVendor(name, preview.vendor);

  const vendorBadge = document.createElement('span');
  vendorBadge.className = `geeklens-preview-badge geeklens-preview-badge-${preview.vendor.toLowerCase()}`;
  vendorBadge.textContent = preview.vendor;

  const architectureBadge = document.createElement('span');
  architectureBadge.className = 'geeklens-preview-badge geeklens-preview-badge-architecture';
  architectureBadge.textContent = preview.architecture;

  heading.append(vendorBadge, nameElement, architectureBadge);

  const catalogue = document.createElement('a');
  catalogue.className = 'geeklens-preview-catalogue';
  catalogue.href = preview.cataloguePath;
  catalogue.target = '_blank';
  catalogue.rel = 'noopener noreferrer';
  catalogue.textContent = 'Catalogue ↗';
  heading.appendChild(catalogue);
  wrapper.appendChild(heading);
  return wrapper;
}

function frequency(preview: ProcessorContextViewModel, comparison: boolean): HTMLElement {
  const { minGHz, q1GHz, medianGHz, meanGHz, q3GHz, maxGHz } = preview.frequency;
  const span = maxGHz - minGHz || 1;
  const position = (value: number) => `${((value - minGHz) / span) * 100}%`;

  const wrapper = document.createElement('div');
  wrapper.className = `geeklens-preview-frequency${comparison ? ' is-comparison' : ''}`;

  const heading = document.createElement('span');
  heading.className = 'geeklens-preview-frequency-heading';

  const values = document.createElement('span');
  values.className = 'geeklens-preview-frequency-values';
  values.textContent = `${minGHz.toFixed(2)}–${maxGHz.toFixed(2)} GHz · mean ${meanGHz.toFixed(2)}`;

  heading.appendChild(values);

  const chart = document.createElement('span');
  chart.className = 'geeklens-preview-distribution';
  const tooltipText =
    `Frequency samples: minimum ${minGHz.toFixed(2)} GHz, ` +
    `mean ${meanGHz.toFixed(2)} GHz, maximum ${maxGHz.toFixed(2)} GHz.`;
  chart.setAttribute('aria-label', tooltipText);
  chart.tabIndex = 0;
  chart.innerHTML =
    '<i class="whisker"></i><i class="cap min"></i><i class="cap max"></i><i class="box"></i><i class="median"></i><i class="mean"></i>';
  const tooltip = document.createElement('span');
  tooltip.className = 'geeklens-preview-frequency-tooltip';
  for (const [label, value] of [
    ['Minimum', minGHz],
    ['Mean', meanGHz],
    ['Maximum', maxGHz],
  ] as const) {
    const row = document.createElement('span');
    row.className = 'geeklens-preview-frequency-tooltip-row';
    const labelElement = document.createElement('span');
    labelElement.textContent = label;
    const valueElement = document.createElement('strong');
    valueElement.textContent = `${value.toFixed(2)} GHz`;
    row.append(labelElement, valueElement);
    tooltip.appendChild(row);
  }
  chart.appendChild(tooltip);
  chart.style.setProperty('--q1', position(q1GHz));
  chart.style.setProperty('--q3', position(q3GHz));
  chart.style.setProperty('--median', position(medianGHz));
  chart.style.setProperty('--mean', position(meanGHz));

  wrapper.append(heading, chart);
  return wrapper;
}

function referenceLink(
  current: number,
  reference: number,
  cataloguePath: string,
  generation: string,
  minimumUniqueResults?: number,
): HTMLAnchorElement {
  const difference = current - reference;
  const percent = (difference / reference) * 100;
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
    const tooltipLabel = document.createElement('span');
    tooltipLabel.textContent = label;
    const rowValue = document.createElement('strong');
    rowValue.textContent = value;
    row.append(tooltipLabel, rowValue);
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

function scoreValue(container: ParentNode): number | null {
  const value = Number(container.querySelector('.score')?.textContent?.replaceAll(',', '').trim());
  return Number.isFinite(value) && value > 0 ? value : null;
}

function annotateSingleScoreReferences(preview: ProcessorContextViewModel): void {
  const desktopContainers = document.querySelectorAll('.score-container.desktop');
  const scoreContainers = desktopContainers.length
    ? desktopContainers
    : document.querySelectorAll('.score-container');
  scoreContainers.forEach((container, index) => {
    if (container.querySelector('[data-geeklens-preview-reference]')) return;
    const current = scoreValue(container);
    if (!current) return;
    const note = document.createElement('div');
    note.dataset.geeklensPreviewReference = '';
    note.className = 'geeklens-preview-reference';
    const reference = preview.reference;
    note.appendChild(
      reference
        ? referenceLink(
            current,
            index === 0 ? reference.singleCore : reference.multiCore,
            preview.cataloguePath,
            reference.generation,
            reference.minimumUniqueResults,
          )
        : unavailableReference(),
    );
    container.querySelector('.score')?.appendChild(note);
  });
}

function annotateSinglePerformanceReferences(preview: ProcessorContextViewModel): void {
  for (const table of Array.from(document.querySelectorAll('table.benchmark-table'))) {
    const scoreRow = Array.from(table.querySelectorAll('thead tr')).find((row) =>
      /^(Single|Multi)-Core Score/.test(row.firstElementChild?.textContent?.trim() ?? ''),
    );
    if (!scoreRow) continue;
    const scoreCell = scoreRow.querySelector('.score');
    if (!scoreCell || scoreCell.querySelector('[data-geeklens-preview-reference]')) continue;
    const current = Number(scoreCell.textContent?.replaceAll(',', '').trim());
    if (!Number.isFinite(current)) continue;
    const scoreKind = scoreRow.firstElementChild?.textContent?.trim().startsWith('Single-Core')
      ? 'singleCore'
      : 'multiCore';
    const reference = preview.reference;
    scoreCell.appendChild(
      reference
        ? referenceLink(
            current,
            reference[scoreKind],
            preview.cataloguePath,
            reference.generation,
            reference.minimumUniqueResults,
          )
        : unavailableReference(),
    );
  }
}

function appendMemoryDetails(cell: Element, preview: ProcessorContextViewModel): void {
  if (cell.querySelector('[data-geeklens-preview-memory]')) return;
  const details = document.createElement('div');
  details.dataset.geeklensPreviewMemory = '';
  details.className = 'geeklens-preview-memory';
  for (const fact of preview.memory) {
    const line = document.createElement('div');
    line.className = 'geeklens-preview-memory-line';

    const value = document.createElement('span');
    value.textContent = fact.value;

    const provenance = document.createElement('span');
    provenance.className = `geeklens-preview-provenance is-${fact.provenance}`;
    provenance.textContent = fact.provenance;
    provenance.tabIndex = 0;
    provenance.setAttribute(
      'aria-label',
      `${fact.provenance}: ${MEMORY_PROVENANCE_HELP[fact.provenance]}`,
    );
    const tooltip = document.createElement('span');
    tooltip.className = 'geeklens-preview-row-tooltip';
    tooltip.textContent = MEMORY_PROVENANCE_HELP[fact.provenance];
    provenance.appendChild(tooltip);

    line.append(value, provenance);
    details.appendChild(line);
  }
  cell.replaceChildren(details);
}

function rowLabel(label: string): DocumentFragment {
  const content = document.createDocumentFragment();
  const labelText = document.createElement('span');
  labelText.textContent = label;
  const marker = createAddedRowMarker();
  content.append(labelText, marker);
  return content;
}

function topologyDetails(nativeTopology: string, preview: ProcessorContextViewModel): HTMLElement {
  const value = document.createElement('div');
  value.className = 'geeklens-preview-topology';

  for (const [className, text] of [
    ['geeklens-preview-native-topology', nativeTopology || 'Topology unavailable'],
    ['', preview.clusters],
    ['', preview.scaling],
  ]) {
    const line = document.createElement('div');
    if (className) line.className = className;
    line.textContent = text;
    value.appendChild(line);
  }
  return value;
}

function comparisonDetailRow(
  label: string,
  previews: readonly ProcessorContextViewModel[],
  render: (preview: ProcessorContextViewModel, index: number) => HTMLElement,
): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.dataset.geeklensPreviewDetail = label.toLowerCase().replaceAll(/\W+/g, '-');

  const labelCell = document.createElement('td');
  labelCell.className = 'geeklens-preview-detail-label';
  labelCell.appendChild(rowLabel(label));
  row.appendChild(labelCell);

  for (const [index, preview] of previews.entries()) {
    const cell = document.createElement('td');
    cell.className = 'geeklens-preview-detail-value';
    cell.appendChild(render(preview, index));
    row.appendChild(cell);
  }
  return row;
}

export function renderSingleProcessorContext(
  preview: ProcessorContextViewModel,
  settings: Settings,
): void {
  const cpuTable = Array.from(document.querySelectorAll('table.system-table')).find(
    (table) => table.querySelector('th')?.textContent?.trim() === 'CPU Information',
  );
  const nameCell = Array.from(cpuTable?.querySelectorAll('tbody tr') ?? []).find((row) =>
    /^(Name|Processor)$/.test(row.firstElementChild?.textContent?.trim() ?? ''),
  )?.lastElementChild;
  if (!nameCell || nameCell.querySelector('[data-geeklens-preview-processor]')) return;

  if (settings.showProcessorSummary) {
    const block = identity(preview.name, preview);
    block.dataset.geeklensPreviewProcessor = '';
    nameCell.replaceChildren(block);
  }

  const topologyRow = Array.from(cpuTable?.querySelectorAll('tbody tr') ?? []).find(
    (row) => row.firstElementChild?.textContent?.trim() === 'Topology',
  );
  if (topologyRow) {
    const labelCell = topologyRow.firstElementChild;
    const valueCell = topologyRow.lastElementChild;
    const nativeTopology = valueCell?.textContent?.trim() ?? '';
    if (settings.showTopologyScaling) {
      labelCell?.replaceChildren(rowLabel('Topology & scaling'));
      valueCell?.replaceChildren(topologyDetails(nativeTopology, preview));
    }

    if (
      settings.showFrequencyDistribution &&
      !cpuTable?.querySelector('[data-geeklens-preview-detail="frequency"]')
    ) {
      const frequencyRow = document.createElement('tr');
      frequencyRow.dataset.geeklensPreviewDetail = 'frequency';
      const frequencyLabel = document.createElement('td');
      frequencyLabel.className = labelCell?.className ?? 'system-name';
      frequencyLabel.appendChild(rowLabel('Frequency'));
      const frequencyValue = document.createElement('td');
      frequencyValue.className = valueCell?.className ?? 'system-value';
      frequencyValue.appendChild(frequency(preview, false));
      frequencyRow.append(frequencyLabel, frequencyValue);
      topologyRow.after(frequencyRow);
    }
  }

  if (settings.showReferenceComparison) {
    annotateSingleScoreReferences(preview);
    annotateSinglePerformanceReferences(preview);
  }

  const memoryTable = Array.from(document.querySelectorAll('table.system-table')).find(
    (table) => table.querySelector('th')?.textContent?.trim() === 'Memory Information',
  );
  const sizeCell = memoryTable?.querySelector('tbody tr td:last-child');
  if (settings.showMemoryDetails && sizeCell) appendMemoryDetails(sizeCell, preview);
}

export function renderComparisonProcessorContext(
  previews: readonly [ProcessorContextViewModel, ProcessorContextViewModel],
  settings: Settings,
): void {
  const table = document.querySelector('table.system-information');
  const processorRow = Array.from(table?.querySelectorAll('tbody tr') ?? []).find(
    (row) => row.firstElementChild?.textContent?.trim() === 'Processor',
  );
  if (!processorRow) return;

  const processorTopologies: string[] = [];
  Array.from(processorRow.children)
    .slice(1, 3)
    .forEach((cell, index) => {
      if (cell.querySelector('[data-geeklens-preview-processor]')) return;
      const { topology: topologyText } = processorNameAndTopology(cell);
      processorTopologies.push(topologyText);
      if (settings.showProcessorSummary) {
        const preview = previews[index];
        if (!preview) return;
        const block = identity(preview.name, preview);
        block.dataset.geeklensPreviewProcessor = '';
        cell.replaceChildren(block);
      }
    });

  const detailRows: HTMLTableRowElement[] = [];
  if (
    settings.showTopologyScaling &&
    !table?.querySelector('[data-geeklens-preview-detail="topology-scaling"]')
  ) {
    const topologyRow = comparisonDetailRow('Topology & scaling', previews, (preview, index) =>
      topologyDetails(processorTopologies[index] ?? '', preview),
    );
    detailRows.push(topologyRow);
  }
  if (
    settings.showFrequencyDistribution &&
    !table?.querySelector('[data-geeklens-preview-detail="frequency"]')
  ) {
    const frequencyRow = comparisonDetailRow('Frequency', previews, (preview) =>
      frequency(preview, true),
    );
    detailRows.push(frequencyRow);
  }
  processorRow.after(...detailRows);

  const memoryRow = Array.from(table?.querySelectorAll('tbody tr') ?? []).find(
    (row) => row.firstElementChild?.textContent?.trim() === 'Memory',
  );
  if (settings.showMemoryDetails) {
    Array.from(memoryRow?.children ?? [])
      .slice(1, 3)
      .forEach((cell, index) => {
        const preview = previews[index];
        if (preview) appendMemoryDetails(cell, preview);
      });
  }
  if (settings.showReferenceComparison) annotateComparisonReferences(previews);
}

function annotateComparisonReferences(
  previews: readonly [ProcessorContextViewModel, ProcessorContextViewModel],
): void {
  const tables = Array.from(document.querySelectorAll('table.comparison-benchmark-table'));

  for (const table of tables) {
    for (const scoreRow of Array.from(table.querySelectorAll('tbody tr'))) {
      const scoreLabel = scoreRow.firstElementChild?.textContent?.trim() ?? '';
      const scoreKind = scoreLabel.startsWith('Single-Core') ? 'singleCore' : 'multiCore';
      if (!/^(Single|Multi)-Core Score/.test(scoreLabel)) continue;

      Array.from(scoreRow.children)
        .slice(1, 3)
        .forEach((cell, index) => {
          if (cell.querySelector('[data-geeklens-preview-reference]')) return;
          const current = Number(
            scoreRow.children[index + 1]?.textContent?.replaceAll(',', '').trim(),
          );
          if (!Number.isFinite(current)) return;
          const preview = previews[index];
          if (!preview) return;
          const reference = preview.reference;
          cell.appendChild(
            reference
              ? referenceLink(
                  current,
                  reference[scoreKind],
                  preview.cataloguePath,
                  reference.generation,
                  reference.minimumUniqueResults,
                )
              : unavailableReference(),
          );
        });
    }
  }
}

export function applyProcessorContextPreferences(settings: Settings): void {
  document.body.classList.toggle('geeklens-uncolored-badges', !settings.coloredBadges);
  document.body.classList.toggle('geeklens-tooltips-disabled', !settings.tooltips);
}
