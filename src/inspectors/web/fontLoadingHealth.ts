import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';

export async function auditFontLoadingHealth(
  page: Page,
  viewport: ViewportDefinition
): Promise<VisualDefect[]> {
  const rawIssues = await page.evaluate(() => {
    const issues: Array<{
      family: string;
      status: string;
      reason: string;
    }> = [];

    // 1. Check document.fonts FontFaceSet API for failed font loads
    if (document.fonts && typeof document.fonts.forEach === 'function') {
      document.fonts.forEach((fontFace) => {
        if (fontFace.status === 'error') {
          issues.push({
            family: fontFace.family || 'unknown-font',
            status: fontFace.status,
            reason: `Web font "${fontFace.family}" (${fontFace.weight} ${fontFace.style}) failed to load (status="error"), causing fallback font swap or FOIT.`
          });
        }
      });
    }

    // 2. Inspect accessible CSSStyleSheets for @font-face rules lacking font-display
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList | undefined;
        try {
          rules = sheet.cssRules;
        } catch {
          continue; // Cross-origin stylesheet
        }
        if (!rules) continue;
        for (const rule of Array.from(rules)) {
          if (rule.type === CSSRule.FONT_FACE_RULE) {
            const cssText = rule.cssText || '';
            if (!/font-display\s*:/i.test(cssText)) {
              const famMatch = cssText.match(/font-family\s*:\s*([^;]+)/i);
              const family = famMatch ? famMatch[1].trim() : '@font-face';
              issues.push({
                family,
                status: 'missing-font-display',
                reason: `@font-face rule for ${family} omits "font-display: swap | optional", risking Flash of Invisible Text (FOIT) on slow networks.`
              });
            }
          }
        }
      }
    } catch {
      // Ignore CSSOM traversal errors
    }

    return issues.slice(0, 8);
  });

  return rawIssues.map((item, idx) => ({
    id: `font_health_${viewport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx + 1}`,
    type: 'FONT_LOADING_FAILURE',
    severity: item.status === 'error' ? 'MAJOR' : 'MINOR',
    viewportName: viewport.name,
    viewportSize: { width: viewport.width, height: viewport.height },
    elementA: {
      selector: `font-face(${item.family})`,
      tagName: 'style',
      text: item.family,
      rect: { top: 0, bottom: 32, left: 0, right: 200, width: 200, height: 32 }
    },
    aiTriage: {
      isBug: true,
      confidence: 0.92,
      description: item.reason,
      suggestedCssFix: `Ensure WOFF2 font URLs resolve with HTTP 200 and add "font-display: swap;" to all @font-face declarations.`
    }
  }));
}
