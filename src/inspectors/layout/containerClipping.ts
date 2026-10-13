import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';

export const INJECTED_CLIPPING_SCANNER = `(() => {
  const clippedElements = [];

  function getUniqueSelector(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      const c = el.className.trim().split(/\\s+/)[0];
      if (c) s += '.' + c;
    }
    return s;
  }

  document.querySelectorAll('*').forEach((el) => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    // Check if element has vertical clipping without ellipsis
    const isOverflowHidden = style.overflowY === 'hidden' || style.overflowY === 'clip';
    const isStarved = el.scrollHeight > el.clientHeight + 4;
    const hasEllipsis = style.textOverflow === 'ellipsis';

    if (isOverflowHidden && isStarved && !hasEllipsis && el.clientHeight > 0) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        clippedElements.push({
          selector: getUniqueSelector(el),
          tagName: el.tagName.toLowerCase(),
          id: el.id || null,
          className: el.className || null,
          text: el.textContent?.trim().substring(0, 50) || '',
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
          clippedPx: el.scrollHeight - el.clientHeight,
          rect: {
            top: Math.round(rect.top + window.scrollY),
            bottom: Math.round(rect.bottom + window.scrollY),
            left: Math.round(rect.left + window.scrollX),
            right: Math.round(rect.right + window.scrollX),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        });
      }
    }
  });

  return clippedElements;
})()`;

export async function detectContainerClipping(
  page: Page,
  viewport: ViewportDefinition
): Promise<VisualDefect[]> {
  const rawClipped = await page.evaluate(INJECTED_CLIPPING_SCANNER) as any[];

  return rawClipped.map((c, idx) => ({
    id: `clipping_${viewport.name}_${idx + 1}`,
    type: 'TEXT_CLIPPING',
    severity: 'MAJOR',
    viewportName: viewport.name,
    viewportSize: { width: viewport.width, height: viewport.height },
    elementA: {
      selector: c.selector,
      tagName: c.tagName,
      id: c.id,
      className: c.className,
      text: c.text,
      rect: c.rect
    },
    overlapBox: {
      left: c.rect.left,
      top: c.rect.bottom - 4,
      width: c.rect.width,
      height: c.clippedPx,
      area: c.rect.width * c.clippedPx
    }
  }));
}
