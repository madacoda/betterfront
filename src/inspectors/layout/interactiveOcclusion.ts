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
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0 || style.pointerEvents === 'none') return;

    const rect = el.getBoundingClientRect();
    // Element must have non-zero dimension and be inside current visual viewport
    if (rect.width < 10 || rect.height < 10) return;
    if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) return;

    // 5-Point Hit-Testing: Center (0.5, 0.5) + 4 Inner Quadrants (0.25/0.75)
    const sampleOffsets = [
      { name: 'center', rx: 0.5, ry: 0.5 },
      { name: 'topLeft', rx: 0.25, ry: 0.25 },
      { name: 'topRight', rx: 0.75, ry: 0.25 },
      { name: 'bottomLeft', rx: 0.25, ry: 0.75 },
      { name: 'bottomRight', rx: 0.75, ry: 0.75 }
    ];

    let blockedPoints = 0;
    let centerBlocked = false;
    let primaryOccluder = null;
    let firstBlockedCoord = null;

    for (const pt of sampleOffsets) {
      const px = Math.floor(rect.left + rect.width * pt.rx);
      const py = Math.floor(rect.top + rect.height * pt.ry);
      if (px < 0 || px >= window.innerWidth || py < 0 || py >= window.innerHeight) continue;

      const hitEl = document.elementFromPoint(px, py);
      if (!hitEl) continue;

      // If hit element is the target itself, a descendant, or an ancestor label/button wrapper, it is valid
      if (hitEl === el || el.contains(hitEl) || (hitEl.contains(el) && ['LABEL', 'BUTTON', 'A'].includes(hitEl.tagName))) {
        continue;
      }

      const hitStyle = window.getComputedStyle(hitEl);
      if (hitStyle.pointerEvents === 'none') continue;

      blockedPoints++;
      if (pt.name === 'center') centerBlocked = true;
      if (!primaryOccluder) {
        primaryOccluder = { el: hitEl, style: hitStyle };
        firstBlockedCoord = { x: px, y: py };
      }
    }

    // Flag if center is occluded or at least 2 quadrant hit-points are occluded
    if ((centerBlocked || blockedPoints >= 2) && primaryOccluder) {
      const hitEl = primaryOccluder.el;
      const hitStyle = primaryOccluder.style;
      const hitRect = hitEl.getBoundingClientRect();

      occlusions.push({
        blockedElement: {
          selector: getUniqueSelector(el),
          tagName: el.tagName.toLowerCase(),
          id: el.id || null,
          className: typeof el.className === 'string' ? el.className : null,
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
          className: typeof hitEl.className === 'string' ? hitEl.className : null,
          text: (hitEl.textContent || '').trim().substring(0, 40),
          zIndex: hitStyle.zIndex,
          position: hitStyle.position,
          rect: {
            top: Math.round(hitRect.top + window.scrollY),
            bottom: Math.round(hitRect.bottom + window.scrollY),
            left: Math.round(hitRect.left + window.scrollX),
            right: Math.round(hitRect.right + window.scrollX),
            width: Math.round(hitRect.width),
            height: Math.round(hitRect.height)
          }
        },
        hitPoint: firstBlockedCoord,
        blockedPointsCount: blockedPoints,
        centerBlocked
      });
    }
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
    severity: o.centerBlocked ? 'CRITICAL' : 'MAJOR',
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
      blockedPointsCount: o.blockedPointsCount,
      centerBlocked: o.centerBlocked,
      occludingZIndex: o.occludingElement.zIndex,
      occludingPosition: o.occludingElement.position
    }
  }));
}
