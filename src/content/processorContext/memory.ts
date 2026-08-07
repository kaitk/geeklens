import { createIcon } from '../icons';
import { findSystemTableByHeading } from '../domUtils';
import { markRowLabel } from '../rowMarker';
import type { MemoryFact, ProcessorContextViewModel } from './model';
import { rowLabel, tableRowLabel } from './rows';

const MEMORY_PROVENANCE_HELP = {
  reported: 'Reported by the Geekbench result payload.',
  computed: 'Calculated from the reported memory configuration; not measured.',
  published: 'Published for the matched processor or device; not measured by this result.',
} as const;

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

/** Keep provenance definitions, payload/derivation notes, and source links as
 * separate blocks so exact values and attribution remain legible. */
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

/** Bandwidth is the fact most useful without opening the tooltip. A published
 * figure outranks a calculated one because it describes the matched hardware. */
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

function appendMemoryDetails(
  cell: Element,
  viewModel: ProcessorContextViewModel,
  preserveNative = false,
): void {
  if (cell.querySelector('[data-geeklens-preview-memory]')) return;
  const details = document.createElement('div');
  details.dataset.geeklensPreviewMemory = '';
  details.className = 'geeklens-preview-memory';
  const value = document.createElement('span');
  value.className = 'geeklens-preview-memory-summary';
  value.textContent = memoryHeadline(viewModel.memory);
  const info = document.createElement('span');
  info.className = 'geeklens-preview-memory-info';
  info.tabIndex = 0;
  info.setAttribute('role', 'img');
  info.setAttribute(
    'aria-label',
    `Memory details. ${viewModel.memory.map((fact) => `${memoryFactLabel(fact)}: ${fact.value}. ${MEMORY_PROVENANCE_HELP[fact.provenance]}`).join(' ')}`,
  );
  info.append(createIcon('info'), memoryTooltip(viewModel.memory));
  details.append(value, info);
  const bandwidth = memoryBandwidthLine(viewModel.memory);
  if (bandwidth) details.appendChild(bandwidth);
  if (preserveNative) cell.appendChild(details);
  else cell.replaceChildren(details);
}

export function renderSingleMemory(viewModel: ProcessorContextViewModel): void {
  const table = findSystemTableByHeading('Memory Information');
  const row = Array.from(table?.querySelectorAll('tr') ?? []).find(
    (candidate) => tableRowLabel(candidate) === 'Memory',
  );
  const sizeCell = row?.lastElementChild ?? table?.querySelector('tbody tr td:last-child');
  if (viewModel.memory.length === 0 || !sizeCell) return;
  const nativeMemory = sizeCell.textContent?.trim() ?? '';
  const hasNativeClock = /\b\d+(?:\.\d+)?\s*(?:MHz|GHz)\b/i.test(nativeMemory);
  const preserveNative = hasNativeClock && !viewModel.hasReportedMemoryTransferRate;
  const labelCell = sizeCell.parentElement?.firstElementChild;
  if (labelCell) {
    if (preserveNative) markRowLabel(labelCell, 'changed');
    else labelCell.replaceChildren(rowLabel('Details', 'changed'));
  }
  appendMemoryDetails(sizeCell, viewModel, preserveNative);
}

export function renderComparisonMemory(
  viewModels: readonly [ProcessorContextViewModel | null, ProcessorContextViewModel | null],
  table: Element | null,
): void {
  const row = Array.from(table?.querySelectorAll('tbody tr') ?? []).find(
    (candidate) => tableRowLabel(candidate) === 'Memory',
  );
  let annotated = false;
  Array.from(row?.children ?? [])
    .slice(1, 3)
    .forEach((cell, index) => {
      const viewModel = viewModels[index];
      if (!viewModel?.memory.length) return;
      appendMemoryDetails(cell, viewModel);
      annotated = true;
    });
  // Claim the native row only when a memory block was actually added; without
  // matched facts the Geekbench-owned row must remain untouched.
  if (annotated && row?.firstElementChild) markRowLabel(row.firstElementChild, 'changed');
}
