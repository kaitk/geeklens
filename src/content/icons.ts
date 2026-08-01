/** Inline SVG icons.
 *
 * Text glyphs such as `ⓘ` and `↗` are drawn by whichever font Geekbench happens
 * to load, so their weight, size, and baseline drift between platforms. Drawing
 * them ourselves keeps them crisp at small sizes and lets them inherit the
 * surrounding colour, including hover and focus states.
 *
 * Every icon shares one 16-unit viewBox and strokes in `currentColor`, so a new
 * icon only needs its shapes listed below. Sizing lives in the stylesheet. */
const SVG_NS = 'http://www.w3.org/2000/svg';

export type IconName = 'info' | 'external-link';

interface IconShape {
  tag: 'circle' | 'path';
  attributes: Record<string, string>;
}

const STROKE: Record<string, string> = {
  fill: 'none',
  stroke: 'currentColor',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
};

const ICONS: Record<IconName, readonly IconShape[]> = {
  info: [
    {
      tag: 'circle',
      attributes: { ...STROKE, cx: '8', cy: '8', r: '6.75', 'stroke-width': '1.25' },
    },
    { tag: 'circle', attributes: { cx: '8', cy: '4.75', r: '1.1', fill: 'currentColor' } },
    { tag: 'path', attributes: { ...STROKE, d: 'M8 7.3v4.15', 'stroke-width': '1.5' } },
  ],
  'external-link': [
    { tag: 'path', attributes: { ...STROKE, d: 'M5.2 10.8 10.8 5.2', 'stroke-width': '1.4' } },
    { tag: 'path', attributes: { ...STROKE, d: 'M6.4 5.2h4.4v4.4', 'stroke-width': '1.4' } },
  ],
};

/** Icons are decorative: every call site already carries its own `aria-label` or
 * visible text, so the SVG stays out of the accessibility tree. */
export function createIcon(name: IconName, className?: string): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute(
    'class',
    ['geeklens-icon', `geeklens-icon-${name}`, className].filter(Boolean).join(' '),
  );
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  for (const shape of ICONS[name]) {
    const element = document.createElementNS(SVG_NS, shape.tag);
    for (const [attribute, value] of Object.entries(shape.attributes)) {
      element.setAttribute(attribute, value);
    }
    svg.appendChild(element);
  }
  return svg;
}
