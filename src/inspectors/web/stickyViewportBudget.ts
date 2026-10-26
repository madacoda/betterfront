import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';

export async function auditStickyViewportBudget(
  page: Page,
  viewport: ViewportDefinition,
  maxViewportCoverageRatio = 0.25
): Promise<VisualDefect[]> {
  const normalizedRatio =
    maxViewportCoverageRatio > 1 ? maxViewportCoverageRatio / 100 : maxViewportCoverageRatio;
  const result = await page.evaluate((maxRatio) => {
    const vh = window.innerHeight || 1;
    const vw = window.innerWidth || 1;
    const stickyLayers: Array<{
      selector: string;
      tagName: string;
      height: number;
      position: string;
      rect: { top: number; bottom: number; left: number; right: number; width: number; height: number };
    }> = [];

    function getSelector(el: Element): string {
      if (el.id) return '#' + el.id;
      let s = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const c = el.className.trim().split(/\s+/)[0];
        if (c) s += '.' + c;
      }
      return s;
    }

    document.querySelectorAll('*').forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;
      if (style.position !== 'fixed' && style.position !== 'sticky') return;

      const rect = el.getBoundingClientRect();
      // Must span at least 40% of viewport width and be visible inside viewport
      if (rect.width < vw * 0.4 || rect.height <= 4 || rect.height >= vh * 0.9) return;
      if (rect.bottom <= 0 || rect.top >= vh) return;

      // Skip if an ancestor is already counted as fixed/sticky
      let p = el.parentElement;
      while (p && p !== document.body) {
        const ps = window.getComputedStyle(p);
        if (ps.position === 'fixed' || ps.position === 'sticky') return;
        p = p.parentElement;
      }

      stickyLayers.push({
        selector: getSelector(el),
        tagName: el.tagName.toLowerCase(),
        height: Math.round(rect.height),
        position: style.position,
        rect: {
          top: Math.round(rect.top + window.scrollY),
          bottom: Math.round(rect.bottom + window.scrollY),
          left: Math.round(rect.left + window.scrollX),
          right: Math.round(rect.right + window.scrollX),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      });
    });

    const totalStickyHeight = stickyLayers.reduce((sum, item) => sum + item.height, 0);
    const coverageRatio = totalStickyHeight / vh;

    return {
      exceeded: coverageRatio > maxRatio,
      coverageRatio: Math.round(coverageRatio * 1000) / 10,
      maxAllowedPercent: Math.round(maxRatio * 100),
      totalStickyHeight,
      vh,
      stickyLayers
    };
  }, normalizedRatio);

  if (!result.exceeded || result.stickyLayers.length === 0) {
    return [];
  }

  const primary = result.stickyLayers.sort((a, b) => b.height - a.height)[0];
  const selectorsList = result.stickyLayers.map((l) => `${l.selector} (${l.height}px)`).join(', ');

  return [
    {
      id: `sticky_budget_${viewport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_1`,
      type: 'STICKY_VIEWPORT_OVERFLOW',
      severity: result.coverageRatio > 35 ? 'CRITICAL' : 'MAJOR',
      viewportName: viewport.name,
      viewportSize: { width: viewport.width, height: viewport.height },
      elementA: {
        selector: primary.selector,
        tagName: primary.tagName,
        text: `${result.coverageRatio}% viewport consumed by sticky chrome`,
        rect: primary.rect
      },
      overlapBox: {
        left: primary.rect.left,
        top: primary.rect.top,
        width: primary.rect.width,
        height: primary.rect.height,
        area: primary.rect.width * primary.rect.height
      },
      aiTriage: {
        isBug: true,
        confidence: 0.94,
        description: `Sticky/Fixed UI layers (${selectorsList}) consume ${result.totalStickyHeight}px (${result.coverageRatio}%) of the ${result.vh}px viewport height, exceeding the ${result.maxAllowedPercent}% ergonomic budget.`,
        suggestedCssFix: `Compact sticky header/footer height on smaller screens or hide secondary bars on scroll down.`
      },
      meta: {
        coveragePercent: result.coverageRatio,
        totalStickyHeightPx: result.totalStickyHeight,
        layers: result.stickyLayers
      }
    }
  ];
}
