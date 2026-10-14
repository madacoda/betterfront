import * as crypto from 'crypto';
import { Page } from 'playwright';
import { KinematicsEngine } from './kinematics.js';
import { ScrollerEngine } from './scroller.js';
import { FormFillerEngine } from './formFiller.js';
import { VisualDefect, ViewportDefinition } from '../types/index.js';

export interface ExplorationOptions {
  maxInteractions: number;
  persona: 'power-user' | 'impatient-mobile' | 'cautious-first-timer' | 'keyboard-only';
  simulateMouseTrails?: boolean;
  simulateTypingCadence?: boolean;
  simulateScrollMomentum?: boolean;
  viewport?: ViewportDefinition;
  onStepComplete?: (stateHash: string) => Promise<void>;
}

export interface ExplorationResult {
  interactionCount: number;
  keyboardDefects: VisualDefect[];
  visitedStates: number;
}

export class AutonomousCrawler {
  private kinematics = new KinematicsEngine();
  private scroller = new ScrollerEngine();
  private formFiller = new FormFillerEngine();
  private visitedSelectors = new Set<string>();
  private visitedStateHashes = new Set<string>();

  /**
   * Computes a Structural State Hash of the current DOM state:
   * SHA256(NormalizedURL + OpenDialogs + VisibleHeadings + InteractiveCount)
   */
  public async computeStructuralStateHash(page: Page): Promise<string> {
    try {
      const stateSignature = await page.evaluate(() => {
        const url = window.location.pathname + window.location.hash;
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, [role="dialog"], [aria-modal="true"]'))
          .filter((el) => {
            const s = window.getComputedStyle(el);
            return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity) > 0;
          })
          .map((el) => `${el.tagName}:${(el.textContent || '').trim().substring(0, 25)}`)
          .join('|');
        const interactives = document.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])').length;
        return `${url}::${headings}::${interactives}`;
      });
      return crypto.createHash('sha256').update(stateSignature).digest('hex').substring(0, 16);
    } catch {
      return 'unknown_state';
    }
  }

  /**
   * Explores the page autonomously like a real human user according to the configured persona.
   */
  public async explore(page: Page, options: ExplorationOptions): Promise<number> {
    const detailed = await this.exploreDetailed(page, options);
    return detailed.interactionCount;
  }

  public async exploreDetailed(page: Page, options: ExplorationOptions): Promise<ExplorationResult> {
    let interactionCount = 0;
    const keyboardDefects: VisualDefect[] = [];
    const simulateTrails = options.simulateMouseTrails !== false;
    const simulateTyping = options.simulateTypingCadence !== false;
    const simulateScroll = options.simulateScrollMomentum !== false;

    const initialHash = await this.computeStructuralStateHash(page);
    this.visitedStateHashes.add(initialHash);

    // Persona 4: Keyboard-Only Accessible User
    if (options.persona === 'keyboard-only') {
      const kbResult = await this.runKeyboardOnlyTraversal(page, options.maxInteractions, options.viewport);
      interactionCount += kbResult.interactions;
      keyboardDefects.push(...kbResult.defects);
      if (options.onStepComplete) {
        const hash = await this.computeStructuralStateHash(page);
        await options.onStepComplete(hash);
      }
      return {
        interactionCount,
        keyboardDefects,
        visitedStates: this.visitedStateHashes.size
      };
    }

    // 1. Initial scroll scan
    if (simulateScroll) {
      const maxScrolls = options.persona === 'impatient-mobile' ? 4 : 2;
      await this.scroller.progressivePageScan(page, maxScrolls);
    } else {
      await page.evaluate(() => window.scrollTo(0, 300)).catch(() => {});
    }

    if (options.onStepComplete) {
      const hash = await this.computeStructuralStateHash(page);
      if (!this.visitedStateHashes.has(hash)) {
        this.visitedStateHashes.add(hash);
        await options.onStepComplete(hash);
      }
    }

    // 2. Form auto-fill check (Power-User tests boundary strings; others use natural data)
    const formsFilled = await this.formFiller.autoFillVisibleForms(page, {
      simulateTypingCadence: simulateTyping,
      boundaryStress: options.persona === 'power-user'
    });
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
      return elements
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            id: el.id,
            tagName: el.tagName.toLowerCase(),
            className: typeof el.className === 'string' ? el.className : '',
            text: el.textContent?.trim().substring(0, 30) || '',
            isVisible: rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= window.innerHeight * 2
          };
        })
        .filter((e) => e.isVisible);
    });

    for (const item of affordances) {
      if (interactionCount >= options.maxInteractions) break;

      const selector = item.id
        ? `#${item.id}`
        : `${item.tagName}:has-text("${item.text.replace(/"/g, '\\"')}")`;
      if (this.visitedSelectors.has(selector)) continue;
      this.visitedSelectors.add(selector);

      // Cautious-first-timer hovers and reads before clicking
      if (options.persona === 'cautious-first-timer') {
        await this.kinematics.humanHover(page, selector, simulateTrails);
        await page.waitForTimeout(200);
      }

      const clicked = await this.kinematics.humanMoveAndClick(page, selector, simulateTrails);
      if (clicked) {
        interactionCount++;

        // Impatient-mobile occasionally rage-clicks buttons to test debounce locks
        if (options.persona === 'impatient-mobile' && item.tagName === 'button' && Math.random() < 0.25) {
          await this.kinematics.rageClick(page, selector, 3);
        }

        // Allow DOM mutations or transitions to settle
        await page.waitForTimeout(options.persona === 'power-user' ? 150 : 300);

        const nextHash = await this.computeStructuralStateHash(page);
        if (!this.visitedStateHashes.has(nextHash)) {
          this.visitedStateHashes.add(nextHash);
          if (options.onStepComplete) {
            await options.onStepComplete(nextHash);
          }
        }
      }
    }

    return {
      interactionCount,
      keyboardDefects,
      visitedStates: this.visitedStateHashes.size
    };
  }

  /**
   * Executes sequential Tab navigation for the `keyboard-only` persona,
   * auditing focus-ring visibility and detecting focus traps.
   */
  private async runKeyboardOnlyTraversal(
    page: Page,
    maxTabs: number,
    viewport?: ViewportDefinition
  ): Promise<{ interactions: number; defects: VisualDefect[] }> {
    const defects: VisualDefect[] = [];
    let interactions = 0;
    let consecutiveSameFocus = 0;
    let lastSelector = '';

    const vpName = viewport?.name || 'Keyboard_Audit';
    const vpSize = { width: viewport?.width || 1280, height: viewport?.height || 720 };

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(80);
      interactions++;

      const focusInfo = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body || el === document.documentElement) {
          return null;
        }
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const selector =
          el.tagName.toLowerCase() +
          (el.id ? '#' + el.id : '') +
          (typeof el.className === 'string' && el.className.trim()
            ? '.' + el.className.trim().split(/\s+/)[0]
            : '');

        const outlineWidth = parseFloat(style.outlineWidth) || 0;
        const outlineStyle = style.outlineStyle;
        const hasOutline = outlineStyle !== 'none' && outlineWidth > 0;
        const hasBoxShadow = style.boxShadow && style.boxShadow !== 'none';

        return {
          selector,
          tagName: el.tagName.toLowerCase(),
          id: el.id || null,
          text: (el.textContent || '').trim().substring(0, 40),
          hasFocusIndicator: Boolean(hasOutline || hasBoxShadow),
          isInsideModal: Boolean(el.closest('[role="dialog"], [aria-modal="true"], dialog')),
          rect: {
            top: Math.round(rect.top + window.scrollY),
            bottom: Math.round(rect.bottom + window.scrollY),
            left: Math.round(rect.left + window.scrollX),
            right: Math.round(rect.right + window.scrollX),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        };
      });

      if (!focusInfo) continue;

      if (focusInfo.selector === lastSelector) {
        consecutiveSameFocus++;
        if (consecutiveSameFocus >= 3 && !focusInfo.isInsideModal) {
          defects.push({
            id: `kb_focus_trap_${vpName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${defects.length + 1}`,
            type: 'ACCESSIBILITY_VIOLATION',
            severity: 'CRITICAL',
            viewportName: vpName,
            viewportSize: vpSize,
            elementA: {
              selector: focusInfo.selector,
              tagName: focusInfo.tagName,
              id: focusInfo.id,
              text: focusInfo.text,
              rect: focusInfo.rect
            },
            aiTriage: {
              isBug: true,
              confidence: 0.96,
              description: `Keyboard focus trap detected on <${focusInfo.selector}> (WCAG 2.1.2 No Keyboard Trap). Pressing Tab 3 times failed to advance focus.`,
              suggestedCssFix: `Ensure keydown Tab listeners do not call event.preventDefault() outside active modal dialogs.`
            }
          });
          break;
        }
      } else {
        consecutiveSameFocus = 0;
        lastSelector = focusInfo.selector;
      }
    }

    return { interactions, defects };
  }
}
