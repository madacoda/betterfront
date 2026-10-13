import { Page } from 'playwright';
import {
  UatScenario,
  UatRunResult,
  UatStepResult,
  ViewportDefinition,
  VisualDefect
} from '../types/index.js';
import { KinematicsEngine } from '../agent/kinematics.js';
import { TypistEngine } from '../agent/typist.js';
import { ScrollerEngine } from '../agent/scroller.js';
import { FormFillerEngine } from '../agent/formFiller.js';
import { detectTextCollisions } from '../inspectors/layout/textCollision.js';
import { detectHorizontalBleed } from '../inspectors/layout/horizontalBleed.js';

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
      let anomalies: VisualDefect[] = [];

      const desc = step.description || `${step.action} ${step.selector || step.url || ''}`.trim();
      console.log(`   Step [${i + 1}/${scenario.steps.length}]: ${desc}`);

      try {
        switch (step.action) {
          case 'GOTO':
            if (step.url) {
              await page.goto(step.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
              await page.waitForTimeout(500);
            }
            break;

          case 'CLICK':
            if (step.selector) {
              const el = page.locator(step.selector).first();
              await el.waitFor({ state: 'visible', timeout: 8000 });
              const clicked = await this.kinematics.humanMoveAndClick(page, step.selector);
              if (!clicked) throw new Error(`Could not click element: ${step.selector}`);
            }
            break;

          case 'TYPE':
            if (step.selector && step.text) {
              const el = page.locator(step.selector).first();
              await el.waitFor({ state: 'visible', timeout: 8000 });
              await this.typist.humanType(page, step.selector, step.text);
            }
            break;

          case 'SCROLL':
            await this.scroller.humanScroll(page, step.scrollPx || 500);
            break;

          case 'WAIT':
            await page.waitForTimeout(step.waitMs || 1000);
            break;

          case 'FILL_FORM':
            await this.formFiller.autoFillVisibleForms(page);
            break;

          case 'ASSERT_TEXT':
            if (step.selector && step.text) {
              const el = page.locator(step.selector).first();
              await el.waitFor({ state: 'visible', timeout: 8000 });
              const actual = await el.innerText();
              if (!actual.includes(step.text)) {
                throw new Error(`Expected "${step.text}" in ${step.selector}, but found "${actual}"`);
              }
            }
            break;

          case 'ASSERT_VISIBLE':
            if (step.selector) {
              const el = page.locator(step.selector).first();
              await el.waitFor({ state: 'visible', timeout: 8000 });
            }
            break;

          case 'ASSERT_NO_OVERLAP':
            anomalies = await detectTextCollisions(page, viewport);
            if (anomalies.length > 0) {
              throw new Error(`Text collision detected during UAT step: "${anomalies[0].elementA.text}"`);
            }
            break;

          case 'ASSERT_NO_BLEED':
            if (viewport.isMobile) {
              const bleedRes = await detectHorizontalBleed(page, viewport);
              if (bleedRes.defects.length > 0) {
                throw new Error(`Horizontal mobile bleed detected: <${bleedRes.defects[0].elementA.selector}> (+${bleedRes.defects[0].overflowPx}px)`);
              }
            }
            break;

          case 'ASSERT_NO_CONSOLE_ERRORS':
            if (consoleErrors.length > 0) {
              throw new Error(`Unhandled console errors detected: ${consoleErrors[0].text}`);
            }
            break;
        }
      } catch (err) {
        stepPassed = false;
        passed = false;
        errorMsg = (err as Error).message;
        console.log(`   ❌ Step Failed: ${errorMsg}`);
      }

      stepResults.push({
        stepIndex: i + 1,
        action: step.action,
        description: desc,
        passed: stepPassed,
        durationMs: Date.now() - stepStart,
        error: errorMsg,
        anomaliesDetected: anomalies
      });

      if (!stepPassed) {
        break; // Halt scenario on first failure
      }
    }

    const passedCount = stepResults.filter((s) => s.passed).length;
    const failedCount = stepResults.length - passedCount;

    console.log(`   Result: ${passed ? '✅ PASSED' : '🚨 FAILED'} (${passedCount}/${scenario.steps.length} steps completed)`);

    return {
      scenarioName: scenario.name,
      passed,
      totalSteps: scenario.steps.length,
      passedSteps: passedCount,
      failedSteps: failedCount,
      durationMs: Date.now() - startTime,
      steps: stepResults
    };
  }
}
