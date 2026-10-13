import { Page } from 'playwright';
import { KinematicsEngine } from './kinematics.js';
import { ScrollerEngine } from './scroller.js';
import { FormFillerEngine } from './formFiller.js';

export interface ExplorationOptions {
  maxInteractions: number;
  persona: 'power-user' | 'impatient-mobile' | 'cautious-first-timer' | 'keyboard-only';
  onStepComplete?: () => Promise<void>;
}

export class AutonomousCrawler {
  private kinematics = new KinematicsEngine();
  private scroller = new ScrollerEngine();
  private formFiller = new FormFillerEngine();
  private visitedSelectors = new Set<string>();

  /**
   * Explores the page autonomously like a real human user.
   */
  public async explore(page: Page, options: ExplorationOptions): Promise<number> {
    let interactionCount = 0;

    // 1. Initial scroll scan
    await this.scroller.progressivePageScan(page, 3);
    if (options.onStepComplete) await options.onStepComplete();

    // 2. Form auto-fill check
    const formsFilled = await this.formFiller.autoFillVisibleForms(page);
    interactionCount += formsFilled;

    // 3. Find interactive affordances
    const affordances = await page.evaluate(() => {
      const selectors = [
        'button:not([disabled])',
        'a[href^="#"]',
        'a[role="button"]',
        '[role="tab"]',
        'summary',
        '.accordion-header',
        '.dropdown-toggle'
      ];
      
      const elements = Array.from(document.querySelectorAll(selectors.join(',')));
      return elements.map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          id: el.id,
          tagName: el.tagName.toLowerCase(),
          className: el.className,
          text: el.textContent?.trim().substring(0, 30) || '',
          isVisible: rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= window.innerHeight * 2
        };
      }).filter((e) => e.isVisible);
    });

    for (const item of affordances) {
      if (interactionCount >= options.maxInteractions) break;

      const selector = item.id ? `#${item.id}` : `${item.tagName}:has-text("${item.text.replace(/"/g, '\\"')}")`;
      if (this.visitedSelectors.has(selector)) continue;
      this.visitedSelectors.add(selector);

      // Perform human click
      const clicked = await this.kinematics.humanMoveAndClick(page, selector);
      if (clicked) {
        interactionCount++;

        // If persona is rage-clicker, occasionally stress-test button with rapid clicks
        if (options.persona === 'impatient-mobile' && item.tagName === 'button' && Math.random() < 0.2) {
          await this.kinematics.rageClick(page, selector, 3);
        }

        // Allow DOM mutations or network requests 300ms to settle
        await page.waitForTimeout(300);

        if (options.onStepComplete) {
          await options.onStepComplete();
        }
      }
    }

    return interactionCount;
  }
}
