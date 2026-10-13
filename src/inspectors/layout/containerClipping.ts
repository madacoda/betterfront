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

    // Check vertical starvation
    const isOverflowYHidden = style.overflowY === 'hidden' || style.overflowY === 'clip';
    const isStarvedY = el.scrollHeight > el.clientHeight + 4;
    const hasEllipsis = style.textOverflow === 'ellipsis';

    // Check horizontal starvation
    const isOverflowXHidden = style.overflowX === 'hidden' || style.overflowX === 'clip';
    const isStarvedX = el.scrollWidth > el.clientWidth + 4;

    const isVerticallyClipped = isOverflowYHidden && isStarvedY && !hasEllipsis && el.clientHeight > 0;
    const isHorizontallyClipped = isOverflowXHidden && isStarvedX && el.clientWidth > 0;

    if ((isVerticallyClipped || isHorizontallyClipped) && el.clientHeight > 0 && el.clientWidth > 0) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        const clippedPx = isVerticallyClipped ? (el.scrollHeight - el.clientHeight) : (el.scrollWidth - el.clientWidth);
        clippedElements.push({
          selector: getUniqueSelector(el),
          tagName: el.tagName.toLowerCase(),
          id: el.id || null,
          className: el.className || null,
          text: el.textContent?.trim().substring(0, 50) || '',
          direction: isVerticallyClipped ? 'vertical' : 'horizontal',
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          clippedPx,
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
