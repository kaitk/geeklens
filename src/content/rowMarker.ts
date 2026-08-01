/** The bullet that tells a reader which parts of a Geekbench table are ours.
 *
 * Two kinds, because the honest claim differs: a row GeekLens inserted does not
 * exist on the page otherwise, whereas a row GeekLens edited still shows
 * Geekbench's own reading in changed form. Marking both the same way would
 * imply the extension invented data it only reformatted.
 *
 * A value GeekLens disputes but leaves alone is neither, and is not marked this
 * way at all: it carries the warning affordance in `processorContextUi` instead.
 */
export type RowMarkerKind = 'added' | 'changed';

const MARKER_COPY: Record<RowMarkerKind, { label: string; tooltip: string }> = {
  added: {
    label: 'Added by GeekLens',
    tooltip: 'This row was added by the GeekLens extension.',
  },
  changed: {
    label: 'Changed by GeekLens',
    tooltip: "This row's contents were changed by the GeekLens extension.",
  },
};

export function createRowMarker(kind: RowMarkerKind = 'added'): HTMLElement {
  const copy = MARKER_COPY[kind];
  const marker = document.createElement('span');
  marker.className = 'geeklens-preview-row-marker';
  marker.dataset.geeklensRowMarker = kind;
  marker.textContent = '•';
  marker.tabIndex = 0;
  marker.setAttribute('aria-label', copy.label);

  const tooltip = document.createElement('span');
  tooltip.className = 'geeklens-preview-row-tooltip';
  tooltip.textContent = copy.tooltip;
  marker.appendChild(tooltip);
  return marker;
}

export function markRowLabel(cell: Element, kind: RowMarkerKind = 'added'): void {
  if (cell.querySelector('.geeklens-preview-row-marker')) return;
  cell.appendChild(createRowMarker(kind));
}
