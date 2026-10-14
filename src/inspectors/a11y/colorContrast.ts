import { Page } from 'playwright';
import { LowContrastDefect, VisualDefect, ViewportDefinition } from '../../types/index.js';

export async function auditColorContrast(
  page: Page,
  viewport: ViewportDefinition,
  defaultMinRatio = 4.5
): Promise<{ defects: VisualDefect[]; rawList: LowContrastDefect[] }> {
  const rawList = await page.evaluate((baseMinRatio) => {
    function parseRgba(colorStr: string): [number, number, number, number] | null {
      if (!colorStr || colorStr === 'transparent') return [0, 0, 0, 0];
      const match = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*[,/]\s*([0-9.]+))?\s*\)/);
      if (!match) return null;
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
      return [r, g, b, isNaN(a) ? 1 : a];
    }

    // Alpha-blend foreground RGBA over opaque RGB background
    function blendOver(fg: [number, number, number, number], bg: [number, number, number]): [number, number, number] {
      const alpha = Math.max(0, Math.min(1, fg[3]));
      return [
        Math.round(fg[0] * alpha + bg[0] * (1 - alpha)),
        Math.round(fg[1] * alpha + bg[1] * (1 - alpha)),
        Math.round(fg[2] * alpha + bg[2] * (1 - alpha))
      ];
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

    // Collect ancestor background layers from root down to element and alpha-composite them
    function getCompositedBgColor(el: Element): [number, number, number] {
      const layers: Array<[number, number, number, number]> = [];
      let current: Element | null = el;
      while (current) {
        const bgStr = window.getComputedStyle(current).backgroundColor;
        const rgba = parseRgba(bgStr);
        if (rgba && rgba[3] > 0) {
          layers.unshift(rgba);
          if (rgba[3] >= 0.999) break; // Reached fully opaque ancestor
        }
        current = current.parentElement;
      }

      let composited: [number, number, number] = [255, 255, 255];
      for (const layer of layers) {
        composited = blendOver(layer, composited);
      }
      return composited;
    }

    const textElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label, li, td, th'));
    const lowContrast: any[] = [];

    textElements.forEach((el) => {
      // Only check elements that directly contain a non-empty text node
      const hasDirectText = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim().length >= 2
      );
      if (!hasDirectText) return;

      const text = (el.textContent || '').trim();
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;

      const textRgba = parseRgba(style.color);
      if (!textRgba) return;

      const bgRgb = getCompositedBgColor(el);
      const effectiveTextRgb = blendOver(textRgba, bgRgb);
      const ratio = getContrast(effectiveTextRgb, bgRgb);

      // WCAG 1.4.3 AA Large Text rule: >= 24px (18pt) OR >= 18.66px (14pt) bold (fontWeight >= 700)
      const fontSizePx = parseFloat(style.fontSize) || 16;
      const fontWeightNum = parseInt(style.fontWeight, 10) || (style.fontWeight === 'bold' ? 700 : 400);
      const isLargeText = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeightNum >= 700);
      const requiredRatio = isLargeText ? Math.min(baseMinRatio, 3.0) : baseMinRatio;

      if (ratio < requiredRatio) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const cls = typeof el.className === 'string' && el.className.trim()
            ? '.' + el.className.trim().split(/\s+/)[0]
            : '';
          lowContrast.push({
            selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls,
            text: text.substring(0, 40),
            textColor: `rgb(${effectiveTextRgb.join(', ')})`,
            bgColor: `rgb(${bgRgb.join(', ')})`,
            contrastRatio: Math.round(ratio * 100) / 100,
            requiredRatio,
            fontSizePx: Math.round(fontSizePx * 10) / 10,
            isLargeText,
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

    return lowContrast.slice(0, 25);
  }, defaultMinRatio) as LowContrastDefect[];

  const defects: VisualDefect[] = rawList.map((c, idx) => ({
    id: `low_contrast_${viewport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx + 1}`,
    type: 'LOW_COLOR_CONTRAST',
    severity: c.contrastRatio < 3.0 ? 'CRITICAL' : 'MAJOR',
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
      description: `Text "${c.text}" (${c.isLargeText ? 'large text' : 'normal text'}, ${c.fontSizePx}px) has poor contrast (${c.contrastRatio}:1 vs required ${c.requiredRatio}:1). Composited FG ${c.textColor} against BG ${c.bgColor}.`,
      suggestedCssFix: `Adjust text color or background to achieve at least ${c.requiredRatio}:1 contrast ratio (WCAG 1.4.3 AA).`
    }
  }));

  return { defects, rawList };
}
