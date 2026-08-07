/** Canonical processor-context presentation approved during the UI design pass.
 *
 * This renderer deliberately accepts a display model and performs no fetching,
 * payload parsing, catalogue matching, or fallback guessing. It is currently
 * detached from runtime until the real result-context view model is implemented.
 */
import type { Settings } from '../settings/settings';
import { createIcon, type IconName } from './icons';
import { createRowMarker, markRowLabel, type RowMarkerKind } from './rowMarker';
import { scoreDelta } from './scoreDelta';
import type {
  MemoryFact,
  ProcessorContextViewModel,
  ProvenanceFact,
} from './processorContext/model';
import { renderIdentity } from './processorContext/identity';
export type { ProcessorContextViewModel } from './processorContext/model';

const MEMORY_PROVENANCE_HELP = {
  reported: 'Reported by the Geekbench result payload.',
  computed: 'Calculated from the reported memory configuration; not measured.',
  published: 'Published for the matched processor or device; not measured by this result.',
} as const;

/** A source affordance: hovering says where the fact came from, clicking opens
 * it. The custom tooltip replaces the browser's `title` popup, which appears
 * only after a delay and cannot state that the icon is clickable. */
function sourceLink(options: {
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

type FrequencyStatistics = NonNullable<ProcessorContextViewModel['frequency']>;

/** Fraction of the plot width held back at each end of the domain.
 *
 * The caps and the mean diamond are centred on their coordinate, so a value
 * sitting exactly on a domain edge renders half outside the plot box. Insetting
 * the mapping keeps whichever result owns a scale extreme fully drawn, which
 * under a shared comparison scale is always one of the two.
 */
const PLOT_EDGE_INSET = 0.04;

/** The endpoints only.
 *
 * These are what a plot cannot convey once a shared scale compresses it to a
 * few pixels, so they earn their place beside the chart. The mean does not: its
 * position relative to the box is the readable part and the diamond already
 * shows that, with the exact figure in the tooltip.
 */
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
  // The quartiles are left to the box itself: spelling them out crowds the
  // tooltip without telling the reader anything the shape does not.
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

function frequency(preview: ProcessorContextViewModel): HTMLElement {
  const statistics = preview.frequency!;
  const wrapper = document.createElement('div');
  wrapper.className = 'geeklens-preview-frequency';

  const heading = document.createElement('span');
  heading.className = 'geeklens-preview-frequency-heading';
  heading.appendChild(frequencyValues(statistics));

  wrapper.append(heading, distributionChart(statistics));
  return wrapper;
}

function comparisonFrequency(
  previews: readonly [ProcessorContextViewModel | null, ProcessorContextViewModel | null],
): HTMLElement {
  const available = previews.filter((preview): preview is ProcessorContextViewModel =>
    Boolean(preview?.frequency),
  );
  const scale = {
    minGHz: Math.min(...available.map((preview) => preview.frequency!.minGHz)),
    maxGHz: Math.max(...available.map((preview) => preview.frequency!.maxGHz)),
  };

  const wrapper = document.createElement('div');
  wrapper.className = 'geeklens-preview-frequency-comparison';

  for (const [index, preview] of previews.entries()) {
    const role = index === 0 ? 'primary' : 'baseline';
    const lane = document.createElement('div');
    lane.className = `geeklens-preview-frequency-lane is-${role}`;

    // Name each lane after its own processor rather than its role: the label is
    // then self-describing, so nothing has to be mapped back to the column
    // headers or to a colour swatch.
    const label = document.createElement('span');
    label.className = 'geeklens-preview-frequency-lane-label';
    label.textContent = preview
      ? nameWithoutVendor(preview.name, preview.vendor)
      : role === 'primary'
        ? 'Primary'
        : 'Baseline';
    label.title = label.textContent;
    lane.appendChild(label);

    if (preview?.frequency) {
      // The numbers stay beside the plot in comparison view. Under a shared
      // scale a narrow distribution legitimately compresses to a few pixels,
      // and the readout is then the only way to read it without hovering.
      lane.append(distributionChart(preview.frequency, scale), frequencyValues(preview.frequency));
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

function referenceLink(
  current: number,
  reference: number,
  cataloguePath: string,
  generation: string,
  minimumUniqueResults?: number,
): HTMLElement {
  const delta = scoreDelta(current, reference);
  if (!delta) return unavailableReference();
  const difference = delta.absolute;
  const percent = delta.percentage;
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

function referenceElement(
  preview: ProcessorContextViewModel,
  current: number,
  scoreKind: 'singleCore' | 'multiCore',
): HTMLElement | null {
  const reference = preview.reference;
  if (reference && preview.cataloguePath) {
    return referenceLink(
      current,
      reference[scoreKind],
      preview.cataloguePath,
      reference.generation,
      reference.minimumUniqueResults,
    );
  }
  return preview.referenceGeneration ? unavailableReference() : null;
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
    const scoreKind = index === 0 ? 'singleCore' : 'multiCore';
    const reference = referenceElement(preview, current, scoreKind);
    if (!reference) return;
    const note = document.createElement('div');
    note.dataset.geeklensPreviewReference = '';
    note.className = 'geeklens-preview-reference';
    note.appendChild(reference);
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
    const reference = referenceElement(preview, current, scoreKind);
    if (reference) scoreCell.appendChild(reference);
  }
}

/** Provenance tooltips carry a provenance definition, an optional
 * payload/derivation note, and an optional source line. Rendering them as
 * separate blocks rather than one concatenated string keeps exact payload values
 * and source attribution legible instead of running together in a centred
 * paragraph. */
const MEMORY_FACT_LABELS: Record<MemoryFact['kind'], string> = {
  capacity: 'Capacity',
  specification: 'Memory',
  interface: 'Interface',
  bandwidth: 'Bandwidth',
};

function memoryFactLabel(fact: MemoryFact): string {
  if (fact.kind !== 'bandwidth') return MEMORY_FACT_LABELS[fact.kind];
  if (fact.provenance === 'computed') return 'Calculated bandwidth';
  if (fact.provenance === 'published') return 'Published bandwidth';
  return 'Bandwidth';
}

function memoryTooltip(facts: readonly MemoryFact[]): HTMLElement {
  const tooltip = document.createElement('span');
  tooltip.className = 'geeklens-preview-row-tooltip geeklens-preview-memory-tooltip';

  const title = document.createElement('strong');
  title.className = 'geeklens-preview-memory-tooltip-title';
  title.textContent = 'Memory details';
  tooltip.appendChild(title);

  for (const provenance of ['reported', 'computed', 'published'] as const) {
    const group = facts.filter((fact) => fact.provenance === provenance);
    if (group.length === 0) continue;
    const heading = document.createElement('span');
    heading.className = 'geeklens-preview-memory-tooltip-group';
    heading.textContent = provenance === 'computed' ? 'Calculated' : provenance;
    tooltip.appendChild(heading);

    for (const fact of group) {
      const row = document.createElement('span');
      row.className = 'geeklens-preview-memory-tooltip-row';
      const label = document.createElement('span');
      label.textContent = memoryFactLabel(fact);
      const value = document.createElement('strong');
      value.textContent = fact.value;
      row.append(label, value);
      if (fact.source) {
        const source = document.createElement('a');
        source.className = 'geeklens-preview-memory-source';
        source.href = fact.source.url;
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        source.appendChild(createIcon('external-link'));
        source.title = `View source: ${fact.source.label}`;
        source.setAttribute('aria-label', `View source: ${fact.source.label}. Opens in a new tab.`);
        row.appendChild(source);
      }
      tooltip.appendChild(row);
      if (fact.detail) {
        const detail = document.createElement('span');
        detail.className = 'geeklens-preview-memory-tooltip-line';
        detail.textContent = fact.detail;
        tooltip.appendChild(detail);
      }
    }
  }
  return tooltip;
}

function memoryHeadline(facts: readonly MemoryFact[]): string {
  const capacity = facts.find((fact) => fact.kind === 'capacity');
  const specification =
    facts.find((fact) => fact.kind === 'specification' && fact.provenance === 'published') ??
    facts.find((fact) => fact.kind === 'specification');
  const headline = [capacity?.value, specification?.value].filter(Boolean);
  return headline.length > 0 ? headline.join(' · ') : (facts[0]?.value ?? 'Memory details');
}

/** Bandwidth is the fact most worth reading without opening the tooltip, so it
 * gets its own line. A published figure outranks one we calculated. */
function memoryBandwidthLine(facts: readonly MemoryFact[]): HTMLElement | null {
  const bandwidth =
    facts.find((fact) => fact.kind === 'bandwidth' && fact.provenance === 'published') ??
    facts.find((fact) => fact.kind === 'bandwidth');
  if (!bandwidth) return null;

  const line = document.createElement('span');
  line.className = 'geeklens-preview-memory-bandwidth';
  const label = document.createElement('span');
  label.className = 'geeklens-preview-memory-bandwidth-label';
  label.textContent = memoryFactLabel(bandwidth);
  const value = document.createElement('span');
  value.textContent = bandwidth.value;
  line.append(label, value);
  return line;
}

function appendMemoryDetails(cell: Element, preview: ProcessorContextViewModel): void {
  if (cell.querySelector('[data-geeklens-preview-memory]')) return;
  const details = document.createElement('div');
  details.dataset.geeklensPreviewMemory = '';
  details.className = 'geeklens-preview-memory';
  const value = document.createElement('span');
  value.className = 'geeklens-preview-memory-summary';
  value.textContent = memoryHeadline(preview.memory);

  const info = document.createElement('span');
  info.className = 'geeklens-preview-memory-info';
  info.tabIndex = 0;
  info.setAttribute('role', 'img');
  info.setAttribute(
    'aria-label',
    `Memory details. ${preview.memory.map((fact) => `${memoryFactLabel(fact)}: ${fact.value}. ${MEMORY_PROVENANCE_HELP[fact.provenance]}`).join(' ')}`,
  );
  info.append(createIcon('info'), memoryTooltip(preview.memory));
  details.append(value, info);
  const bandwidth = memoryBandwidthLine(preview.memory);
  if (bandwidth) details.appendChild(bandwidth);
  cell.replaceChildren(details);
}

function rowLabel(label: string, kind: RowMarkerKind = 'added'): DocumentFragment {
  const content = document.createDocumentFragment();
  const labelText = document.createElement('span');
  labelText.textContent = label;
  const marker = createRowMarker(kind);
  content.append(labelText, marker);
  return content;
}

/** Read a table label without counting our own marker and its tooltip copy.
 * This keeps row discovery stable when rendering is invoked more than once. */
function tableRowLabel(row: Element): string {
  const cell = row.firstElementChild;
  if (!cell) return '';
  return Array.from(cell.childNodes)
    .filter(
      (node) => !(node.nodeType === 1 && (node as Element).matches('[data-geeklens-row-marker]')),
    )
    .map((node) => node.textContent ?? '')
    .join('')
    .trim();
}

/** Socket count is the one topology fact the payload does not carry, so it is
 * read back out of the string Geekbench already renders. */
function processorCount(nativeTopology: string): number | null {
  const match = /(\d+)\s+Processors?\b/i.exec(nativeTopology);
  const count = match ? Number(match[1]) : Number.NaN;
  return Number.isInteger(count) && count > 0 ? count : null;
}

/** Cluster shades run dark to light in row order so a bar segment and its
 * legend swatch stay paired without inventing a colour per cluster. */
function clusterShade(index: number): string {
  return String(Math.max(0.35, 1 - index * 0.25));
}

function pluralCores(count: number): string {
  return `${count} ${count === 1 ? 'core' : 'cores'}`;
}

function topologyDetails(nativeTopology: string, preview: ProcessorContextViewModel): HTMLElement {
  const value = document.createElement('div');
  value.className = 'geeklens-preview-topology';

  const processors = processorCount(nativeTopology);
  const totals = [
    preview.topology?.cores ? pluralCores(preview.topology.cores) : null,
    preview.topology?.threads ? `${preview.topology.threads} threads` : null,
  ].filter((total): total is string => Boolean(total));
  // Socket count alone is thinner than what Geekbench already prints, so the
  // native string stands until the payload supplies a total to replace it with.
  if (totals.length > 0 && processors) {
    totals.unshift(`${processors} ${processors === 1 ? 'processor' : 'processors'}`);
  }

  const summary = document.createElement('div');
  summary.className = 'geeklens-preview-topology-summary';
  summary.textContent =
    totals.length > 0 ? totals.join(' · ') : nativeTopology || 'Topology unavailable';
  value.appendChild(summary);

  const clusters = preview.topology?.clusters ?? [];
  // Every cluster carries a name, or none does: the view model only labels a
  // clean assignment, so the legend below states the composition by itself and
  // repeating it as a sentence would print the same fact twice.
  const named = clusters.length > 0 && clusters.every((cluster) => cluster.label !== null);

  // Named or not, the sentence is the only place core types can appear on the
  // parts that report no clusters at all, which is every AMD result sampled.
  if (preview.coreComposition && !named) {
    value.appendChild(compositionLine(preview.coreComposition));
  }

  if (clusters.length === 0) return value;

  // The bar carries the core split proportionally; the legend below carries the
  // same facts as text, so the bar itself is decorative.
  const bar = document.createElement('div');
  bar.className = 'geeklens-preview-topology-bar';
  bar.setAttribute('aria-hidden', 'true');
  const legend = document.createElement('div');
  legend.className = 'geeklens-preview-topology-clusters';
  if (named) legend.dataset.geeklensPreviewComposition = '';

  for (const [index, cluster] of clusters.entries()) {
    const shade = clusterShade(index);

    const segment = document.createElement('span');
    segment.className = 'geeklens-preview-topology-segment';
    segment.style.setProperty('flex-grow', String(cluster.cores));
    segment.style.setProperty('opacity', shade);
    bar.appendChild(segment);

    const entry = document.createElement('span');
    entry.className = 'geeklens-preview-topology-cluster';
    const swatch = document.createElement('span');
    swatch.className = 'geeklens-preview-topology-swatch';
    swatch.style.setProperty('opacity', shade);
    const text = document.createElement('span');
    const peak = cluster.maxGHz ? `up to ${cluster.maxGHz.toFixed(2)} GHz` : null;
    if (cluster.label) {
      // The core type is the more useful of the two in a cell this narrow, and
      // the frequency row below already states the range for the whole part, so
      // a per-cluster maximum stays available without spending a line on it.
      text.textContent = `${cluster.cores} ${cluster.label}`;
      if (peak) entry.title = peak;
    } else {
      text.textContent = `${pluralCores(cluster.cores)}${peak ? ` · ${peak}` : ''}`;
    }
    entry.append(swatch, text);
    legend.appendChild(entry);
  }

  // One source covers every group, so it trails the legend rather than repeating
  // against each name.
  if (named && preview.coreComposition?.source) {
    legend.appendChild(compositionSourceLink(preview.coreComposition.source));
  }

  value.append(bar, legend);
  return value;
}

function compositionSourceLink(source: NonNullable<ProvenanceFact['source']>): HTMLAnchorElement {
  return sourceLink({
    href: source.url,
    title: 'Core composition source',
    detail: source.label,
    ariaLabel: `View core composition source: ${source.label}. Opens in a new tab.`,
  });
}

/** The composition as a sentence, for the parts whose clusters could not carry
 * the names themselves. */
function compositionLine(composition: ProvenanceFact): HTMLElement {
  const line = document.createElement('div');
  line.dataset.geeklensPreviewComposition = '';
  line.className = 'geeklens-preview-topology-composition';
  const text = document.createElement('span');
  text.textContent = composition.value;
  line.appendChild(text);
  if (composition.source) line.appendChild(compositionSourceLink(composition.source));
  return line;
}

/** Multi-core scaling belongs beside the score it divides. It is printed as a
 * bare ratio: comparing it against the core count reads as an efficiency
 * figure, which heterogeneous clusters make meaningless. */
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
    const tooltipLabel = document.createElement('span');
    tooltipLabel.textContent = label;
    const rowValue = document.createElement('strong');
    rowValue.textContent = text;
    row.append(tooltipLabel, rowValue);
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

function appendScalingNote(cell: Element | null | undefined, preview: ProcessorContextViewModel) {
  if (!cell || !preview.scaling || cell.querySelector('[data-geeklens-preview-scaling]')) return;
  cell.appendChild(scalingNote(preview.scaling));
}

function multiCoreScoreCells(tableSelector: string): Element[] {
  const cells: Element[] = [];
  for (const table of Array.from(document.querySelectorAll(tableSelector))) {
    const scoreRow = Array.from(table.querySelectorAll('thead tr, tbody tr')).find((row) =>
      (row.firstElementChild?.textContent?.trim() ?? '').startsWith('Multi-Core Score'),
    );
    if (scoreRow) cells.push(...Array.from(scoreRow.querySelectorAll('.score')));
  }
  return cells;
}

function annotateSingleScaling(preview: ProcessorContextViewModel): void {
  const desktopContainers = document.querySelectorAll('.score-container.desktop');
  const scoreContainers = desktopContainers.length
    ? desktopContainers
    : document.querySelectorAll('.score-container');
  appendScalingNote(scoreContainers[1]?.querySelector('.score'), preview);

  for (const cell of multiCoreScoreCells('table.benchmark-table')) {
    appendScalingNote(cell.parentElement?.querySelector('.graph') ?? cell, preview);
  }
}

function annotateComparisonScaling(previews: readonly (ProcessorContextViewModel | null)[]): void {
  for (const [index, cell] of multiCoreScoreCells('table.comparison-benchmark-table').entries()) {
    const preview = previews[index];
    if (preview) appendScalingNote(cell, preview);
  }
}

function comparisonDetailRow(
  label: string,
  previews: readonly (ProcessorContextViewModel | null)[],
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
    if (preview) cell.appendChild(render(preview, index));
    else cell.textContent = 'Not available';
    row.appendChild(cell);
  }
  return row;
}

function l3CacheRow(table: Element | undefined): Element | undefined {
  return Array.from(table?.querySelectorAll('tbody tr') ?? []).find(
    (candidate) => candidate.firstElementChild?.textContent?.trim() === 'L3 Cache',
  );
}

/** Flag one reported L3 total that a reviewed source contradicts.
 *
 * One affordance, not two: the warning triangle is itself the link to the
 * source, so a reader gets the objection and where it comes from in a single
 * tooltip. It sits on the value rather than the row label because comparison
 * view puts two processors on one row and only one of them may be affected. The
 * number is never rewritten — this objects to Geekbench's value, it does not
 * replace it.
 */
function markDisputedL3Cache(
  valueCell: Element | null | undefined,
  dispute: ProcessorContextViewModel['disputedL3Cache'] | undefined,
): void {
  if (!valueCell || !dispute) return;
  if (valueCell.querySelector('.geeklens-preview-cache-dispute')) return;

  // The objection is to a total assembled from one die's size and a die count.
  // Which die gets read is not stable — the same 9950X3D has been seen as both
  // `96.0 MB x 2` and `32.0 MB x 2` — but a count above one is what makes the
  // total wrong. If Geekbench ever reports these parts as a single figure there
  // is nothing left to dispute, and the warning would be objecting to a value
  // that had since become correct.
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

export function renderSingleProcessorContext(
  preview: ProcessorContextViewModel,
  settings: Settings,
): void {
  const cpuTable = Array.from(document.querySelectorAll('table.system-table')).find(
    (table) => table.querySelector('th')?.textContent?.trim() === 'CPU Information',
  );
  const nameRow = Array.from(cpuTable?.querySelectorAll('tbody tr') ?? []).find((row) =>
    /^(Name|Processor)$/.test(tableRowLabel(row)),
  );
  const nameCell = nameRow?.lastElementChild;
  if (!nameCell || nameCell.querySelector('[data-geeklens-preview-processor]')) return;

  if (settings.showProcessorSummary) {
    const block = renderIdentity(preview.name, preview);
    block.dataset.geeklensPreviewProcessor = '';
    nameCell.replaceChildren(block);
    if (nameRow?.firstElementChild) markRowLabel(nameRow.firstElementChild, 'changed');
  }

  const topologyRow = Array.from(cpuTable?.querySelectorAll('tbody tr') ?? []).find(
    (row) => row.firstElementChild?.textContent?.trim() === 'Topology',
  );
  if (topologyRow) {
    const labelCell = topologyRow.firstElementChild;
    const valueCell = topologyRow.lastElementChild;
    const nativeTopology = valueCell?.textContent?.trim() ?? '';
    if (settings.showCoreTopology) {
      labelCell?.replaceChildren(rowLabel('Topology', 'changed'));
      valueCell?.replaceChildren(topologyDetails(nativeTopology, preview));
    }

    if (
      settings.showFrequencyDistribution &&
      preview.frequency &&
      !cpuTable?.querySelector('[data-geeklens-preview-detail="frequency"]')
    ) {
      const frequencyRow = document.createElement('tr');
      frequencyRow.dataset.geeklensPreviewDetail = 'frequency';
      const frequencyLabel = document.createElement('td');
      frequencyLabel.className = labelCell?.className ?? 'system-name';
      frequencyLabel.appendChild(rowLabel('Frequency'));
      const frequencyValue = document.createElement('td');
      frequencyValue.className = valueCell?.className ?? 'system-value';
      frequencyValue.appendChild(frequency(preview));
      frequencyRow.append(frequencyLabel, frequencyValue);
      topologyRow.after(frequencyRow);
    }
  }

  markDisputedL3Cache(l3CacheRow(cpuTable)?.lastElementChild, preview.disputedL3Cache);

  if (settings.showReferenceComparison) {
    annotateSingleScoreReferences(preview);
    annotateSinglePerformanceReferences(preview);
  }

  // References must read the untouched numeric score before scaling adds its
  // explanatory text to the same cell.
  if (settings.showMultiCoreScaling) annotateSingleScaling(preview);

  const memoryTable = Array.from(document.querySelectorAll('table.system-table')).find(
    (table) => table.querySelector('th')?.textContent?.trim() === 'Memory Information',
  );
  const sizeCell = memoryTable?.querySelector('tbody tr td:last-child');
  if (settings.showMemoryDetails && preview.memory.length > 0 && sizeCell) {
    sizeCell.parentElement?.firstElementChild?.replaceChildren(rowLabel('Details', 'changed'));
    appendMemoryDetails(sizeCell, preview);
  }
}

export function renderComparisonProcessorContext(
  previews: readonly [ProcessorContextViewModel | null, ProcessorContextViewModel | null],
  settings: Settings,
): void {
  const table = document.querySelector('table.system-information');
  const processorRow = Array.from(table?.querySelectorAll('tbody tr') ?? []).find(
    (row) => tableRowLabel(row) === 'Processor',
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
        const block = renderIdentity(preview.name, preview);
        block.dataset.geeklensPreviewProcessor = '';
        cell.replaceChildren(block);
      }
    });
  if (settings.showProcessorSummary && previews.some(Boolean) && processorRow.firstElementChild) {
    markRowLabel(processorRow.firstElementChild, 'changed');
  }

  // Per lane: the two systems share one L3 row and only one of them may be
  // reporting a total its part contradicts.
  const cacheRow = l3CacheRow(table ?? undefined);
  if (cacheRow) {
    Array.from(cacheRow.children)
      .slice(1, 3)
      .forEach((cell, index) => markDisputedL3Cache(cell, previews[index]?.disputedL3Cache));
  }

  const detailRows: HTMLTableRowElement[] = [];
  if (
    settings.showCoreTopology &&
    !table?.querySelector('[data-geeklens-preview-detail="topology"]')
  ) {
    const topologyRow = comparisonDetailRow('Topology', previews, (preview, index) =>
      topologyDetails(processorTopologies[index] ?? '', preview),
    );
    detailRows.push(topologyRow);
  }
  if (
    settings.showFrequencyDistribution &&
    previews.some((preview) => preview?.frequency) &&
    !table?.querySelector('[data-geeklens-preview-detail="frequency"]')
  ) {
    const frequencyRow = document.createElement('tr');
    frequencyRow.dataset.geeklensPreviewDetail = 'frequency';
    const labelCell = document.createElement('td');
    labelCell.className = 'geeklens-preview-detail-label';
    labelCell.appendChild(rowLabel('Frequency'));
    const chartCell = document.createElement('td');
    chartCell.className = 'geeklens-preview-detail-value';
    chartCell.colSpan = 2;
    // Pass the unfiltered previews so a lane without frequency data still
    // carries its processor name instead of falling back to its role.
    chartCell.appendChild(comparisonFrequency(previews));
    frequencyRow.append(labelCell, chartCell);
    detailRows.push(frequencyRow);
  }
  processorRow.after(...detailRows);

  const memoryRow = Array.from(table?.querySelectorAll('tbody tr') ?? []).find(
    (row) => tableRowLabel(row) === 'Memory',
  );
  if (settings.showMemoryDetails) {
    let annotated = false;
    Array.from(memoryRow?.children ?? [])
      .slice(1, 3)
      .forEach((cell, index) => {
        const preview = previews[index];
        if (!preview?.memory.length) return;
        appendMemoryDetails(cell, preview);
        annotated = true;
      });
    // Only claim the row once something was actually added to it: with no
    // matched memory facts the native row stands untouched.
    if (annotated && memoryRow?.firstElementChild) {
      markRowLabel(memoryRow.firstElementChild, 'changed');
    }
  }
  if (settings.showReferenceComparison && previews[0] && previews[1]) {
    annotateComparisonReferences([previews[0], previews[1]]);
  }
  // References must read the untouched numeric score before scaling adds its
  // explanatory text to the same cell.
  if (settings.showMultiCoreScaling) annotateComparisonScaling(previews);
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
          const reference = referenceElement(preview, current, scoreKind);
          if (reference) cell.appendChild(reference);
        });
    }
  }
}

export function applyProcessorContextPreferences(settings: Settings): void {
  document.body.classList.toggle('geeklens-uncolored-badges', !settings.coloredBadges);
  document.body.classList.toggle('geeklens-tooltips-disabled', !settings.tooltips);
}
