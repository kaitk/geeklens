export function createAddedRowMarker(): HTMLElement {
  const marker = document.createElement('span');
  marker.className = 'geeklens-preview-row-marker';
  marker.textContent = '•';
  marker.tabIndex = 0;
  marker.setAttribute('aria-label', 'Added by GeekLens');

  const tooltip = document.createElement('span');
  tooltip.className = 'geeklens-preview-row-tooltip';
  tooltip.textContent = 'This row was added by the GeekLens extension.';
  marker.appendChild(tooltip);
  return marker;
}

export function markAddedRowLabel(cell: Element): void {
  if (cell.querySelector('.geeklens-preview-row-marker')) return;
  cell.appendChild(createAddedRowMarker());
}
