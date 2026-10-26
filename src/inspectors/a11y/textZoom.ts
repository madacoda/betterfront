import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';
import { detectTextCollisions } from '../layout/textCollision.js';
import { detectContainerClipping } from '../layout/containerClipping.js';
import { detectHorizontalBleed } from '../layout/horizontalBleed.js';

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

    const zoomVp: ViewportDefinition = {
      ...viewport,
      name: `${viewport.name}_200%_zoom`
    };

    const [zoomCollisions, zoomClippings, zoomBleeds] = await Promise.all([
      detectTextCollisions(page, zoomVp),
      detectContainerClipping(page, zoomVp),
      detectHorizontalBleed(page, zoomVp).then((r) => r.defects)
    ]);

    const combined = [...zoomCollisions, ...zoomClippings, ...zoomBleeds];

    return combined.map((d) => ({
      ...d,
      severity: 'MAJOR' as const,
      aiTriage: {
        isBug: true,
        confidence: 0.95,
        description: `WCAG 1.4.4 200% Text Zoom failure (${d.type.replace(/_/g, ' ')}) on <${d.elementA.selector}> when user scales browser font size to 200%.`,
        suggestedCssFix: 'Avoid hardcoded height/width in pixels on text containers. Use min-height: fit-content; or relative rem/em units.'
      }
    }));
  } catch {
    return [];
  } finally {
    // Always reset root font size
    await page
      .evaluate(() => {
        document.documentElement.style.fontSize = '';
      })
      .catch(() => {});
  }
}
