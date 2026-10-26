import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';
import { detectContainerClipping } from '../layout/containerClipping.js';
import { detectTextCollisions } from '../layout/textCollision.js';

/**
 * Simulates +35% i18n text expansion (e.g. German/French/Indonesian localization stress)
 * on buttons, navigation links, tabs, and badges to detect layout fragility before translation.
 */
export async function auditI18nTextExpansion(
  page: Page,
  viewport: ViewportDefinition
): Promise<VisualDefect[]> {
  try {
    // 1. Capture baseline defects before text expansion
    const [baseClips, baseCollisions] = await Promise.all([
      detectContainerClipping(page, viewport),
      detectTextCollisions(page, viewport)
    ]);
    const baselineSelectors = new Set([
      ...baseClips.map((d) => d.elementA.selector),
      ...baseCollisions.map((d) => d.elementA.selector)
    ]);

    // 2. Inject +35% pseudo-localization expansion on UI labels
    await page.evaluate(() => {
      const targets = document.querySelectorAll(
        'button, a[href], [role="tab"], [role="button"], label, .badge, th, h1, h2, h3'
      );
      targets.forEach((el, idx) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode() as Text | null;
        while (node) {
          const orig = node.nodeValue || '';
          const trimmed = orig.trim();
          if (trimmed.length >= 3 && trimmed.length <= 40 && !(node as any).__bfOrigText) {
            (node as any).__bfOrigText = orig;
            const padLen = Math.max(3, Math.ceil(trimmed.length * 0.35));
            const expansion = 'äöü'.repeat(Math.ceil(padLen / 3)).slice(0, padLen);
            node.nodeValue = `${orig} [${expansion}]`;
          }
          node = walker.nextNode() as Text | null;
        }
        void idx;
      });
    });

    await page.waitForTimeout(80);

    const i18nVp: ViewportDefinition = {
      ...viewport,
      name: `${viewport.name}_i18n_35pct`
    };

    const [expandedClips, expandedCollisions] = await Promise.all([
      detectContainerClipping(page, i18nVp),
      detectTextCollisions(page, i18nVp)
    ]);

    const newDefects = [...expandedClips, ...expandedCollisions].filter(
      (d) => !baselineSelectors.has(d.elementA.selector)
    );

    return newDefects.slice(0, 10).map((d, idx) => ({
      ...d,
      id: `i18n_expansion_${viewport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx + 1}`,
      type: 'I18N_TEXT_OVERFLOW',
      severity: 'MINOR',
      viewportName: viewport.name,
      aiTriage: {
        isBug: true,
        confidence: 0.91,
        description: `i18n +35% Text Expansion Stress caused ${d.type === 'TEXT_CLIPPING' ? 'container clipping/truncation' : 'text collision'} on <${d.elementA.selector}>. Translating this UI to longer languages (DE/FR/ID) will break layout.`,
        suggestedCssFix: `Replace fixed width/height with min-width, fit-content, and flex-wrap: wrap to accommodate localized string expansion.`
      }
    }));
  } catch {
    return [];
  } finally {
    // Always restore original text nodes cleanly
    await page
      .evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode() as Text | null;
        while (node) {
          if ((node as any).__bfOrigText !== undefined) {
            node.nodeValue = (node as any).__bfOrigText;
            delete (node as any).__bfOrigText;
          }
          node = walker.nextNode() as Text | null;
        }
      })
      .catch(() => {});
  }
}
