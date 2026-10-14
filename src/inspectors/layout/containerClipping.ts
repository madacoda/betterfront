import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';

export const INJECTED_CLIPPING_SCANNER = `(() => {
  const clippedElements = [];

  function getUniqueSelector(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      const c = el.className.trim().split(/\\s+/).filter(cls => cls && !cls.includes(':'))[0];
      if (c) s += '.' + c;
    }
    return s;
  }

  function isCriticalUiElement(el, text) {
    const tag = el.tagName.toLowerCase();
    const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
    const role = (el.getAttribute('role') || '').toLowerCase();

    // Multi-line prose/descriptions are allowed to use intentional ellipsis
    if (tag === 'p' || cls.includes('desc') || cls.includes('excerpt') || cls.includes('summary') || cls.includes('bio')) {
      return false;
    }

    // Buttons, headings, badges, prices, nav items, table headers, and HUD counters must never be prematurely truncated
    if (
      ['button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'th', ' nav'].includes(tag) ||
      role === 'button' ||
      role === 'tab' ||
      role === 'menuitem' ||
      cls.includes('btn') ||
      cls.includes('badge') ||
      cls.includes('price') ||
      cls.includes('currency') ||
      cls.includes('hud') ||
      cls.includes('title') ||
      el.hasAttribute('data-critical') ||
      /[$€£¥₹]\\s*\\d/.test(text)
    ) {
      return true;
    }

    return false;
  }

  document.querySelectorAll('*').forEach((el) => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;

    const text = (el.textContent || '').trim();
    if (!text) return;

    const isCritical = isCriticalUiElement(el, text);

    // Check vertical starvation
    const isOverflowYHidden = style.overflowY === 'hidden' || style.overflowY === 'clip';
    const isStarvedY = el.scrollHeight > el.clientHeight + 4;
    const hasEllipsis = style.textOverflow === 'ellipsis';

    // Check horizontal starvation (including Premature Ellipsis Trap on critical UI elements)
    const isOverflowXHidden = style.overflowX === 'hidden' || style.overflowX === 'clip';
    const isStarvedX = el.scrollWidth > el.clientWidth + 4;

    const isVerticallyClipped = isOverflowYHidden && isStarvedY && (!hasEllipsis || isCritical) && el.clientHeight > 0;
    const isHorizontallyClipped = isOverflowXHidden && isStarvedX && (!hasEllipsis || isCritical) && el.clientWidth > 0;
    const isPrematureEllipsis = hasEllipsis && isCritical && (isStarvedX || isStarvedY);

    if ((isVerticallyClipped || isHorizontallyClipped) && el.clientHeight > 0 && el.clientWidth > 0) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        const clippedPx = isVerticallyClipped ? (el.scrollHeight - el.clientHeight) : (el.scrollWidth - el.clientWidth);
        clippedElements.push({
          selector: getUniqueSelector(el),
          tagName: el.tagName.toLowerCase(),
          id: el.id || null,
          className: typeof el.className === 'string' ? el.className : null,
          text: text.substring(0, 50),
          direction: isVerticallyClipped ? 'vertical' : 'horizontal',
          isPrematureEllipsis,
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
    id: `clipping_${viewport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx + 1}`,
    type: 'TEXT_CLIPPING',
    severity: c.isPrematureEllipsis ? 'CRITICAL' : 'MAJOR',
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
      top: c.direction === 'vertical' ? c.rect.bottom - 4 : c.rect.top,
      width: c.direction === 'vertical' ? c.rect.width : Math.max(12, c.clippedPx),
      height: c.direction === 'vertical' ? Math.max(12, c.clippedPx) : c.rect.height,
      area: c.rect.width * Math.max(12, c.clippedPx)
    },
    meta: {
      direction: c.direction,
      clippedPx: c.clippedPx,
      isPrematureEllipsis: c.isPrematureEllipsis
    }
  }));
}
