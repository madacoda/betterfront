import { Page } from 'playwright';
import { BrokenLinkDefect, VisualDefect, ViewportDefinition } from '../../types/index.js';

export async function auditPageLinks(
  page: Page,
  viewport: ViewportDefinition
): Promise<{ defects: VisualDefect[]; rawList: BrokenLinkDefect[] }> {
  const rawList = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    const broken: any[] = [];

    function getSelector(el: Element): string {
      if (el.id) return '#' + el.id;
      let s = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const c = el.className.trim().split(/\s+/)[0];
        if (c) s += '.' + c;
      }
      return s;
    }

    links.forEach((a) => {
      const href = a.getAttribute('href') || '';
      const selector = getSelector(a);

      // 1. Empty or pseudo hash links
      if (!href || href === '#' || href.trim() === 'javascript:void(0)') {
        broken.push({
          selector,
          href,
          issue: 'EMPTY_HREF'
        });
        return;
      }

      // 2. Anchor hash links targeting missing DOM elements
      if (href.startsWith('#') && href.length > 1) {
        const targetId = href.substring(1);
        try {
          const targetEl = document.getElementById(targetId) || document.querySelector(`[name="${targetId}"]`);
          if (!targetEl) {
            broken.push({
              selector,
              href,
              issue: 'MISSING_ANCHOR_TARGET',
              anchorId: targetId
            });
          }
        } catch {
          // Ignore invalid selector queries
        }
      }
    });

    return broken;
  }) as BrokenLinkDefect[];

  const defects: VisualDefect[] = rawList.map((b, idx) => ({
    id: `broken_link_${viewport.name}_${idx + 1}`,
    type: 'BROKEN_LINK',
    severity: 'MINOR',
    viewportName: viewport.name,
    viewportSize: { width: viewport.width, height: viewport.height },
    elementA: {
      selector: b.selector,
      tagName: 'a',
      rect: { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }
    },
    aiTriage: {
      isBug: true,
      confidence: 0.95,
      description: b.issue === 'MISSING_ANCHOR_TARGET'
        ? `Anchor link <${b.selector}> points to "${b.href}", but no element with id="${b.anchorId}" exists on the page.`
        : `Interactive link <${b.selector}> has an empty or dummy href ("${b.href}").`,
      suggestedCssFix: 'Set a valid destination URL or valid DOM anchor ID, or replace with a semantic <button>.'
    }
  }));

  return { defects, rawList };
}
