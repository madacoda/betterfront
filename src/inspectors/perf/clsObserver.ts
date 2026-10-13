import { Page } from 'playwright';
import { LayoutShiftEvent } from '../../types/index.js';

export const INJECTED_CLS_OBSERVER = `
  window.__betterfrontShifts = [];

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Exclude shifts that occurred within 500ms of user input
        if (entry.hadRecentInput) continue;

        const shiftData = {
          value: entry.value,
          startTime: entry.startTime,
          sources: []
        };

        if (entry.sources) {
          for (const source of entry.sources) {
            if (!source.node) continue;
            const el = source.node;
            const selector = el.tagName ? el.tagName.toLowerCase() 
              + (el.id ? '#' + el.id : '')
              + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '') : 'unknown';

            shiftData.sources.push({
              tagName: el.tagName || '',
              selector,
              id: el.id || null,
              className: el.className || null,
              textContent: el.textContent ? el.textContent.trim().substring(0, 40) : null,
              previousRect: {
                top: Math.round(source.previousRect.top),
                bottom: Math.round(source.previousRect.bottom),
                left: Math.round(source.previousRect.left),
                right: Math.round(source.previousRect.right),
                width: Math.round(source.previousRect.width),
                height: Math.round(source.previousRect.height)
              },
              currentRect: {
                top: Math.round(source.currentRect.top),
                bottom: Math.round(source.currentRect.bottom),
                left: Math.round(source.currentRect.left),
                right: Math.round(source.currentRect.right),
                width: Math.round(source.currentRect.width),
                height: Math.round(source.currentRect.height)
              },
              deltaY: Math.round(source.currentRect.top - source.previousRect.top),
              deltaX: Math.round(source.currentRect.left - source.previousRect.left)
            });
          }
        }

        window.__betterfrontShifts.push(shiftData);
      }
    });

    observer.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    // Layout Instability API may not be supported on non-Chromium engines
  }
`;

export async function attachClsObserver(page: Page): Promise<void> {
  await page.addInitScript(INJECTED_CLS_OBSERVER);
}

export async function extractCapturedLayoutShifts(page: Page): Promise<LayoutShiftEvent[]> {
  try {
    const shifts = await page.evaluate(() => (window as any).__betterfrontShifts || []);
    return shifts as LayoutShiftEvent[];
  } catch {
    return [];
  }
}
