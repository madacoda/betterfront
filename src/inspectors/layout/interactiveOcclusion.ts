import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';

export const INJECTED_OCCLUSION_SCANNER = `(() => {
  const occlusions = [];

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

  const interactiveSelectors = 'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], [tabindex="0"]';
  const elements = document.querySelectorAll(interactiveSelectors);

  elements.forEach((el) => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;

    const rect = el.getBoundingClientRect();
    // Element must have non-zero dimension and be inside current visual viewport
    if (rect.width < 10 || rect.height < 10) return;
    if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) return;

    // Check hit test at center point
    const cx = Math.floor(rect.left + rect.width / 2);
    const cy = Math.floor(rect.top + rect.height / 2);

    if (cx < 0 || cx >= window.innerWidth || cy < 0 || cy >= window.innerHeight) return;

    const hitEl = document.elementFromPoint(cx, cy);
    if (!hitEl) return;

    // If hit element is the element itself or a child of it, it is clickable
    if (hitEl === el || el.contains(hitEl)) return;

    // Check if the hit element has pointer-events: none (transparent to clicks)
    const hitStyle = window.getComputedStyle(hitEl);
    if (hitStyle.pointerEvents === 'none') return;

    // An occluding element is intercepting clicks to this interactive element!
    occlusions.push({
      blockedElement: {
        selector: getUniqueSelector(el),
        tagName: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        text: (el.textContent || (el.value !== undefined ? el.value : '')).trim().substring(0, 40),
        rect: {
          top: Math.round(rect.top + window.scrollY),
          bottom: Math.round(rect.bottom + window.scrollY),
          left: Math.round(rect.left + window.scrollX),
          right: Math.round(rect.right + window.scrollX),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      },
      occludingElement: {
        selector: getUniqueSelector(hitEl),
        tagName: hitEl.tagName.toLowerCase(),
        id: hitEl.id || null,
        className: hitEl.className || null,
        text: (hitEl.textContent || '').trim().substring(0, 40),
        zIndex: hitStyle.zIndex,
        position: hitStyle.position,
        rect: {
          top: Math.round(hitEl.getBoundingClientRect().top + window.scrollY),
          bottom: Math.round(hitEl.getBoundingClientRect().bottom + window.scrollY),
          left: Math.round(hitEl.getBoundingClientRect().left + window.scrollX),
          right: Math.round(hitEl.getBoundingClientRect().right + window.scrollX),
          width: Math.round(hitEl.getBoundingClientRect().width),
          height: Math.round(hitEl.getBoundingClientRect().height)
        }
      },
      hitPoint: { x: cx, y: cy }
    });
  });

  return occlusions;
})()`;

export async function detectInteractiveOcclusion(
  page: Page,
  viewport: ViewportDefinition
): Promise<VisualDefect[]> {
  const rawOcclusions = await page.evaluate(INJECTED_OCCLUSION_SCANNER) as any[];

  return (rawOcclusions || []).map((o, idx) => ({
    id: `occlusion_${viewport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx + 1}`,
    type: 'COMPONENT_OCCLUSION',
    severity: 'CRITICAL',
    viewportName: viewport.name,
    viewportSize: { width: viewport.width, height: viewport.height },
    elementA: o.blockedElement,
    elementB: o.occludingElement,
    overlapBox: {
      left: o.blockedElement.rect.left,
      top: o.blockedElement.rect.top,
      width: o.blockedElement.rect.width,
      height: o.blockedElement.rect.height,
      area: o.blockedElement.rect.width * o.blockedElement.rect.height
    },
    meta: {
      hitPoint: o.hitPoint,
      occludingZIndex: o.occludingElement.zIndex,
      occludingPosition: o.occludingElement.position
    }
  }));
}
