import { Page } from 'playwright';
import { UnsizedMediaDefect, ViewportDefinition, VisualDefect } from '../../types/index.js';

export const INJECTED_UNSIZED_MEDIA_SCANNER = `(() => {
  const mediaElements = Array.from(document.querySelectorAll('img, video, canvas, iframe'));
  const unsized = [];

  function getUniqueSelector(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      const c = el.className.trim().split(/\\s+/)[0];
      if (c) s += '.' + c;
    }
    return s;
  }

  mediaElements.forEach((el) => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const hasWidthAttr = el.hasAttribute('width');
    const hasHeightAttr = el.hasAttribute('height');
    const hasAspectRatio = style.aspectRatio && style.aspectRatio !== 'auto';
    const hasExplicitDimensions = (style.width.endsWith('px') && style.height.endsWith('px'));

    // If media lacks HTML width/height AND lacks CSS aspect-ratio/fixed height, it causes CLS layout shift
    if ((!hasWidthAttr || !hasHeightAttr) && !hasAspectRatio && !hasExplicitDimensions) {
      const rect = el.getBoundingClientRect();
      const missing = [];
      if (!hasWidthAttr) missing.push('HTML width attribute');
      if (!hasHeightAttr) missing.push('HTML height attribute');
      if (!hasAspectRatio) missing.push('CSS aspect-ratio');

      unsized.push({
        selector: getUniqueSelector(el),
        tagName: el.tagName.toLowerCase(),
        src: el.getAttribute('src') || el.getAttribute('data-src') || null,
        missingAttributes: missing,
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

  return unsized;
})()`;

export async function detectUnsizedMedia(
  page: Page,
  viewport: ViewportDefinition
): Promise<{ defects: VisualDefect[]; rawList: UnsizedMediaDefect[] }> {
  const rawList = await page.evaluate(INJECTED_UNSIZED_MEDIA_SCANNER) as UnsizedMediaDefect[];

  const defects: VisualDefect[] = rawList.map((m, idx) => ({
    id: `unsized_media_${viewport.name}_${idx + 1}`,
    type: 'UNSIZED_MEDIA',
    severity: 'MAJOR',
    viewportName: viewport.name,
    viewportSize: { width: viewport.width, height: viewport.height },
    elementA: {
      selector: m.selector,
      tagName: m.tagName,
      rect: m.rect
    },
    overlapBox: {
      left: m.rect.left,
      top: m.rect.top,
      width: Math.max(m.rect.width, 24),
      height: Math.max(m.rect.height, 24),
      area: Math.max(m.rect.width, 24) * Math.max(m.rect.height, 24)
    },
    aiTriage: {
      isBug: true,
      confidence: 0.98,
      description: `Media <${m.selector}> is missing dimension attributes (${m.missingAttributes.join(', ')}). Causes high Cumulative Layout Shift (CLS) when decoded.`,
      suggestedCssFix: `Add width="..." and height="..." HTML attributes, or apply CSS aspect-ratio: 16/9; to reserve layout space.`
    }
  }));

  return { defects, rawList };
}
