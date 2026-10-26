/**
 * BetterFront UAT - DOM, Storage, Geometry, Accessibility & Invariant Assertion Action Handlers
 */

import { UatActionExecutionContext } from './context.js';
import { resolveSelector } from '../selectorResolver.js';
import { VisualDefect } from '../../types/index.js';
import { detectTextCollisions } from '../../inspectors/layout/textCollision.js';
import { detectHorizontalBleed } from '../../inspectors/layout/horizontalBleed.js';
import { detectContainerClipping } from '../../inspectors/layout/containerClipping.js';
import { detectInteractiveOcclusion } from '../../inspectors/layout/interactiveOcclusion.js';
import { runAxeAudit } from '../../inspectors/a11y/axeRunner.js';
import {
  detectBrokenImagesAndSvg,
  auditStickyViewportBudget,
  auditDarkModeParity,
  auditI18nTextExpansion,
  auditFormErgonomics,
  auditFontLoadingHealth,
  auditDomComplexityBudget,
  auditFrontendHygiene,
  auditReducedMotionCompliance
} from '../../inspectors/web/index.js';

export async function handleAssertionAction(
  action: string,
  ctx: UatActionExecutionContext
): Promise<boolean> {
  const { page, step, activeViewport, consoleErrors, networkErrors, onAnomalies } = ctx;

  switch (action) {
    case 'ASSERT_STORAGE': {
      if (!step.key) throw new Error('ASSERT_STORAGE action requires "key"');
      const expected = step.value !== undefined ? step.value : step.text;
      const storageKind = step.storageType === 'session' ? 'session' : 'local';
      const actual = await page.evaluate(
        ({ k, kind }) => {
          const store = kind === 'session' ? window.sessionStorage : window.localStorage;
          return store.getItem(k);
        },
        { k: step.key, kind: storageKind }
      );
      if (actual === null) {
        throw new Error(`Expected ${storageKind}Storage key "${step.key}" to exist, but it was null`);
      }
      if (expected !== undefined) {
        const match = step.exact !== false ? actual === expected : actual.includes(expected);
        if (!match) {
          throw new Error(`Expected ${storageKind}Storage["${step.key}"] to match "${expected}", but found "${actual}"`);
        }
      }
      return true;
    }

    case 'ASSERT_VISIBLE': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      return true;
    }

    case 'ASSERT_HIDDEN':
    case 'ASSERT_NOT_VISIBLE': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'hidden', timeout });
      return true;
    }

    case 'ASSERT_TEXT': {
      const sel = await resolveSelector(page, step);
      if (step.text === undefined) throw new Error('ASSERT_TEXT action requires "text"');
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      const actual = await el.innerText();
      const expected = step.text;
      const normActual = actual.replace(/\s+/g, ' ').trim();
      const normExpected = expected.replace(/\s+/g, ' ').trim();
      const match = step.exact
        ? actual.trim() === expected.trim() || normActual === normExpected
        : actual.includes(expected) || normActual.includes(normExpected);
      if (!match) {
        throw new Error(`Expected text "${expected}" in element "${sel}", but found "${normActual}"`);
      }
      return true;
    }

    case 'ASSERT_VALUE': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      const actual = await el.inputValue();
      const expected = step.value !== undefined ? step.value : (step.text || '');
      if (actual !== expected) {
        throw new Error(`Expected input value "${expected}" in element "${sel}", but found "${actual}"`);
      }
      return true;
    }

    case 'ASSERT_ATTRIBUTE': {
      const sel = await resolveSelector(page, step);
      if (!step.attribute) throw new Error('ASSERT_ATTRIBUTE action requires "attribute"');
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'attached', timeout });
      const actual = await el.getAttribute(step.attribute);
      if (actual === null) {
        throw new Error(`Expected attribute "${step.attribute}" on "${sel}", but attribute was not present`);
      }
      const expected = step.value !== undefined ? step.value : step.text;
      if (expected !== undefined) {
        const match = step.exact !== false ? actual === expected : actual.includes(expected);
        if (!match) {
          throw new Error(`Expected attribute "${step.attribute}" on "${sel}" to match "${expected}", but found "${actual}"`);
        }
      }
      return true;
    }

    case 'ASSERT_CSS': {
      const sel = await resolveSelector(page, step);
      if (!step.property) throw new Error('ASSERT_CSS action requires "property"');
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      const actual = await el.evaluate((node, prop) => {
        const style = window.getComputedStyle(node);
        return style.getPropertyValue(prop) || (style as any)[prop] || '';
      }, step.property);
      const expected = step.value !== undefined ? step.value : (step.text || '');
      const match = step.exact ? actual.trim() === expected.trim() : actual.includes(expected);
      if (!match) {
        throw new Error(`Expected computed CSS "${step.property}" on "${sel}" to match "${expected}", but found "${actual}"`);
      }
      return true;
    }

    case 'ASSERT_FOCUSED': {
      if (step.selector || step.fallbackSelectors) {
        const sel = await resolveSelector(page, step);
        const isFocused = await page.evaluate((targetSel) => {
          const el = document.querySelector(targetSel);
          return Boolean(el && (document.activeElement === el || el.contains(document.activeElement)));
        }, sel);
        if (!isFocused) {
          throw new Error(`Expected element "${sel}" to have active keyboard focus, but it is not focused`);
        }
      } else {
        const hasInteractiveFocus = await page.evaluate(() => {
          const active = document.activeElement;
          return Boolean(active && active !== document.body && active !== document.documentElement);
        });
        if (!hasInteractiveFocus) {
          throw new Error('Expected an interactive element to have keyboard focus, but document.body is active');
        }
      }
      return true;
    }

    case 'ASSERT_COUNT': {
      const sel = await resolveSelector(page, step);
      const expected = step.count !== undefined ? step.count : 0;
      const op = step.operator || 'equals';
      const actual = await page.locator(sel).count();
      let countPassed = false;
      if (op === 'equals') countPassed = actual === expected;
      else if (op === 'greaterThan') countPassed = actual > expected;
      else if (op === 'lessThan') countPassed = actual < expected;
      if (!countPassed) {
        throw new Error(`Expected element count ${op} ${expected} for "${sel}", but found ${actual}`);
      }
      return true;
    }

    case 'ASSERT_URL': {
      if (!step.url) throw new Error('ASSERT_URL action requires "url"');
      const currentUrl = page.url();
      if (!currentUrl.includes(step.url)) {
        throw new Error(`Expected current URL to contain "${step.url}", but current URL is "${currentUrl}"`);
      }
      return true;
    }

    case 'ASSERT_TITLE': {
      if (!step.text) throw new Error('ASSERT_TITLE action requires "text"');
      const title = await page.title();
      if (!title.includes(step.text)) {
        throw new Error(`Expected page title to contain "${step.text}", but found "${title}"`);
      }
      return true;
    }

    case 'ASSERT_NO_OVERLAP': {
      const found = await detectTextCollisions(page, activeViewport);
      onAnomalies(found);
      if (found.length > 0) {
        throw new Error(`Text collision detected during UAT step: "${found[0].elementA.text}"`);
      }
      return true;
    }

    case 'ASSERT_NO_BLEED': {
      if (activeViewport.isMobile || activeViewport.width <= 768) {
        const bleedRes = await detectHorizontalBleed(page, activeViewport);
        onAnomalies(bleedRes.defects);
        if (bleedRes.defects.length > 0) {
          throw new Error(`Horizontal mobile bleed detected: <${bleedRes.defects[0].elementA.selector}> (+${bleedRes.defects[0].overflowPx}px)`);
        }
      }
      return true;
    }

    case 'ASSERT_NO_CONSOLE_ERRORS': {
      if (consoleErrors.length > 0) {
        throw new Error(`Unhandled console errors detected: ${consoleErrors[0].text}`);
      }
      return true;
    }

    case 'ASSERT_NETWORK_OK': {
      const pattern = step.urlPattern;
      const matchingErrors = pattern
        ? networkErrors.filter((n) => n.url.includes(pattern))
        : networkErrors.filter(
            (n) =>
              n.status !== 401 &&
              n.status !== 403 &&
              !n.url.endsWith('/favicon.ico')
          );
      if (matchingErrors.length > 0) {
        const first = matchingErrors[0];
        throw new Error(`Network error detected: ${first.method} ${first.url} failed (${first.status || first.failureText || 'aborted'})`);
      }
      return true;
    }

    case 'ASSERT_UNOCCLUDED': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
      const hitInfo = await el.evaluate((target: Element) => {
        if (!target) return { found: false, occluded: false };
        const rect = target.getBoundingClientRect();
        const cx = Math.floor(rect.left + rect.width / 2);
        const cy = Math.floor(rect.top + rect.height / 2);
        const hit = document.elementFromPoint(cx, cy);
        if (!hit) return { found: true, occluded: false };
        if (hit === target || target.contains(hit)) return { found: true, occluded: false };
        const hitStyle = window.getComputedStyle(hit);
        if (hitStyle.pointerEvents === 'none') return { found: true, occluded: false };
        return {
          found: true,
          occluded: true,
          hitTag: hit.tagName.toLowerCase(),
          hitClass: typeof hit.className === 'string' ? hit.className.trim() : '',
          hitZIndex: hitStyle.zIndex,
          point: { x: cx, y: cy }
        };
      });
      if (!hitInfo.found) throw new Error(`ASSERT_UNOCCLUDED: Could not find element "${sel}" in DOM`);
      if (hitInfo.occluded) {
        throw new Error(`Element "${sel}" is physically occluded at (${hitInfo.point?.x}, ${hitInfo.point?.y}) by <${hitInfo.hitTag}${hitInfo.hitClass ? ` class="${hitInfo.hitClass}"` : ''}> (z-index: ${hitInfo.hitZIndex})`);
      }
      return true;
    }

    case 'ASSERT_NO_CLIPPING': {
      if (step.selector || step.fallbackSelectors) {
        const sel = await resolveSelector(page, step);
        const timeout = step.timeoutMs || 8000;
        const el = page.locator(sel).first();
        await el.waitFor({ state: 'visible', timeout });
        const clipRes = await page.evaluate((targetSel) => {
          const target = document.querySelector(targetSel);
          if (!target) return { found: false, clipped: false };
          const style = window.getComputedStyle(target);
          const isOverY = style.overflowY === 'hidden' || style.overflowY === 'clip';
          const isOverX = style.overflowX === 'hidden' || style.overflowX === 'clip';
          const starvedY = target.scrollHeight > target.clientHeight + 4;
          const starvedX = target.scrollWidth > target.clientWidth + 4;
          const hasEllipsis = style.textOverflow === 'ellipsis';
          if (isOverY && starvedY && !hasEllipsis) {
            return { found: true, clipped: true, direction: 'vertical', diff: target.scrollHeight - target.clientHeight };
          }
          if (isOverX && starvedX) {
            return { found: true, clipped: true, direction: 'horizontal', diff: target.scrollWidth - target.clientWidth };
          }
          return { found: true, clipped: false };
        }, sel);
        if (!clipRes.found) throw new Error(`ASSERT_NO_CLIPPING: Could not find element "${sel}"`);
        if (clipRes.clipped) {
          throw new Error(`Element "${sel}" has ${clipRes.direction} text clipping/starvation (+${clipRes.diff}px hidden overflow)`);
        }
      } else {
        const clippings = await detectContainerClipping(page, activeViewport);
        onAnomalies(clippings);
        if (clippings.length > 0) {
          throw new Error(`Detected ${clippings.length} starved clipped container(s) on page, including: <${clippings[0].elementA.selector}>`);
        }
      }
      return true;
    }

    case 'ASSERT_TOUCH_TARGET': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 8000;
      const minPx = step.minPx || 44;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      const box = await el.boundingBox();
      if (!box) throw new Error(`ASSERT_TOUCH_TARGET: Cannot compute bounding box for "${sel}"`);
      if (box.width < minPx || box.height < minPx) {
        throw new Error(`Touch target "${sel}" is ${Math.round(box.width)}x${Math.round(box.height)}px, failing minimum size requirement of ${minPx}x${minPx}px (WCAG 2.5.5 / Apple HIG)`);
      }
      return true;
    }

    case 'ASSERT_CONTRAST': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 8000;
      const minRatio = step.minRatio || 4.5;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      const contrastRes = await page.evaluate((targetSel) => {
        const target = document.querySelector(targetSel);
        if (!target) return { found: false };

        let colorCanvasCtx: CanvasRenderingContext2D | null = null;
        function parseRgba(colorStr: string): [number, number, number, number] {
          if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') return [0, 0, 0, 0];
          const match = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*[,/]\s*([0-9.]+))?\s*\)/);
          if (match) {
            return [
              parseInt(match[1], 10),
              parseInt(match[2], 10),
              parseInt(match[3], 10),
              match[4] !== undefined ? parseFloat(match[4]) : 1
            ];
          }
          try {
            if (!colorCanvasCtx) {
              const canvas = document.createElement('canvas');
              canvas.width = 1;
              canvas.height = 1;
              colorCanvasCtx = canvas.getContext('2d', { willReadFrequently: true });
            }
            if (colorCanvasCtx) {
              colorCanvasCtx.clearRect(0, 0, 1, 1);
              colorCanvasCtx.fillStyle = colorStr;
              colorCanvasCtx.fillRect(0, 0, 1, 1);
              const data = colorCanvasCtx.getImageData(0, 0, 1, 1).data;
              return [data[0], data[1], data[2], Math.round((data[3] / 255) * 1000) / 1000];
            }
          } catch {}
          return [0, 0, 0, 1];
        }

        function blendOver(fg: [number, number, number, number], bg: [number, number, number]): [number, number, number] {
          const a = Math.max(0, Math.min(1, fg[3]));
          return [
            Math.round(fg[0] * a + bg[0] * (1 - a)),
            Math.round(fg[1] * a + bg[1] * (1 - a)),
            Math.round(fg[2] * a + bg[2] * (1 - a))
          ];
        }

        function getLuminance(r: number, g: number, b: number) {
          const a = [r, g, b].map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
        }

        const style = window.getComputedStyle(target);
        const fgRgba = parseRgba(style.color);

        const layers: Array<[number, number, number, number]> = [];
        let curr: Element | null = target;
        while (curr) {
          const s = window.getComputedStyle(curr);
          const rgba = parseRgba(s.backgroundColor);
          if (rgba[3] > 0) {
            layers.unshift(rgba);
            if (rgba[3] >= 0.999) break;
          }
          curr = curr.parentElement;
        }
        let bg: [number, number, number] = [255, 255, 255];
        for (const layer of layers) {
          bg = blendOver(layer, bg);
        }
        const fg = blendOver(fgRgba, bg);

        const l1 = getLuminance(fg[0], fg[1], fg[2]);
        const l2 = getLuminance(bg[0], bg[1], bg[2]);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

        return {
          found: true,
          ratio: Math.round(ratio * 100) / 100,
          fg: `rgb(${fg.join(', ')})`,
          bg: `rgb(${bg.join(', ')})`
        };
      }, sel);

      if (!contrastRes.found) throw new Error(`ASSERT_CONTRAST: Could not find element "${sel}"`);
      if (contrastRes.ratio && contrastRes.ratio < minRatio) {
        throw new Error(`Color contrast for "${sel}" is ${contrastRes.ratio}:1 (FG: ${contrastRes.fg}, BG: ${contrastRes.bg}), failing minimum threshold of ${minRatio}:1 (WCAG 1.4.3 AA)`);
      }
      return true;
    }

    case 'ASSERT_ALL_INVARIANTS': {
      const collected: VisualDefect[] = [];
      const issues: string[] = [];

      const isMobileOrCompact = activeViewport.isMobile || activeViewport.width <= 768;
      const [overlaps, bleedRes, clips, occlusions] = await Promise.all([
        detectTextCollisions(page, activeViewport),
        isMobileOrCompact ? detectHorizontalBleed(page, activeViewport) : Promise.resolve({ defects: [], rawBleeds: [] }),
        detectContainerClipping(page, activeViewport),
        detectInteractiveOcclusion(page, activeViewport)
      ]);

      if (overlaps.length > 0) {
        collected.push(...overlaps);
        issues.push(`${overlaps.length} text collision(s)`);
      }
      if (bleedRes.defects.length > 0) {
        collected.push(...bleedRes.defects);
        issues.push(`${bleedRes.defects.length} mobile horizontal bleed(s)`);
      }
      if (clips.length > 0) {
        collected.push(...clips);
        issues.push(`${clips.length} clipped container(s)`);
      }
      if (occlusions.length > 0) {
        collected.push(...occlusions);
        issues.push(`${occlusions.length} occluded interactive control(s)`);
      }
      if (consoleErrors.length > 0) {
        issues.push(`${consoleErrors.length} console exception(s)`);
      }

      onAnomalies(collected);

      if (issues.length > 0) {
        throw new Error(`Visual & runtime invariants violated on ${activeViewport.name}: ${issues.join(', ')}`);
      }
      return true;
    }

    case 'ASSERT_NO_BROKEN_IMAGES': {
      const found = await detectBrokenImagesAndSvg(page, activeViewport);
      onAnomalies(found);
      if (found.length > 0) {
        throw new Error(`Broken image or collapsed SVG detected: <${found[0].elementA.selector}> (${found[0].aiTriage?.description || ''})`);
      }
      return true;
    }

    case 'ASSERT_STICKY_BUDGET': {
      const maxRatio = step.minRatio ? step.minRatio / 100 : 0.25;
      const found = await auditStickyViewportBudget(page, activeViewport, maxRatio);
      onAnomalies(found);
      if (found.length > 0) {
        throw new Error(found[0].aiTriage?.description || `Sticky/fixed layers exceed viewport height budget on ${activeViewport.name}`);
      }
      return true;
    }

    case 'ASSERT_DARK_MODE_PARITY': {
      const found = await auditDarkModeParity(page, activeViewport);
      onAnomalies(found);
      if (found.length > 0) {
        throw new Error(found[0].aiTriage?.description || `Dark mode contrast parity failed on ${activeViewport.name}`);
      }
      return true;
    }

    case 'ASSERT_I18N_EXPANSION': {
      const found = await auditI18nTextExpansion(page, activeViewport);
      onAnomalies(found);
      if (found.length > 0) {
        throw new Error(found[0].aiTriage?.description || `i18n +35% text expansion caused overflow/collision on ${activeViewport.name}`);
      }
      return true;
    }

    case 'ASSERT_FORM_ERGONOMICS': {
      const found = await auditFormErgonomics(page, activeViewport);
      onAnomalies(found);
      if (found.length > 0) {
        throw new Error(found[0].aiTriage?.description || `Form ergonomics check failed on ${activeViewport.name}`);
      }
      return true;
    }

    case 'ASSERT_FONT_HEALTH': {
      const found = await auditFontLoadingHealth(page, activeViewport);
      onAnomalies(found);
      if (found.length > 0) {
        throw new Error(found[0].aiTriage?.description || `Font loading health check failed on ${activeViewport.name}`);
      }
      return true;
    }

    case 'ASSERT_DOM_BUDGET': {
      const maxTotalNodes = step.count || 1500;
      const found = await auditDomComplexityBudget(page, activeViewport, { maxTotalNodes });
      onAnomalies(found);
      if (found.length > 0) {
        throw new Error(found[0].aiTriage?.description || `DOM complexity budget exceeded on ${activeViewport.name}`);
      }
      return true;
    }

    case 'ASSERT_FRONTEND_HYGIENE': {
      const found = await auditFrontendHygiene(page, activeViewport);
      onAnomalies(found);
      if (found.length > 0) {
        throw new Error(found[0].aiTriage?.description || `Frontend hygiene check failed on ${activeViewport.name}`);
      }
      return true;
    }

    case 'ASSERT_REDUCED_MOTION': {
      const found = await auditReducedMotionCompliance(page, activeViewport);
      onAnomalies(found);
      if (found.length > 0) {
        throw new Error(found[0].aiTriage?.description || `Prefers-reduced-motion compliance failed on ${activeViewport.name}`);
      }
      return true;
    }

    case 'ASSERT_A11Y': {
      const axeRes = await runAxeAudit(page);
      const criticalOrSerious = axeRes.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      if (criticalOrSerious.length > 0) {
        throw new Error(`WCAG 2.2 AA accessibility violation (${criticalOrSerious[0].id} - ${criticalOrSerious[0].impact}): ${criticalOrSerious[0].description}`);
      }
      return true;
    }

    default:
      return false;
  }
}
