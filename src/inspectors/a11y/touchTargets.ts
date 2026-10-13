import { Page } from 'playwright';
import { TouchTargetDefect, ViewportDefinition } from '../../types/index.js';

export async function auditTouchTargets(
  page: Page,
  viewport: ViewportDefinition,
  minTargetPx = 44
): Promise<TouchTargetDefect[]> {
  if (!viewport.hasTouch && !viewport.isMobile) return [];

  const rawFailures = await page.evaluate((minPx: number) => {
    const interactiveSelectors = 'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex="0"]';
    const failing: any[] = [];

    function getSelector(el: Element): string {
      if (el.id) return '#' + el.id;
      let s = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const c = el.className.trim().split(/\s+/)[0];
        if (c) s += '.' + c;
      }
      return s;
    }

    document.querySelectorAll(interactiveSelectors).forEach((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);

      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;

      // Ignore inline text links inside paragraphs per WCAG exemption
      if (el.tagName === 'A' && el.parentElement && el.parentElement.tagName === 'P') return;

      if (rect.width > 0 && rect.height > 0) {
        if (rect.width < minPx || rect.height < minPx) {
          failing.push({
            selector: getSelector(el),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            area: Math.round(rect.width * rect.height),
            expectedMinPx: minPx,
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

    return failing;
  }, minTargetPx);

  return (rawFailures || []) as TouchTargetDefect[];
}
