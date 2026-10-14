/**
 * BetterFront UAT - Navigation, Lifecycle, Viewport, Storage & Diagnostic Action Handlers
 */

import * as fs from 'fs';
import * as path from 'path';
import { UatActionExecutionContext } from './context.js';
import { resolveUrl } from '../interpolation.js';
import { resolveSelector } from '../selectorResolver.js';

export async function handleNavigationAndStateAction(
  action: string,
  ctx: UatActionExecutionContext
): Promise<boolean> {
  const { page, step, stepIndex, scenario, activeViewport, onViewportChanged, onScreenshot } = ctx;

  switch (action) {
    case 'GOTO': {
      const rawUrl = step.url || scenario.startUrl;
      if (!rawUrl) throw new Error('GOTO action requires a "url" or "startUrl"');
      const destUrl = resolveUrl(rawUrl, scenario.baseUrl || scenario.startUrl);
      await page.goto(destUrl, {
        waitUntil: 'domcontentloaded',
        timeout: step.timeoutMs || 30000
      });
      await page.waitForTimeout(350);
      return true;
    }

    case 'RELOAD': {
      await page.reload({
        waitUntil: 'domcontentloaded',
        timeout: step.timeoutMs || 30000
      });
      await page.waitForTimeout(350);
      return true;
    }

    case 'WAIT': {
      await page.waitForTimeout(step.waitMs !== undefined ? step.waitMs : 1000);
      return true;
    }

    case 'WAIT_FOR': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 10000;
      const state = step.state || 'visible';
      const el = page.locator(sel).first();
      await el.waitFor({ state, timeout });
      return true;
    }

    case 'WAIT_FOR_NAV': {
      const timeout = step.timeoutMs || 10000;
      if (step.url) {
        await page.waitForURL(step.url, { timeout });
      } else {
        await page.waitForLoadState('domcontentloaded', { timeout });
      }
      return true;
    }

    case 'SET_VIEWPORT': {
      if (!step.width || !step.height) {
        throw new Error('SET_VIEWPORT action requires numeric "width" and "height"');
      }
      await page.setViewportSize({ width: step.width, height: step.height });
      const isMob = step.isMobile !== undefined ? step.isMobile : step.width <= 768;
      onViewportChanged({
        ...activeViewport,
        name: step.name || `${step.width}x${step.height}`,
        width: step.width,
        height: step.height,
        isMobile: isMob,
        hasTouch: isMob
      });
      await page.waitForTimeout(250);
      return true;
    }

    case 'SET_STORAGE': {
      if (!step.key) throw new Error('SET_STORAGE action requires "key"');
      const val = step.value ?? step.text ?? '';
      const storageKind = step.storageType === 'session' ? 'session' : 'local';
      await page.evaluate(
        ({ k, v, kind }) => {
          const store = kind === 'session' ? window.sessionStorage : window.localStorage;
          store.setItem(k, v);
        },
        { k: step.key, v: val, kind: storageKind }
      );
      return true;
    }

    case 'SCREENSHOT': {
      const safeName = (step.name || `uat-step-${stepIndex + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
      const artifactsDir = path.resolve(scenario.recording?.artifactsDir || './betterfront-artifacts', 'screenshots');
      if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
      }
      const shotPath = path.join(artifactsDir, `${safeName}-${Date.now()}.png`);
      await page.screenshot({ path: shotPath, fullPage: step.fullPage ?? false });
      onScreenshot(shotPath);
      console.log(`   📸 Screenshot saved: ${shotPath}`);
      return true;
    }

    case 'EXECUTE_SCRIPT': {
      if (!step.script) throw new Error('EXECUTE_SCRIPT action requires "script"');
      await page.evaluate(step.script);
      return true;
    }

    default:
      return false;
  }
}
