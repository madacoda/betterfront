import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';
import { auditColorContrast } from '../a11y/colorContrast.js';

export async function auditDarkModeParity(
  page: Page,
  viewport: ViewportDefinition
): Promise<VisualDefect[]> {
  try {
    // 1. Emulate prefers-color-scheme: dark and toggle common dark theme hooks (.dark / data-theme="dark")
    const prevState = await page.evaluate(() => {
      const html = document.documentElement;
      const hadDarkClass = html.classList.contains('dark');
      const prevThemeAttr = html.getAttribute('data-theme');
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
      return { hadDarkClass, prevThemeAttr };
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(100);

    const darkContrast = await auditColorContrast(
      page,
      { ...viewport, name: `${viewport.name}_dark_mode` },
      4.5
    );

    // Restore original color scheme & DOM attributes
    await page.emulateMedia({ colorScheme: 'light' });
    await page.evaluate((state) => {
      const html = document.documentElement;
      if (!state.hadDarkClass) html.classList.remove('dark');
      if (state.prevThemeAttr === null) {
        html.removeAttribute('data-theme');
      } else {
        html.setAttribute('data-theme', state.prevThemeAttr);
      }
    }, prevState);

    return darkContrast.rawList.slice(0, 10).map((c, idx) => ({
      id: `dark_mode_parity_${viewport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx + 1}`,
      type: 'DARK_MODE_CONTRAST_FAILURE',
      severity: c.contrastRatio < 2.5 ? 'CRITICAL' : 'MAJOR',
      viewportName: viewport.name,
      viewportSize: { width: viewport.width, height: viewport.height },
      elementA: {
        selector: c.selector,
        tagName: 'text',
        text: c.text,
        rect: c.rect
      },
      overlapBox: {
        left: c.rect.left,
        top: c.rect.top,
        width: c.rect.width,
        height: c.rect.height,
        area: c.rect.width * c.rect.height
      },
      aiTriage: {
        isBug: true,
        confidence: 0.95,
        description: `Dark Mode Parity Failure: Text "${c.text}" inside <${c.selector}> drops to ${c.contrastRatio}:1 contrast (FG ${c.textColor} on BG ${c.bgColor}) when prefers-color-scheme: dark is active.`,
        suggestedCssFix: `Define dark-mode semantic tokens (.dark or @media (prefers-color-scheme: dark)) instead of hardcoded dark text colors.`
      }
    }));
  } catch {
    await page.emulateMedia({ colorScheme: 'light' }).catch(() => {});
    return [];
  }
}
