import { Page } from 'playwright';
import { BreakpointSweepAnomaly, ViewportDefinition, VisualDefect } from '../../types/index.js';

export interface SweepOptions {
  startWidth?: number;
  endWidth?: number;
  stepPx?: number;
}

/**
 * Fluid Breakpoint Sweeper: Dynamically sweeps viewport widths across transition ranges
 * (e.g. 320px -> 1440px) to catch media-query transition gaps and flex-wrap breakages.
 */
export async function runBreakpointSweep(
  page: Page,
  baseViewport: ViewportDefinition,
  options?: SweepOptions
): Promise<{ anomalies: BreakpointSweepAnomaly[]; defects: VisualDefect[] }> {
  const startWidth = options?.startWidth ?? 320;
  const endWidth = options?.endWidth ?? 1440;
  const stepPx = options?.stepPx ?? 80;
  const fixedHeight = baseViewport.height || 844;

  const anomalies: BreakpointSweepAnomaly[] = [];
  const defects: VisualDefect[] = [];
  const seenOffenders = new Set<string>();

  try {
    for (let width = startWidth; width <= endWidth; width += stepPx) {
      await page.setViewportSize({ width, height: fixedHeight });
      await page.waitForTimeout(35);

      const stepIssues = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const broken: Array<{ selector: string; tagName: string; overflow: number; rect: any }> = [];

        function getSelector(el: Element): string {
          if (el.id) return '#' + el.id;
          let s = el.tagName.toLowerCase();
          if (el.className && typeof el.className === 'string') {
            const c = el.className.trim().split(/\s+/)[0];
            if (c) s += '.' + c;
          }
          return s;
        }

        document.querySelectorAll('*').forEach((el) => {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return;
          const rect = el.getBoundingClientRect();
          const overflowRight = Math.round(rect.right - docWidth);
          if (overflowRight > 2) {
            broken.push({
              selector: getSelector(el),
              tagName: el.tagName.toLowerCase(),
              overflow: overflowRight,
              rect: {
                top: Math.round(rect.top + window.scrollY),
                bottom: Math.round(rect.bottom + window.scrollY),
                left: Math.round(rect.left + window.scrollX),
                right: Math.round(rect.right + window.scrollX),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              }
            });
          }
        });

        return broken;
      });

      for (const issue of stepIssues) {
        const key = `${issue.selector}`,
          description = `Breakpoint sweep overflow at ${width}px wide: <${issue.selector}> bleeds by +${issue.overflow}px`;
        anomalies.push({
          width,
          height: fixedHeight,
          type: 'HORIZONTAL_BLEED',
          selector: issue.selector,
          overflowPx: issue.overflow,
          description
        });

        if (!seenOffenders.has(key)) {
          seenOffenders.add(key);
          defects.push({
            id: `sweep_bleed_${width}px_${defects.length + 1}`,
            type: 'HORIZONTAL_BLEED',
            severity: width < 768 ? 'CRITICAL' : 'MAJOR',
            viewportName: `${baseViewport.name} (Sweep @ ${width}px)`,
            viewportSize: { width, height: fixedHeight },
            elementA: {
              selector: issue.selector,
              tagName: issue.tagName,
              rect: issue.rect
            },
            overflowPx: issue.overflow,
            meta: {
              breakpointSweepWidth: width
            }
          });
        }
      }
    }
  } finally {
    // Always restore original viewport size
    await page.setViewportSize({
      width: baseViewport.width,
      height: baseViewport.height
    }).catch(() => {});
  }

  return { anomalies, defects };
}
