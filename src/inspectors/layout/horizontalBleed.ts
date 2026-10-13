import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';

export const INJECTED_BLEED_SCANNER = `(() => {
  const docWidth = document.documentElement.clientWidth;
  const bleeds = [];

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
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    if (style.display === 'none' || style.visibility === 'hidden') return;

    const overflowRight = rect.right - docWidth;
    const internalOverflow = el.scrollWidth - el.clientWidth;

    if (overflowRight > 2) {
      bleeds.push({
        selector: getUniqueSelector(el),
        tagName: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        overflowPx: Math.round(overflowRight),
        rect: {
          top: Math.round(rect.top + window.scrollY),
          bottom: Math.round(rect.bottom + window.scrollY),
          left: Math.round(rect.left + window.scrollX),
          right: Math.round(rect.right + window.scrollX),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        styles: {
          width: style.width,
          maxWidth: style.maxWidth,
          minWidth: style.minWidth,
          overflowX: style.overflowX
        }
      });
    }
  });

  return bleeds;
})()`;

export async function detectHorizontalBleed(
  page: Page,
  viewport: ViewportDefinition
): Promise<{ defects: VisualDefect[]; rawBleeds: any[] }> {
  // Only applicable on mobile / touch viewports or narrow screens (< 768px)
  if (!viewport.isMobile && viewport.width >= 768) {
    return { defects: [], rawBleeds: [] };
  }

  const rawBleeds = await page.evaluate(INJECTED_BLEED_SCANNER) as any[];

  const defects: VisualDefect[] = rawBleeds.map((b, idx) => ({
    id: `bleed_${viewport.name}_${idx + 1}`,
    type: 'HORIZONTAL_BLEED',
    severity: 'CRITICAL',
    viewportName: viewport.name,
    viewportSize: { width: viewport.width, height: viewport.height },
    elementA: {
      selector: b.selector,
      tagName: b.tagName,
      id: b.id,
      className: b.className,
      rect: b.rect
    },
    overflowPx: b.overflowPx,
    overlapBox: {
      left: viewport.width,
      top: b.rect.top,
      width: b.overflowPx,
      height: b.rect.height,
      area: b.overflowPx * b.rect.height
    }
  }));

  return { defects, rawBleeds };
}
