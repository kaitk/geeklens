import type { ProcessorContextViewModel, ProvenanceFact } from './model';
import { rowLabel } from './rows';
import { sourceLink } from './sourceLink';

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

export function topologyDetails(
  nativeTopology: string,
  preview: ProcessorContextViewModel,
): HTMLElement {
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
  // clean assignment, so the legend states the composition without repetition.
  const named = clusters.length > 0 && clusters.every((cluster) => cluster.label !== null);
  // The sentence is the only place core types can appear on parts reporting no
  // clusters at all, which is every sampled AMD result.
  if (preview.coreComposition && !named)
    value.appendChild(compositionLine(preview.coreComposition));
  if (clusters.length === 0) return value;

  // The proportional bar is decorative; the legend carries the same facts as text.
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
      // Core type is more useful in the narrow cell; the frequency row already
      // states the range, so the per-cluster maximum remains in the title.
      text.textContent = `${cluster.cores} ${cluster.label}`;
      if (peak) entry.title = peak;
    } else {
      text.textContent = `${pluralCores(cluster.cores)}${peak ? ` · ${peak}` : ''}`;
    }
    entry.append(swatch, text);
    legend.appendChild(entry);
  }
  // One source covers every group, so it trails rather than repeats per name.
  if (named && preview.coreComposition?.source) {
    legend.appendChild(compositionSourceLink(preview.coreComposition.source));
  }
  value.append(bar, legend);
  return value;
}

export function comparisonTopologyRow(
  previews: readonly [ProcessorContextViewModel | null, ProcessorContextViewModel | null],
  nativeTopologies: readonly string[],
): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.dataset.geeklensPreviewDetail = 'topology';
  const labelCell = document.createElement('td');
  labelCell.className = 'geeklens-preview-detail-label';
  labelCell.appendChild(rowLabel('Topology'));
  row.appendChild(labelCell);
  for (const [index, preview] of previews.entries()) {
    const cell = document.createElement('td');
    cell.className = 'geeklens-preview-detail-value';
    if (preview) cell.appendChild(topologyDetails(nativeTopologies[index] ?? '', preview));
    else cell.textContent = 'Not available';
    row.appendChild(cell);
  }
  return row;
}
