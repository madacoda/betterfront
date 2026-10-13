import { Page } from 'playwright';
import { LowContrastDefect, VisualDefect, ViewportDefinition } from '../../types/index.js';

export async function auditColorContrast(
  page: Page,
  viewport: ViewportDefinition,
  minRatio = 4.5
): Promise<{ defects: VisualDefect[]; rawList: LowContrastDefect[] }> {
  const rawList = await page.evaluate((requiredRatio) => {
    function parseRgb(colorStr: string): [number, number, number] | null {
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return null;
      return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
    }

    function getLuminance([r, g, b]: [number, number, number]): number {
      const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function getContrast(rgb1: [number, number, number], rgb2: [number, number, number]): number {
      const lum1 = getLuminance(rgb1);
      const lum2 = getLuminance(rgb2);
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      return (brightest + 0.05) / (darkest + 0.05);
    }

    function getEffectiveBgColor(el: Element): [number, number, number] {
      let current: Element | null = el;
      while (current && current !== document.documentElement) {
        const bg = window.getComputedStyle(current).backgroundColor;
        const rgb = parseRgb(bg);
        // If not transparent (alpha !== 0)
        if (rgb && !bg.includes('rgba(0, 0, 0, 0)')) {
          return rgb;
        }
        current = current.parentElement;
      }
      return [255, 255, 255]; // Default white background
    }

    const textElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label'));
    const lowContrast: any[] = [];

    textElements.forEach((el) => {
      const text = el.textContent?.trim();
      if (!text || text.length < 2) return;

      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;

      const textRgb = parseRgb(style.color);
      if (!textRgb) return;

      const bgRgb = getEffectiveBgColor(el);
      const ratio = getContrast(textRgb, bgRgb);

      if (ratio < requiredRatio) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          lowContrast.push({
            selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''),
            text: text.substring(0, 40),
            textColor: style.color,
            bgColor: `rgb(${bgRgb.join(', ')})`,
            contrastRatio: Math.round(ratio * 100) / 100,
            requiredRatio,
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
      }
    });

    return lowContrast.slice(0, 10); // Report top 10 contrast violations
  }, minRatio) as LowContrastDefect[];

  const defects: VisualDefect[] = rawList.map((c, idx) => ({
    id: `low_contrast_${viewport.name}_${idx + 1}`,
    type: 'LOW_COLOR_CONTRAST',
    severity: 'MAJOR',
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
      confidence: 0.96,
      description: `Text "${c.text}" has poor contrast (${c.contrastRatio}:1 vs required ${c.requiredRatio}:1). Text color ${c.textColor} is illegible against background ${c.bgColor}.`,
      suggestedCssFix: `Darken text color or lighten background to achieve at least 4.5:1 contrast ratio (WCAG 1.4.3 AA).`
    }
  }));

  return { defects, rawList };
}
