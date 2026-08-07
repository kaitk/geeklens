import { createRowMarker, type RowMarkerKind } from '../rowMarker';

export function rowLabel(label: string, kind: RowMarkerKind = 'added'): DocumentFragment {
  const content = document.createDocumentFragment();
  const labelText = document.createElement('span');
  labelText.textContent = label;
  content.append(labelText, createRowMarker(kind));
  return content;
}

/** Read a table label without counting our own marker and its tooltip copy.
 * This keeps row discovery stable when rendering is invoked more than once. */
export function tableRowLabel(row: Element): string {
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
