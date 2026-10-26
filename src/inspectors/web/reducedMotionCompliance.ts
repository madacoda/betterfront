import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';

export async function auditReducedMotionCompliance(
  page: Page,
  viewport: ViewportDefinition
): Promise<VisualDefect[]> {
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(80);

    const offendingAnimations = await page.evaluate(() => {
      const offenders: Array<{
        selector: string;
        tagName: string;
        animationName: string;
        duration: string;
        iterationCount: string;
        rect: { top: number; bottom: number; left: number; right: number; width: number; height: number };
      }> = [];

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

        const animName = style.animationName;
        const animDur = parseFloat(style.animationDuration) || 0;
        const animIter = style.animationIterationCount;

        if (
          animName &&
          animName !== 'none' &&
          animDur > 0.3 &&
          (animIter === 'infinite' || parseFloat(animIter) > 2)
        ) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 8 && rect.height > 8) {
            offenders.push({
              selector: getSelector(el),
              tagName: el.tagName.toLowerCase(),
              animationName: animName,
              duration: style.animationDuration,
              iterationCount: animIter,
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

      return offenders.slice(0, 8);
    });

    await page.emulateMedia({ reducedMotion: 'no-preference' });

    return offendingAnimations.map((item, idx) => ({
      id: `reduced_motion_${viewport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx + 1}`,
      type: 'REDUCED_MOTION_VIOLATION',
      severity: 'MINOR',
      viewportName: viewport.name,
      viewportSize: { width: viewport.width, height: viewport.height },
      elementA: {
        selector: item.selector,
        tagName: item.tagName,
        text: `${item.animationName} (${item.duration}, ${item.iterationCount})`,
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
        confidence: 0.92,
        description: `Element <${item.selector}> continues running animation "${item.animationName}" (${item.duration}, ${item.iterationCount}) even when prefers-reduced-motion: reduce is active (WCAG 2.3.3).`,
        suggestedCssFix: `Wrap decorative animations in @media (prefers-reduced-motion: no-preference) or disable them under @media (prefers-reduced-motion: reduce).`
      }
    }));
  } catch {
    await page.emulateMedia({ reducedMotion: 'no-preference' }).catch(() => {});
    return [];
  }
}
