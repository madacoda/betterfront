/**
 * BetterFront UAT - Human Kinematics, Mouse, Keyboard, Scroll & Form Interaction Action Handlers
 */

import { UatActionExecutionContext } from './context.js';
import { resolveSelector } from '../selectorResolver.js';

export async function handleInteractionAction(
  action: string,
  ctx: UatActionExecutionContext
): Promise<boolean> {
  const { page, step, kinematics, typist, scroller, formFiller } = ctx;

  switch (action) {
    case 'CLICK': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
      const clicked = await kinematics.humanMoveAndClick(page, sel);
      if (!clicked) {
        await el.click({ timeout }).catch(async () => {
          await el.click({ timeout, force: true });
        });
      }
      return true;
    }

    case 'DOUBLE_CLICK': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
      await el.dblclick({ timeout });
      return true;
    }

    case 'HOVER': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
      const hovered = await kinematics.humanHover(page, sel);
      if (!hovered) {
        await el.hover({ timeout });
      }
      await page.waitForTimeout(120);
      return true;
    }

    case 'TYPE': {
      const sel = await resolveSelector(page, step);
      if (step.text === undefined) throw new Error('TYPE action requires "text"');
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
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
        await typist.humanType(page, sel, step.text, 0, shouldClear, Boolean(step.pressEnter));
      }
      return true;
    }

    case 'CLEAR': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
      await el.fill('');
      return true;
    }

    case 'PRESS_KEY': {
      if (!step.key) throw new Error('PRESS_KEY action requires "key"');
      if (step.selector || step.fallbackSelectors) {
        const sel = await resolveSelector(page, step);
        const el = page.locator(sel).first();
        await el.focus();
      }
      await page.keyboard.press(step.key);
      await page.waitForTimeout(100);
      return true;
    }

    case 'SELECT': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      if (step.value !== undefined) {
        await el.selectOption({ value: step.value });
      } else if (step.text !== undefined) {
        await el.selectOption({ label: step.text });
      } else {
        throw new Error('SELECT action requires either "value" or "text"');
      }
      return true;
    }

    case 'CHECK': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      await el.check({ timeout });
      return true;
    }

    case 'UNCHECK': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      await el.uncheck({ timeout });
      return true;
    }

    case 'SCROLL': {
      const px = step.scrollPx !== undefined ? step.scrollPx : 500;
      const finalPx = step.direction === 'up' ? -Math.abs(px) : px;
      await scroller.humanScroll(page, finalPx);
      return true;
    }

    case 'SCROLL_TO': {
      const sel = await resolveSelector(page, step);
      const timeout = step.timeoutMs || 8000;
      const el = page.locator(sel).first();
      await el.scrollIntoViewIfNeeded({ timeout });
      await page.waitForTimeout(200);
      return true;
    }

    case 'FILL_FORM': {
      await formFiller.autoFillVisibleForms(page, step.profile);
      return true;
    }

    default:
      return false;
  }
}
