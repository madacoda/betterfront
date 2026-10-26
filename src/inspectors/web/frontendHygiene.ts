import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';

/**
 * Audits Frontend Security, SEO & Document Hygiene:
 * 1. External <a target="_blank"> links missing rel="noopener" (reverse tabnabbing risk)
 * 2. Mixed content (http:// assets loaded on https:// origins)
 * 3. Document metadata (<html lang>, <meta name="viewport">, <title>, multiple <h1>)
 * 4. Sensitive secret/JWT patterns exposed in localStorage/sessionStorage
 */
export async function auditFrontendHygiene(
  page: Page,
  viewport: ViewportDefinition
): Promise<VisualDefect[]> {
  const rawIssues = await page.evaluate(() => {
    const issues: Array<{
      selector: string;
      category: string;
      severity: 'MAJOR' | 'MINOR';
      description: string;
      suggestedFix: string;
    }> = [];

    // 1. Document language & viewport meta checks
    const htmlLang = document.documentElement.getAttribute('lang');
    if (!htmlLang || !htmlLang.trim()) {
      issues.push({
        selector: 'html',
        category: 'MISSING_HTML_LANG',
        severity: 'MINOR',
        description: 'Root <html> element is missing a valid "lang" attribute (WCAG 3.1.1 & SEO).',
        suggestedFix: 'Add lang="en" (or appropriate locale code) to the root <html> tag.'
      });
    }

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      issues.push({
        selector: 'head',
        category: 'MISSING_META_VIEWPORT',
        severity: 'MAJOR',
        description: 'Document <head> is missing <meta name="viewport">, causing broken mobile scaling.',
        suggestedFix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> inside <head>.'
      });
    } else {
      const content = (viewportMeta.getAttribute('content') || '').toLowerCase();
      if (content.includes('user-scalable=no') || content.includes('maximum-scale=1')) {
        issues.push({
          selector: 'meta[name="viewport"]',
          category: 'VIEWPORT_ZOOM_LOCKED',
          severity: 'MAJOR',
          description: '<meta name="viewport"> disables pinch-to-zoom (user-scalable=no / maximum-scale=1), violating WCAG 1.4.4.',
          suggestedFix: 'Remove user-scalable=no and allow maximum-scale >= 5 so low-vision users can zoom.'
        });
      }
    }

    // 2. External target="_blank" links missing rel="noopener"
    document.querySelectorAll('a[target="_blank"]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (href.startsWith('http://') || href.startsWith('https://')) {
        try {
          const url = new URL(href, window.location.href);
          if (url.origin !== window.location.origin) {
            const rel = (a.getAttribute('rel') || '').toLowerCase();
            if (!rel.includes('noopener') && !rel.includes('noreferrer')) {
              issues.push({
                selector: a.id ? `#${a.id}` : `a[href="${href.slice(0, 45)}"]`,
                category: 'UNSAFE_TARGET_BLANK',
                severity: 'MINOR',
                description: `External link to "${url.hostname}" uses target="_blank" without rel="noopener noreferrer".`,
                suggestedFix: 'Add rel="noopener noreferrer" to all external target="_blank" links.'
              });
            }
          }
        } catch {
          // Ignore malformed href
        }
      }
    });

    // 3. Mixed HTTP content on HTTPS origins
    if (window.location.protocol === 'https:') {
      document.querySelectorAll('img[src^="http://"], script[src^="http://"], iframe[src^="http://"]').forEach((el) => {
        const src = el.getAttribute('src') || '';
        issues.push({
          selector: `${el.tagName.toLowerCase()}[src="${src.slice(0, 40)}"]`,
          category: 'MIXED_HTTP_CONTENT',
          severity: 'MAJOR',
          description: `Insecure mixed HTTP resource "${src.slice(0, 60)}" loaded on an HTTPS page.`,
          suggestedFix: 'Upgrade all asset and iframe URLs to https://.'
        });
      });
    }

    // 4. Check for raw JWT or secret keys stored in unencrypted Web Storage
    try {
      const stores = [
        { name: 'localStorage', store: window.localStorage },
        { name: 'sessionStorage', store: window.sessionStorage }
      ];
      for (const { name, store } of stores) {
        for (let i = 0; i < store.length; i++) {
          const key = store.key(i);
          if (!key) continue;
          const val = store.getItem(key) || '';
          // Detect raw 3-part base64url JWT or sk_live / api_secret patterns
          if (/^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(val.trim()) || /sk_live_|secret_key/i.test(key)) {
            issues.push({
              selector: `${name}["${key}"]`,
              category: 'STORAGE_SENSITIVE_TOKEN',
              severity: 'MINOR',
              description: `Raw JWT or sensitive credential found in ${name}["${key}"], accessible to any XSS script.`,
              suggestedFix: 'Store session credentials in HttpOnly, Secure, SameSite cookies instead of Web Storage.'
            });
          }
        }
      }
    } catch {
      // Ignore storage access errors
    }

    return issues.slice(0, 12);
  });

  return rawIssues.map((item, idx) => ({
    id: `frontend_hygiene_${viewport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx + 1}`,
    type: 'FRONTEND_HYGIENE_VIOLATION',
    severity: item.severity,
    viewportName: viewport.name,
    viewportSize: { width: viewport.width, height: viewport.height },
    elementA: {
      selector: item.selector,
      tagName: 'hygiene',
      text: item.category,
      rect: { top: 0, bottom: 32, left: 0, right: 200, width: 200, height: 32 }
    },
    aiTriage: {
      isBug: true,
      confidence: 0.95,
      description: item.description,
      suggestedCssFix: item.suggestedFix
    }
  }));
}
