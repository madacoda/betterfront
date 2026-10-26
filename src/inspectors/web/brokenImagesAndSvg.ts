import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';

export async function detectBrokenImagesAndSvg(
  page: Page,
  viewport: ViewportDefinition
): Promise<VisualDefect[]> {
  const rawIssues = await page.evaluate(() => {
    const issues: Array<{
      selector: string;
      tagName: string;
      reason: string;
      src: string;
      rect: { top: number; bottom: number; left: number; right: number; width: number; height: number };
    }> = [];

    function getSelector(el: Element): string {
      if (el.id) return '#' + el.id;
      const testId = el.getAttribute('data-testid');
      if (testId) return `[data-testid="${testId}"]`;
      let s = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const c = el.className.trim().split(/\s+/)[0];
        if (c) s += '.' + c;
      }
      return s;
    }

    // 1. Check <img> elements for broken decode or missing src
    document.querySelectorAll('img').forEach((img) => {
      const style = window.getComputedStyle(img);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;

      const src = img.getAttribute('src') || img.currentSrc || '';
      const rect = img.getBoundingClientRect();

      if (!src || src.trim() === '') {
        issues.push({
          selector: getSelector(img),
          tagName: 'img',
          reason: 'Image element has an empty or missing src attribute.',
          src: '(empty)',
          rect: {
            top: Math.round(rect.top + window.scrollY),
            bottom: Math.round(rect.bottom + window.scrollY),
            left: Math.round(rect.left + window.scrollX),
            right: Math.round(rect.right + window.scrollX),
            width: Math.max(Math.round(rect.width), 24),
            height: Math.max(Math.round(rect.height), 24)
          }
        });
        return;
      }

      if (img.complete && img.naturalWidth === 0 && !src.startsWith('data:image/svg')) {
        issues.push({
          selector: getSelector(img),
          tagName: 'img',
          reason: `Image failed to load or decode (naturalWidth === 0) for src="${src.slice(0, 80)}".`,
          src: src.slice(0, 80),
          rect: {
            top: Math.round(rect.top + window.scrollY),
            bottom: Math.round(rect.bottom + window.scrollY),
            left: Math.round(rect.left + window.scrollX),
            right: Math.round(rect.right + window.scrollX),
            width: Math.max(Math.round(rect.width), 24),
            height: Math.max(Math.round(rect.height), 24)
          }
        });
      }
    });

    // 2. Check visible <svg> elements that collapsed to 0x0 dimensions
    document.querySelectorAll('svg').forEach((svg) => {
      const style = window.getComputedStyle(svg);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;
      if (svg.getAttribute('aria-hidden') === 'true' && svg.children.length === 0) return;

      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        issues.push({
          selector: getSelector(svg),
          tagName: 'svg',
          reason: `Visible <svg> element collapsed to ${Math.round(rect.width)}x${Math.round(rect.height)}px (missing width/height or viewBox dimensions).`,
          src: 'inline-svg',
          rect: {
            top: Math.round(rect.top + window.scrollY),
            bottom: Math.round(rect.bottom + window.scrollY),
            left: Math.round(rect.left + window.scrollX),
            right: Math.round(rect.right + window.scrollX),
            width: 24,
            height: 24
          }
        });
      }
    });

    return issues;
  });

  return rawIssues.map((item, idx) => ({
    id: `broken_media_${viewport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx + 1}`,
    type: 'BROKEN_IMAGE_OR_SVG',
    severity: 'MAJOR',
    viewportName: viewport.name,
    viewportSize: { width: viewport.width, height: viewport.height },
    elementA: {
      selector: item.selector,
      tagName: item.tagName,
      text: item.src,
      rect: item.rect
    },
    overlapBox: {
      left: item.rect.left,
      top: item.rect.top,
      width: item.rect.width,
      height: item.rect.height,
      area: item.rect.width * item.rect.height
    },
    aiTriage: {
      isBug: true,
      confidence: 0.97,
      description: item.reason,
      suggestedCssFix:
        item.tagName === 'svg'
          ? 'Add explicit width="..." height="..." attributes or CSS width/height to the <svg> element.'
          : 'Verify the image URL exists, returns HTTP 200 with valid image MIME type, and add an alt + fallback handler.'
    }
  }));
}
