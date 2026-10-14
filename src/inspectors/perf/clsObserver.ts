import { Page } from 'playwright';
import { CwvMetrics, LayoutShiftEvent } from '../../types/index.js';

export const INJECTED_CWV_AND_CLS_OBSERVER = `
  window.__betterfrontShifts = [];
  window.__betterfrontCwv = {
    lcpMs: 0,
    fcpMs: 0,
    ttfbMs: 0,
    inpMs: 0,
    clsWindowed: 0,
    clsRawTotal: 0
  };

  // 1. Layout Shift (CLS) Observer with Session Windowing (1s gap, 5s max window)
  try {
    let sessionValue = 0;
    let sessionEntries = [];

    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
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
              className: typeof el.className === 'string' ? el.className : null,
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
        window.__betterfrontCwv.clsRawTotal += entry.value;

        const firstEntry = sessionEntries[0];
        const lastEntry = sessionEntries[sessionEntries.length - 1];

        if (
          sessionValue &&
          entry.startTime - lastEntry.startTime < 1000 &&
          entry.startTime - firstEntry.startTime < 5000
        ) {
          sessionValue += entry.value;
          sessionEntries.push(entry);
        } else {
          sessionValue = entry.value;
          sessionEntries = [entry];
        }

        if (sessionValue > window.__betterfrontCwv.clsWindowed) {
          window.__betterfrontCwv.clsWindowed = sessionValue;
        }
      }
    });

    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}

  // 2. Largest Contentful Paint (LCP) Observer
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        window.__betterfrontCwv.lcpMs = Math.round(last.startTime);
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}

  // 3. First Contentful Paint (FCP) Observer
  try {
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          window.__betterfrontCwv.fcpMs = Math.round(entry.startTime);
        }
      }
    });
    paintObserver.observe({ type: 'paint', buffered: true });
  } catch (e) {}

  // 4. Interaction to Next Paint (INP) Event Timing Observer
  try {
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > window.__betterfrontCwv.inpMs) {
          window.__betterfrontCwv.inpMs = Math.round(entry.duration);
        }
      }
    });
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch (e) {}
`;

export async function attachClsObserver(page: Page): Promise<void> {
  await page.addInitScript(INJECTED_CWV_AND_CLS_OBSERVER);
}

export async function extractCapturedLayoutShifts(page: Page): Promise<LayoutShiftEvent[]> {
  try {
    const shifts = await page.evaluate(() => (window as any).__betterfrontShifts || []);
    return shifts as LayoutShiftEvent[];
  } catch {
    return [];
  }
}

export async function extractCwvMetrics(page: Page): Promise<CwvMetrics> {
  try {
    const metrics = await page.evaluate(() => {
      const cwv = (window as any).__betterfrontCwv || {
        lcpMs: 0,
        fcpMs: 0,
        ttfbMs: 0,
        inpMs: 0,
        clsWindowed: 0,
        clsRawTotal: 0
      };

      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries && navEntries.length > 0) {
        cwv.ttfbMs = Math.round(navEntries[0].responseStart);
      }

      if (!cwv.fcpMs) {
        const paints = performance.getEntriesByType('paint');
        const fcp = paints.find((p) => p.name === 'first-contentful-paint');
        if (fcp) cwv.fcpMs = Math.round(fcp.startTime);
      }

      return {
        lcpMs: cwv.lcpMs || cwv.fcpMs || 0,
        fcpMs: cwv.fcpMs || 0,
        ttfbMs: Math.max(0, cwv.ttfbMs || 0),
        inpMs: cwv.inpMs || 0,
        clsWindowed: Number((cwv.clsWindowed || 0).toFixed(4)),
        clsRawTotal: Number((cwv.clsRawTotal || 0).toFixed(4))
      };
    });
    return metrics as CwvMetrics;
  } catch {
    return {
      lcpMs: 0,
      fcpMs: 0,
      ttfbMs: 0,
      inpMs: 0,
      clsWindowed: 0,
      clsRawTotal: 0
    };
  }
}
