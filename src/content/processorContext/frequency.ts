import type { ProcessorContextViewModel } from './model';
import { rowLabel } from './rows';

type FrequencyStatistics = NonNullable<ProcessorContextViewModel['frequency']>;

/** Fraction of the plot width held back at each end of the domain.
 *
 * The caps and mean diamond are centred on their coordinates, so a value on a
 * domain edge would render half outside the plot. Insetting keeps the result
 * that owns either shared-scale extreme fully drawn. */
const PLOT_EDGE_INSET = 0.04;

/** Show only the endpoints beside the plot. The mean is already readable from
 * the diamond, with its exact value available in the tooltip. */
function frequencyValues(statistics: FrequencyStatistics): HTMLElement {
  const values = document.createElement('span');
  values.className = 'geeklens-preview-frequency-values';
  values.textContent = `${statistics.minGHz.toFixed(2)}–${statistics.maxGHz.toFixed(2)} GHz`;
  return values;
}

function distributionChart(
  statistics: FrequencyStatistics,
  scale?: { minGHz: number; maxGHz: number },
): HTMLElement {
  const { minGHz, q1GHz, medianGHz, meanGHz, q3GHz, maxGHz } = statistics;
  const scaleMin = scale?.minGHz ?? minGHz;
  const scaleMax = scale?.maxGHz ?? maxGHz;
  const span = scaleMax - scaleMin || 1;
  const position = (value: number) =>
    `${(PLOT_EDGE_INSET + ((value - scaleMin) / span) * (1 - 2 * PLOT_EDGE_INSET)) * 100}%`;

  const chart = document.createElement('span');
  chart.className = 'geeklens-preview-distribution';
  // Quartiles are left to the box itself: spelling them out crowds the tooltip
  // without adding information that the shape does not already convey.
  const tooltipText =
    `Frequency samples: minimum ${minGHz.toFixed(2)} GHz, ` +
    `median ${medianGHz.toFixed(2)} GHz, mean ${meanGHz.toFixed(2)} GHz, ` +
    `maximum ${maxGHz.toFixed(2)} GHz.`;
  chart.setAttribute('aria-label', tooltipText);
  chart.tabIndex = 0;
  chart.innerHTML =
    '<i class="whisker"></i><i class="cap min"></i><i class="cap max"></i><i class="box"></i><i class="median"></i><i class="mean"></i>';
  const tooltip = document.createElement('span');
  tooltip.className = 'geeklens-preview-frequency-tooltip';
  for (const [label, value] of [
    ['Minimum', minGHz],
    ['Median', medianGHz],
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
  chart.style.setProperty('--min', position(minGHz));
  chart.style.setProperty('--max', position(maxGHz));
  chart.style.setProperty('--q1', position(q1GHz));
  chart.style.setProperty('--q3', position(q3GHz));
  chart.style.setProperty('--median', position(medianGHz));
  chart.style.setProperty('--mean', position(meanGHz));
  return chart;
}

function frequency(viewModel: ProcessorContextViewModel): HTMLElement {
  const statistics = viewModel.frequency!;
  const wrapper = document.createElement('div');
  wrapper.className = 'geeklens-preview-frequency';
  const heading = document.createElement('span');
  heading.className = 'geeklens-preview-frequency-heading';
  heading.appendChild(frequencyValues(statistics));
  wrapper.append(heading, distributionChart(statistics));
  return wrapper;
}

function comparisonFrequency(
  viewModels: readonly [ProcessorContextViewModel | null, ProcessorContextViewModel | null],
): HTMLElement {
  const available = viewModels.filter((viewModel): viewModel is ProcessorContextViewModel =>
    Boolean(viewModel?.frequency),
  );
  const scale = {
    minGHz: Math.min(...available.map((viewModel) => viewModel.frequency!.minGHz)),
    maxGHz: Math.max(...available.map((viewModel) => viewModel.frequency!.maxGHz)),
  };
  const wrapper = document.createElement('div');
  wrapper.className = 'geeklens-preview-frequency-comparison';
  for (const [index, viewModel] of viewModels.entries()) {
    const role = index === 0 ? 'primary' : 'baseline';
    const lane = document.createElement('div');
    lane.className = `geeklens-preview-frequency-lane is-${role}`;
    // A processor name makes each lane self-describing without requiring the
    // reader to map a role or colour back to the comparison column headers.
    const label = document.createElement('span');
    label.className = 'geeklens-preview-frequency-lane-label';
    label.textContent = viewModel
      ? viewModel.displayName
      : role === 'primary'
        ? 'Primary'
        : 'Baseline';
    label.title = label.textContent;
    lane.appendChild(label);
    if (viewModel?.frequency) {
      // A shared scale can compress one distribution to a few pixels, so keep
      // the exact endpoint readout beside the plot in comparison view.
      lane.append(
        distributionChart(viewModel.frequency, scale),
        frequencyValues(viewModel.frequency),
      );
    } else {
      const unavailable = document.createElement('span');
      unavailable.className = 'geeklens-preview-frequency-unavailable';
      unavailable.textContent = 'Not available';
      lane.appendChild(unavailable);
    }
    wrapper.appendChild(lane);
  }
  const axis = document.createElement('div');
  axis.className = 'geeklens-preview-frequency-axis';
  const ticks = document.createElement('span');
  ticks.className = 'geeklens-preview-frequency-ticks';
  const minimum = document.createElement('span');
  minimum.textContent = `${scale.minGHz.toFixed(2)} GHz`;
  const maximum = document.createElement('span');
  maximum.textContent = `${scale.maxGHz.toFixed(2)} GHz`;
  ticks.append(minimum, maximum);
  axis.appendChild(ticks);
  wrapper.appendChild(axis);
  return wrapper;
}

export function renderSingleFrequency(
  viewModel: ProcessorContextViewModel,
  cpuTable: Element | undefined,
  topologyRow: Element,
): void {
  if (!viewModel.frequency || cpuTable?.querySelector('[data-geeklens-preview-detail="frequency"]'))
    return;
  const frequencyRow = document.createElement('tr');
  frequencyRow.dataset.geeklensPreviewDetail = 'frequency';
  const frequencyLabel = document.createElement('td');
  frequencyLabel.className = topologyRow.firstElementChild?.className ?? 'system-name';
  frequencyLabel.appendChild(rowLabel('Frequency'));
  const frequencyValue = document.createElement('td');
  frequencyValue.className = topologyRow.lastElementChild?.className ?? 'system-value';
  frequencyValue.appendChild(frequency(viewModel));
  frequencyRow.append(frequencyLabel, frequencyValue);
  topologyRow.after(frequencyRow);
}

export function renderComparisonFrequency(
  viewModels: readonly [ProcessorContextViewModel | null, ProcessorContextViewModel | null],
  table: Element | null,
): HTMLTableRowElement | null {
  if (
    !viewModels.some((viewModel) => viewModel?.frequency) ||
    table?.querySelector('[data-geeklens-preview-detail="frequency"]')
  )
    return null;
  const row = document.createElement('tr');
  row.dataset.geeklensPreviewDetail = 'frequency';
  const labelCell = document.createElement('td');
  labelCell.className = 'geeklens-preview-detail-label';
  labelCell.appendChild(rowLabel('Frequency'));
  const chartCell = document.createElement('td');
  chartCell.className = 'geeklens-preview-detail-value';
  chartCell.colSpan = 2;
  chartCell.appendChild(comparisonFrequency(viewModels));
  row.append(labelCell, chartCell);
  return row;
}
