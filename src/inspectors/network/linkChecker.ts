import { Page } from 'playwright';
import { BrokenLinkDefect, VisualDefect, ViewportDefinition } from '../../types/index.js';

interface ExtractedPageLinks {
  domBroken: BrokenLinkDefect[];
  httpCandidates: Array<{ selector: string; href: string; resolvedUrl: string }>;
}

export async function auditPageLinks(
  page: Page,
  viewport: ViewportDefinition,
  verifyHttpLinks = true
): Promise<{ defects: VisualDefect[]; rawList: BrokenLinkDefect[] }> {
  const extracted = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    const domBroken: any[] = [];
    const httpCandidates: Array<{ selector: string; href: string; resolvedUrl: string }> = [];
    const seenUrls = new Set<string>();

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
      if (!href || href === '#' || href.trim().toLowerCase() === 'javascript:void(0)') {
        domBroken.push({
          selector,
          href,
          issue: 'EMPTY_HREF'
        });
        return;
      }

      // 2. Anchor hash links targeting missing DOM elements
      if (href.startsWith('#') && href.length > 1) {
        const targetId = decodeURIComponent(href.substring(1));
        try {
          const targetEl = document.getElementById(targetId) || document.querySelector(`[name="${CSS.escape(targetId)}"]`);
          if (!targetEl) {
            domBroken.push({
              selector,
              href,
              issue: 'MISSING_ANCHOR_TARGET',
              anchorId: targetId
            });
          }
        } catch {
          // Ignore invalid selector queries
        }
        return;
      }

      // 3. Collect HTTP/HTTPS links for status verification (same-origin prioritized, max 15 unique links per page)
      if (!href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
        try {
          const resolved = new URL(href, window.location.href);
          if ((resolved.protocol === 'http:' || resolved.protocol === 'https:') && resolved.origin === window.location.origin) {
            const cleanUrl = resolved.href.split('#')[0];
            if (!seenUrls.has(cleanUrl) && httpCandidates.length < 15) {
              seenUrls.add(cleanUrl);
              httpCandidates.push({
                selector,
                href,
                resolvedUrl: cleanUrl
              });
            }
          }
        } catch {
          // Ignore malformed URLs
        }
      }
    });

    return { domBroken, httpCandidates };
  }) as ExtractedPageLinks;

  const rawList: BrokenLinkDefect[] = [...extracted.domBroken];

  // Concurrent HTTP HEAD/GET verification on candidate links
  if (verifyHttpLinks && extracted.httpCandidates.length > 0) {
    const checkPromises = extracted.httpCandidates.map(async (item) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const reqHeaders = { Connection: 'close', 'User-Agent': 'BetterFront-LinkChecker/1.0' };
        let res = await fetch(item.resolvedUrl, { method: 'HEAD', headers: reqHeaders, signal: controller.signal }).catch(() => null);
        if (!res || res.status === 405) {
          res = await fetch(item.resolvedUrl, { method: 'GET', headers: reqHeaders, signal: controller.signal }).catch(() => null);
        }
        clearTimeout(timer);

        if (res && res.status >= 400) {
          rawList.push({
            selector: item.selector,
            href: item.href,
            issue: 'HTTP_ERROR',
            statusCode: res.status
          });
        }
      } catch {
        // Ignore transient network timeouts
      }
    });

    await Promise.all(checkPromises);
  }

  const defects: VisualDefect[] = rawList.map((b, idx) => ({
    id: `broken_link_${viewport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx + 1}`,
    type: 'BROKEN_LINK',
    severity: b.issue === 'HTTP_ERROR' ? 'MAJOR' : 'MINOR',
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
      description:
        b.issue === 'MISSING_ANCHOR_TARGET'
          ? `Anchor link <${b.selector}> points to "${b.href}", but no element with id="${b.anchorId}" exists on the page.`
          : b.issue === 'HTTP_ERROR'
            ? `Link <${b.selector}> ("${b.href}") returned HTTP ${b.statusCode} broken status.`
            : `Interactive link <${b.selector}> has an empty or dummy href ("${b.href}").`,
      suggestedCssFix: 'Set a valid destination URL or valid DOM anchor ID, or replace with a semantic <button>.'
    }
  }));

  return { defects, rawList };
}
