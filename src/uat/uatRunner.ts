import * as fs from 'fs';
import * as path from 'path';
import { Page } from 'playwright';
import {
  UatScenario,
  UatRunResult,
  UatStepResult,
  ViewportDefinition,
  VisualDefect,
  UatActionType
} from '../types/index.js';
import { KinematicsEngine } from '../agent/kinematics.js';
import { TypistEngine } from '../agent/typist.js';
import { ScrollerEngine } from '../agent/scroller.js';
import { FormFillerEngine } from '../agent/formFiller.js';
import { detectTextCollisions } from '../inspectors/layout/textCollision.js';
import { detectHorizontalBleed } from '../inspectors/layout/horizontalBleed.js';
import { detectContainerClipping } from '../inspectors/layout/containerClipping.js';

function resolveUrl(targetUrl: string, baseUrl?: string): string {
  if (!baseUrl || targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
    return targetUrl;
  }
  try {
    const baseObj = new URL(baseUrl);
    return new URL(targetUrl, baseObj.origin).toString();
  } catch {
    return targetUrl;
  }
}

export class UatRunner {
  private kinematics = new KinematicsEngine();
  private typist = new TypistEngine();
  private scroller = new ScrollerEngine();
  private formFiller = new FormFillerEngine();

  public async executeScenario(
    page: Page,
    scenario: UatScenario,
    viewport: ViewportDefinition,
    consoleErrors: any[]
  ): Promise<UatRunResult> {
    const startTime = Date.now();
    const stepResults: UatStepResult[] = [];
    let passed = true;

    console.log(`\n📋 Running UAT Scenario: "${scenario.name}" on ${viewport.name}`);

    // Initial navigation if startUrl provided
    if (scenario.startUrl) {
      try {
        await page.goto(scenario.startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(800);
      } catch (navErr) {
        console.warn(`   ⚠️ Initial navigation warning: ${(navErr as Error).message}`);
      }
    }

    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      const stepStart = Date.now();
      let stepPassed = true;
      let errorMsg: string | undefined;
      let warningMsg: string | undefined;
      let anomalies: VisualDefect[] = [];
      let screenshotFilePath: string | undefined;
      let failureScreenshotPath: string | undefined;

      const action = (step.action ? step.action.toUpperCase().trim() : '') as UatActionType;
      const desc = step.description || `${action} ${step.selector || step.url || step.key || ''}`.trim();
      console.log(`   Step [${i + 1}/${scenario.steps.length}]: ${desc}`);

      try {
        switch (action) {
          case 'GOTO': {
            const rawUrl = step.url || scenario.startUrl;
            if (!rawUrl) throw new Error('GOTO action requires a "url" or "startUrl"');
            const destUrl = resolveUrl(rawUrl, scenario.baseUrl || scenario.startUrl);
            await page.goto(destUrl, {
              waitUntil: 'domcontentloaded',
              timeout: step.timeoutMs || 30000
            });
            await page.waitForTimeout(500);
            break;
          }

          case 'RELOAD': {
            await page.reload({
              waitUntil: 'domcontentloaded',
              timeout: step.timeoutMs || 30000
            });
            await page.waitForTimeout(500);
            break;
          }

          case 'CLICK': {
            if (!step.selector) throw new Error('CLICK action requires "selector"');
            const timeout = step.timeoutMs || 8000;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'visible', timeout });
            await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
            const clicked = await this.kinematics.humanMoveAndClick(page, step.selector);
            if (!clicked) {
              // Resilient fallback to Playwright native locator click
              await el.click({ timeout }).catch(async () => {
                await el.click({ timeout, force: true });
              });
            }
            break;
          }

          case 'DOUBLE_CLICK': {
            if (!step.selector) throw new Error('DOUBLE_CLICK action requires "selector"');
            const timeout = step.timeoutMs || 8000;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'visible', timeout });
            await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
            await el.dblclick({ timeout });
            break;
          }

          case 'HOVER': {
            if (!step.selector) throw new Error('HOVER action requires "selector"');
            const timeout = step.timeoutMs || 8000;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'visible', timeout });
            await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
            const hovered = await this.kinematics.humanHover(page, step.selector);
            if (!hovered) {
              await el.hover({ timeout });
            }
            await page.waitForTimeout(200);
            break;
          }

          case 'TYPE': {
            if (!step.selector) throw new Error('TYPE action requires "selector"');
            if (step.text === undefined) throw new Error('TYPE action requires "text"');
            const timeout = step.timeoutMs || 8000;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'visible', timeout });
            await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
            const shouldClear = step.clearFirst !== false;
            if (step.delayMs && step.delayMs > 0) {
              if (shouldClear) await el.fill('');
              await el.pressSequentially(step.text, { delay: step.delayMs });
              if (step.pressEnter) {
                await page.keyboard.press('Enter');
              }
            } else {
              await this.typist.humanType(page, step.selector, step.text, 0, shouldClear, Boolean(step.pressEnter));
            }
            break;
          }

          case 'CLEAR': {
            if (!step.selector) throw new Error('CLEAR action requires "selector"');
            const timeout = step.timeoutMs || 8000;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'visible', timeout });
            await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
            await el.fill('');
            break;
          }

          case 'PRESS_KEY': {
            if (!step.key) throw new Error('PRESS_KEY action requires "key"');
            if (step.selector) {
              const el = page.locator(step.selector).first();
              await el.focus();
            }
            await page.keyboard.press(step.key);
            await page.waitForTimeout(150);
            break;
          }

          case 'SELECT': {
            if (!step.selector) throw new Error('SELECT action requires "selector"');
            const timeout = step.timeoutMs || 8000;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'visible', timeout });
            if (step.value !== undefined) {
              await el.selectOption({ value: step.value });
            } else if (step.text !== undefined) {
              await el.selectOption({ label: step.text });
            } else {
              throw new Error('SELECT action requires either "value" or "text"');
            }
            break;
          }

          case 'CHECK': {
            if (!step.selector) throw new Error('CHECK action requires "selector"');
            const timeout = step.timeoutMs || 8000;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'visible', timeout });
            await el.check({ timeout });
            break;
          }

          case 'UNCHECK': {
            if (!step.selector) throw new Error('UNCHECK action requires "selector"');
            const timeout = step.timeoutMs || 8000;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'visible', timeout });
            await el.uncheck({ timeout });
            break;
          }

          case 'SCROLL': {
            const px = step.scrollPx !== undefined ? step.scrollPx : 500;
            const finalPx = step.direction === 'up' ? -Math.abs(px) : px;
            await this.scroller.humanScroll(page, finalPx);
            break;
          }

          case 'SCROLL_TO': {
            if (!step.selector) throw new Error('SCROLL_TO action requires "selector"');
            const timeout = step.timeoutMs || 8000;
            const el = page.locator(step.selector).first();
            await el.scrollIntoViewIfNeeded({ timeout });
            await page.waitForTimeout(300);
            break;
          }

          case 'WAIT': {
            await page.waitForTimeout(step.waitMs !== undefined ? step.waitMs : 1000);
            break;
          }

          case 'WAIT_FOR': {
            if (!step.selector) throw new Error('WAIT_FOR action requires "selector"');
            const timeout = step.timeoutMs || 10000;
            const state = step.state || 'visible';
            const el = page.locator(step.selector).first();
            await el.waitFor({ state, timeout });
            break;
          }

          case 'WAIT_FOR_NAV': {
            const timeout = step.timeoutMs || 10000;
            if (step.url) {
              await page.waitForURL(step.url, { timeout });
            } else {
              await page.waitForLoadState('domcontentloaded', { timeout });
            }
            break;
          }

          case 'FILL_FORM': {
            await this.formFiller.autoFillVisibleForms(page);
            break;
          }

          case 'ASSERT_VISIBLE': {
            if (!step.selector) throw new Error('ASSERT_VISIBLE action requires "selector"');
            const timeout = step.timeoutMs || 8000;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'visible', timeout });
            break;
          }

          case 'ASSERT_HIDDEN':
          case 'ASSERT_NOT_VISIBLE': {
            if (!step.selector) throw new Error(`${action} action requires "selector"`);
            const timeout = step.timeoutMs || 8000;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'hidden', timeout });
            break;
          }

          case 'ASSERT_TEXT': {
            if (!step.selector) throw new Error('ASSERT_TEXT action requires "selector"');
            if (step.text === undefined) throw new Error('ASSERT_TEXT action requires "text"');
            const timeout = step.timeoutMs || 8000;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'visible', timeout });
            const actual = await el.innerText();
            const expected = step.text;
            const match = step.exact ? actual.trim() === expected.trim() : actual.includes(expected);
            if (!match) {
              throw new Error(`Expected text "${expected}" in element "${step.selector}", but found "${actual.trim()}"`);
            }
            break;
          }

          case 'ASSERT_VALUE': {
            if (!step.selector) throw new Error('ASSERT_VALUE action requires "selector"');
            const timeout = step.timeoutMs || 8000;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'visible', timeout });
            const actual = await el.inputValue();
            const expected = step.value !== undefined ? step.value : (step.text || '');
            if (actual !== expected) {
              throw new Error(`Expected input value "${expected}" in element "${step.selector}", but found "${actual}"`);
            }
            break;
          }

          case 'ASSERT_COUNT': {
            if (!step.selector) throw new Error('ASSERT_COUNT action requires "selector"');
            const expected = step.count !== undefined ? step.count : 0;
            const op = step.operator || 'equals';
            const actual = await page.locator(step.selector).count();
            let countPassed = false;
            if (op === 'equals') countPassed = actual === expected;
            else if (op === 'greaterThan') countPassed = actual > expected;
            else if (op === 'lessThan') countPassed = actual < expected;
            if (!countPassed) {
              throw new Error(`Expected element count ${op} ${expected} for "${step.selector}", but found ${actual}`);
            }
            break;
          }

          case 'ASSERT_URL': {
            if (!step.url) throw new Error('ASSERT_URL action requires "url"');
            const currentUrl = page.url();
            if (!currentUrl.includes(step.url)) {
              throw new Error(`Expected current URL to contain "${step.url}", but current URL is "${currentUrl}"`);
            }
            break;
          }

          case 'ASSERT_TITLE': {
            if (!step.text) throw new Error('ASSERT_TITLE action requires "text"');
            const title = await page.title();
            if (!title.includes(step.text)) {
              throw new Error(`Expected page title to contain "${step.text}", but found "${title}"`);
            }
            break;
          }

          case 'ASSERT_NO_OVERLAP': {
            anomalies = await detectTextCollisions(page, viewport);
            if (anomalies.length > 0) {
              throw new Error(`Text collision detected during UAT step: "${anomalies[0].elementA.text}"`);
            }
            break;
          }

          case 'ASSERT_NO_BLEED': {
            if (viewport.isMobile) {
              const bleedRes = await detectHorizontalBleed(page, viewport);
              if (bleedRes.defects.length > 0) {
                throw new Error(`Horizontal mobile bleed detected: <${bleedRes.defects[0].elementA.selector}> (+${bleedRes.defects[0].overflowPx}px)`);
              }
            }
            break;
          }

          case 'ASSERT_NO_CONSOLE_ERRORS': {
            if (consoleErrors.length > 0) {
              throw new Error(`Unhandled console errors detected: ${consoleErrors[0].text}`);
            }
            break;
          }

          case 'ASSERT_UNOCCLUDED': {
            if (!step.selector) throw new Error('ASSERT_UNOCCLUDED action requires "selector"');
            const timeout = step.timeoutMs || 8000;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'visible', timeout });
            await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
            const hitInfo = await page.evaluate((sel) => {
              const target = document.querySelector(sel);
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
            }, step.selector);
            if (!hitInfo.found) throw new Error(`ASSERT_UNOCCLUDED: Could not find element "${step.selector}" in DOM`);
            if (hitInfo.occluded) {
              throw new Error(`Element "${step.selector}" is physically occluded at (${hitInfo.point?.x}, ${hitInfo.point?.y}) by <${hitInfo.hitTag}${hitInfo.hitClass ? ` class="${hitInfo.hitClass}"` : ''}> (z-index: ${hitInfo.hitZIndex})`);
            }
            break;
          }

          case 'ASSERT_NO_CLIPPING': {
            if (step.selector) {
              const timeout = step.timeoutMs || 8000;
              const el = page.locator(step.selector).first();
              await el.waitFor({ state: 'visible', timeout });
              const clipRes = await page.evaluate((sel) => {
                const target = document.querySelector(sel);
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
              }, step.selector);
              if (!clipRes.found) throw new Error(`ASSERT_NO_CLIPPING: Could not find element "${step.selector}"`);
              if (clipRes.clipped) {
                throw new Error(`Element "${step.selector}" has ${clipRes.direction} text clipping/starvation (+${clipRes.diff}px hidden overflow)`);
              }
            } else {
              const clippings = await detectContainerClipping(page, viewport);
              if (clippings.length > 0) {
                throw new Error(`Detected ${clippings.length} starved clipped container(s) on page, including: <${clippings[0].elementA.selector}>`);
              }
            }
            break;
          }

          case 'ASSERT_TOUCH_TARGET': {
            if (!step.selector) throw new Error('ASSERT_TOUCH_TARGET action requires "selector"');
            const timeout = step.timeoutMs || 8000;
            const minPx = step.minPx || 44;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'visible', timeout });
            const box = await el.boundingBox();
            if (!box) throw new Error(`ASSERT_TOUCH_TARGET: Cannot compute bounding box for "${step.selector}"`);
            if (box.width < minPx || box.height < minPx) {
              throw new Error(`Touch target "${step.selector}" is ${Math.round(box.width)}x${Math.round(box.height)}px, failing minimum size requirement of ${minPx}x${minPx}px (WCAG 2.5.5 / Apple HIG)`);
            }
            break;
          }

          case 'ASSERT_CONTRAST': {
            if (!step.selector) throw new Error('ASSERT_CONTRAST action requires "selector"');
            const timeout = step.timeoutMs || 8000;
            const minRatio = step.minRatio || 4.5;
            const el = page.locator(step.selector).first();
            await el.waitFor({ state: 'visible', timeout });
            const contrastRes = await page.evaluate((sel) => {
              const target = document.querySelector(sel);
              if (!target) return { found: false };

              function parseRgb(colorStr: string) {
                const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                if (match) return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
                return [0, 0, 0];
              }

              function getLuminance(r: number, g: number, b: number) {
                const a = [r, g, b].map((v) => {
                  v /= 255;
                  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
                });
                return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
              }

              const style = window.getComputedStyle(target);
              const fg = parseRgb(style.color);
              
              let curr: Element | null = target;
              let bg = [255, 255, 255];
              while (curr) {
                const s = window.getComputedStyle(curr);
                if (s.backgroundColor && s.backgroundColor !== 'transparent' && !s.backgroundColor.includes('rgba(0, 0, 0, 0)')) {
                  bg = parseRgb(s.backgroundColor);
                  break;
                }
                curr = curr.parentElement;
              }

              const l1 = getLuminance(fg[0], fg[1], fg[2]);
              const l2 = getLuminance(bg[0], bg[1], bg[2]);
              const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

              return {
                found: true,
                ratio: Math.round(ratio * 100) / 100,
                fg: style.color,
                bg: `rgb(${bg.join(', ')})`
              };
            }, step.selector);

            if (!contrastRes.found) throw new Error(`ASSERT_CONTRAST: Could not find element "${step.selector}"`);
            if (contrastRes.ratio && contrastRes.ratio < minRatio) {
              throw new Error(`Color contrast for "${step.selector}" is ${contrastRes.ratio}:1 (FG: ${contrastRes.fg}, BG: ${contrastRes.bg}), failing minimum threshold of ${minRatio}:1 (WCAG 1.4.3 AA)`);
            }
            break;
          }

          case 'SCREENSHOT': {
            const safeName = (step.name || `uat-step-${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
            const artifactsDir = path.resolve('./betterfront-artifacts/screenshots');
            if (!fs.existsSync(artifactsDir)) {
              fs.mkdirSync(artifactsDir, { recursive: true });
            }
            screenshotFilePath = path.join(artifactsDir, `${safeName}-${Date.now()}.png`);
            await page.screenshot({ path: screenshotFilePath, fullPage: step.fullPage ?? false });
            console.log(`   📸 Screenshot saved: ${screenshotFilePath}`);
            break;
          }

          case 'EXECUTE_SCRIPT': {
            if (!step.script) throw new Error('EXECUTE_SCRIPT action requires "script"');
            await page.evaluate(step.script);
            break;
          }

          default: {
            throw new Error(`Unknown or unsupported UAT action: "${step.action}". Refer to UAT Action Document for valid actions.`);
          }
        }
      } catch (err) {
        const isOptional = step.optional === true;
        const msg = (err as Error).message;

        if (isOptional) {
          stepPassed = true; // Non-fatal for optional steps
          warningMsg = `Optional step skipped due to non-fatal issue: ${msg}`;
          console.log(`   ⚠️ [Optional Warning]: ${msg}`);
        } else {
          stepPassed = false;
          passed = false;
          errorMsg = msg;
          console.log(`   ❌ Step Failed: ${errorMsg}`);

          // Automatic Failure Capture: capture exact problem screenshot
          const shouldCaptureFailure = scenario.recording?.screenshotOnFailure !== false;
          if (shouldCaptureFailure) {
            try {
              const artifactsDir = path.resolve(scenario.recording?.artifactsDir || './betterfront-artifacts');
              const failuresDir = path.join(artifactsDir, 'failures');
              if (!fs.existsSync(failuresDir)) fs.mkdirSync(failuresDir, { recursive: true });

              const vpSafe = viewport.name.replace(/[^a-zA-Z0-9_-]/g, '_');
              const timestamp = Date.now();
              const failureFilename = `failure_step_${i + 1}_${action.toLowerCase()}_${vpSafe}_${timestamp}.png`;
              const fullFailurePath = path.join(failuresDir, failureFilename);

              // If selector was provided, attempt to inject a prominent red highlight outline around it
              if (step.selector) {
                await page.evaluate((sel) => {
                  try {
                    const el = document.querySelector(sel);
                    if (el) {
                      const prevStyle = el.getAttribute('style') || '';
                      el.setAttribute('style', prevStyle + '; outline: 4px solid #ef4444 !important; outline-offset: 3px !important; box-shadow: 0 0 20px rgba(239, 68, 68, 0.9) !important;');
                    }
                  } catch {}
                }, step.selector).catch(() => {});
              }

              // Capture the failure screenshot
              await page.screenshot({ path: fullFailurePath, fullPage: false }).catch(() => {});
              failureScreenshotPath = fullFailurePath;

              const fileUrl = 'file:///' + fullFailurePath.replace(/\\/g, '/');
              console.log(`   📸 [Failure Captured] Exact error snapshot saved:`);
              console.log(`      ${fileUrl}`);
            } catch (shotErr) {
              console.warn(`   ⚠️ Could not capture failure screenshot: ${(shotErr as Error).message}`);
            }
          }
        }
      }

      stepResults.push({
        stepIndex: i + 1,
        action,
        description: desc,
        passed: stepPassed,
        durationMs: Date.now() - stepStart,
        optional: step.optional,
        warning: warningMsg,
        error: errorMsg,
        anomaliesDetected: anomalies,
        screenshotPath: screenshotFilePath,
        failureScreenshotPath
      });

      if (!stepPassed) {
        break; // Halt scenario on first non-optional failure
      }
    }

    const passedCount = stepResults.filter((s) => s.passed).length;
    const failedCount = stepResults.length - passedCount;

    console.log(`   Result: ${passed ? '✅ PASSED' : '🚨 FAILED'} (${passedCount}/${scenario.steps.length} steps completed)`);

    const firstFailure = stepResults.find((s) => !s.passed && s.failureScreenshotPath);

    return {
      scenarioName: scenario.name,
      viewportName: viewport.name,
      passed,
      totalSteps: scenario.steps.length,
      passedSteps: passedCount,
      failedSteps: failedCount,
      durationMs: Date.now() - startTime,
      steps: stepResults,
      failureScreenshotPath: firstFailure?.failureScreenshotPath
    };
  }
}
