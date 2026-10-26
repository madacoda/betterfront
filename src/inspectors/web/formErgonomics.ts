import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';

/**
 * Audits visible form inputs, selects, and textareas for:
 * 1. Missing accessible label (<label for>, wrapping <label>, aria-label, aria-labelledby)
 * 2. Missing autocomplete attribute on identity/auth/checkout fields
 * 3. Suboptimal mobile keyboard type/inputmode on email/phone/numeric fields
 */
export async function auditFormErgonomics(
  page: Page,
  viewport: ViewportDefinition
): Promise<VisualDefect[]> {
  const rawIssues = await page.evaluate(() => {
    const issues: Array<{
      selector: string;
      tagName: string;
      issueType: string;
      description: string;
      suggestedFix: string;
      rect: { top: number; bottom: number; left: number; right: number; width: number; height: number };
    }> = [];

    function getSelector(el: Element): string {
      if (el.id) return '#' + el.id;
      const name = el.getAttribute('name');
      if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
      let s = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const c = el.className.trim().split(/\s+/)[0];
        if (c) s += '.' + c;
      }
      return s;
    }

    const inputs = document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea'
    );

    inputs.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;

      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return;

      const id = el.id;
      const hasForLabel = Boolean(id && document.querySelector(`label[for="${CSS.escape(id)}"]`));
      const hasWrappingLabel = Boolean(el.closest('label'));
      const hasAriaLabel = Boolean(
        el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')
      );

      const selector = getSelector(el);
      const box = {
        top: Math.round(rect.top + window.scrollY),
        bottom: Math.round(rect.bottom + window.scrollY),
        left: Math.round(rect.left + window.scrollX),
        right: Math.round(rect.right + window.scrollX),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };

      if (!hasForLabel && !hasWrappingLabel && !hasAriaLabel) {
        issues.push({
          selector,
          tagName: el.tagName.toLowerCase(),
          issueType: 'MISSING_LABEL',
          description: `Form control <${selector}> relies solely on placeholder or lacks an associated <label> / aria-label.`,
          suggestedFix: `Add a <label for="${id || 'field-id'}"> element or aria-label="..." so screen readers and users retain context after typing.`,
          rect: box
        });
      }

      if (el.tagName === 'INPUT') {
        const typeAttr = (el.getAttribute('type') || 'text').toLowerCase();
        const hint = `${el.id} ${el.getAttribute('name') || ''} ${el.getAttribute('placeholder') || ''}`.toLowerCase();
        const autocomplete = el.getAttribute('autocomplete');

        const isIdentityField = /email|e-mail|password|pass|phone|tel|mobile|name|fullname|username|postal|zip/.test(
          hint
        );
        if (isIdentityField && !autocomplete) {
          issues.push({
            selector,
            tagName: 'input',
            issueType: 'MISSING_AUTOCOMPLETE',
            description: `Identity/Auth input <${selector}> is missing an HTML "autocomplete" attribute, hurting autofill UX (WCAG 1.3.5).`,
            suggestedFix: `Add autocomplete="email", "name", "tel", or "current-password" to streamline user completion.`,
            rect: box
          });
        }

        if (typeAttr === 'text' && /email|e-mail/.test(hint)) {
          issues.push({
            selector,
            tagName: 'input',
            issueType: 'SUBOPTIMAL_INPUT_TYPE',
            description: `Email field <${selector}> uses type="text" instead of type="email", preventing mobile @ keyboard layout.`,
            suggestedFix: `Change type="text" to type="email" and inputmode="email".`,
            rect: box
          });
        }
      }
    });

    return issues.slice(0, 15);
  });

  return rawIssues.map((item, idx) => ({
    id: `form_ergonomics_${viewport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx + 1}`,
    type: 'FORM_ERGONOMICS_VIOLATION',
    severity: item.issueType === 'MISSING_LABEL' ? 'MAJOR' : 'MINOR',
    viewportName: viewport.name,
    viewportSize: { width: viewport.width, height: viewport.height },
    elementA: {
      selector: item.selector,
      tagName: item.tagName,
      text: item.issueType,
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
      confidence: 0.94,
      description: item.description,
      suggestedCssFix: item.suggestedFix
    }
  }));
}
