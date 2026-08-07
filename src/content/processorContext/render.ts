/** Shared Geekbench system-table anchors are orchestration-owned and passed to
 * feature renderers. Score features locate their distinct benchmark tables;
 * single-result memory similarly owns the separate Memory Information table. */
import type { Settings } from '../../settings/settings';
import { markRowLabel } from '../rowMarker';
import { markDisputedL3Cache } from './cacheDispute';
import { renderComparisonFrequency, renderSingleFrequency } from './frequency';
import { renderIdentity } from './identity';
import { renderComparisonMemory, renderSingleMemory } from './memory';
import type { ProcessorContextViewModel } from './model';
import { rowLabel, tableRowLabel } from './rows';
import { annotateComparisonScaling, annotateSingleScaling } from './scaling';
import { annotateComparisonReferences, annotateSingleScoreReferences } from './scoreReferences';
import { comparisonTopologyRow, topologyDetails } from './topology';

function processorTopology(cell: Element): string {
  const lines = (cell.textContent ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.slice(1).join(' · ');
}

function l3CacheRow(table: Element | null | undefined): Element | undefined {
  return Array.from(table?.querySelectorAll('tbody tr') ?? []).find(
    (row) => row.firstElementChild?.textContent?.trim() === 'L3 Cache',
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
    const block = renderIdentity(preview);
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
    if (settings.showFrequencyDistribution) renderSingleFrequency(preview, cpuTable, topologyRow);
  }

  markDisputedL3Cache(l3CacheRow(cpuTable)?.lastElementChild, preview.disputedL3Cache);
  if (settings.showReferenceComparison) annotateSingleScoreReferences(preview);
  // References must read untouched numeric scores before scaling adds text.
  if (settings.showMultiCoreScaling) annotateSingleScaling(preview);
  if (settings.showMemoryDetails) renderSingleMemory(preview);
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
      processorTopologies.push(processorTopology(cell));
      if (settings.showProcessorSummary) {
        const preview = previews[index];
        if (!preview) return;
        const block = renderIdentity(preview);
        block.dataset.geeklensPreviewProcessor = '';
        cell.replaceChildren(block);
      }
    });
  if (settings.showProcessorSummary && previews.some(Boolean) && processorRow.firstElementChild) {
    markRowLabel(processorRow.firstElementChild, 'changed');
  }

  // Per lane: one shared L3 row can dispute only one processor's value.
  const cacheRow = l3CacheRow(table);
  Array.from(cacheRow?.children ?? [])
    .slice(1, 3)
    .forEach((cell, index) => markDisputedL3Cache(cell, previews[index]?.disputedL3Cache));

  const detailRows: HTMLTableRowElement[] = [];
  if (
    settings.showCoreTopology &&
    !table?.querySelector('[data-geeklens-preview-detail="topology"]')
  ) {
    detailRows.push(comparisonTopologyRow(previews, processorTopologies));
  }
  if (settings.showFrequencyDistribution) {
    const row = renderComparisonFrequency(previews, table);
    if (row) detailRows.push(row);
  }
  processorRow.after(...detailRows);

  if (settings.showMemoryDetails) renderComparisonMemory(previews, table);
  if (settings.showReferenceComparison && previews[0] && previews[1]) {
    annotateComparisonReferences([previews[0], previews[1]]);
  }
  // References must read untouched numeric scores before scaling adds text.
  if (settings.showMultiCoreScaling) annotateComparisonScaling(previews);
}

export function applyProcessorContextPreferences(settings: Settings): void {
  document.body.classList.toggle('geeklens-uncolored-badges', !settings.coloredBadges);
  document.body.classList.toggle('geeklens-tooltips-disabled', !settings.tooltips);
}
