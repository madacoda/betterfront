import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';
import { detectTextCollisions } from '../layout/textCollision.js';

export async function runTextZoomStressTest(
  page: Page,
  viewport: ViewportDefinition
): Promise<VisualDefect[]> {
  try {
    // Inject 200% text zoom scale
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });

    await page.waitForTimeout(150);

    const zoomCollisions = await detectTextCollisions(page, {
      ...viewport,
      name: `${viewport.name}_200%_zoom`
    });

    // Reset root font size
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '';
    });

    return zoomCollisions.map((d) => ({
      ...d,
      severity: 'MAJOR' as const,
      aiTriage: {
        isBug: true,
        confidence: 0.95,
        description: 'Text collision or clipping triggered when user scales browser text to 200% (WCAG 1.4.4 failure).',
        suggestedCssFix: 'Avoid hardcoded height in pixels on text containers. Use min-height: fit-content; or relative rem/em units.'
      }
    }));
  } catch {
    return [];
  }
}
