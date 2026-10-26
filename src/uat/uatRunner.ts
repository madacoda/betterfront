/**
 * BetterFront UAT - Scenario Execution Orchestrator
 */

import * as fs from 'fs';
import * as path from 'path';
import { Page } from 'playwright';
import {
  UatScenario,
  UatStep,
  UatRunResult,
  UatStepResult,
  ViewportDefinition,
  VisualDefect,
  UatActionType,
  NetworkAnomalyRecord
} from '../types/index.js';
import { KinematicsEngine } from '../agent/kinematics.js';
import { TypistEngine } from '../agent/typist.js';
import { ScrollerEngine } from '../agent/scroller.js';
import { FormFillerEngine } from '../agent/formFiller.js';
import { detectTextCollisions } from '../inspectors/layout/textCollision.js';
import { detectHorizontalBleed } from '../inspectors/layout/horizontalBleed.js';
import { detectContainerClipping } from '../inspectors/layout/containerClipping.js';
import { detectInteractiveOcclusion } from '../inspectors/layout/interactiveOcclusion.js';
import { detectUnsizedMedia } from '../inspectors/layout/unsizedMedia.js';
import { auditColorContrast } from '../inspectors/a11y/colorContrast.js';
import { auditPageLinks } from '../inspectors/network/linkChecker.js';
import { runOptionalWebChecks } from '../inspectors/web/index.js';
import { interpolateScenario, interpolateString, resolveUrl } from './interpolation.js';
import {
  resolveSelector,
  isStepConditionVisible,
  matchesViewportFilter
} from './selectorResolver.js';
import { dispatchUatStepAction } from './actions/index.js';

export {
  interpolateScenario,
  interpolateString,
  resolveUrl,
  resolveSelector,
  isStepConditionVisible,
  matchesViewportFilter
};

export class UatRunner {
  private kinematics = new KinematicsEngine();
  private typist = new TypistEngine();
  private scroller = new ScrollerEngine();
  private formFiller = new FormFillerEngine();

  public async executeScenario(
    page: Page,
    rawScenario: UatScenario,
    viewport: ViewportDefinition,
    consoleErrors: any[],
    networkErrors: NetworkAnomalyRecord[] = [],
    overrideVariables?: Record<string, string>
  ): Promise<UatRunResult> {
    const scenario = interpolateScenario(rawScenario, overrideVariables);
    const startTime = Date.now();
    const stepResults: UatStepResult[] = [];
    const scenarioAnomalies: VisualDefect[] = [];
    let passed = true;
    let activeViewport: ViewportDefinition = { ...viewport };

    const allSteps: UatStep[] = [
      ...(scenario.beforeSteps || []),
      ...scenario.steps,
      ...(scenario.afterSteps || [])
    ];

    console.log(`\n📋 Running UAT Scenario: "${scenario.name}" on ${activeViewport.name}`);

    // Initial navigation if startUrl is provided and first step is not an explicit GOTO to the same URL
    const firstStep = allSteps[0];
    const firstStepIsGotoStart =
      firstStep &&
      firstStep.action?.toUpperCase() === 'GOTO' &&
      (!firstStep.url || firstStep.url === scenario.startUrl);

    if (scenario.startUrl && !firstStepIsGotoStart) {
      try {
        await page.goto(scenario.startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(400);
      } catch (navErr) {
        console.warn(`   ⚠️ Initial navigation warning: ${(navErr as Error).message}`);
      }
    }

    for (let i = 0; i < allSteps.length; i++) {
      const step = allSteps[i];
      const stepStart = Date.now();
      let stepPassed = true;
      const stepSkipped = false;
      let errorMsg: string | undefined;
      let warningMsg: string | undefined;
      let anomalies: VisualDefect[] = [];
      let screenshotFilePath: string | undefined;
      let failureScreenshotPath: string | undefined;

      const action = (step.action ? step.action.toUpperCase().trim() : '') as UatActionType;
      const desc = step.description || `${action} ${step.selector || step.url || step.key || ''}`.trim();

      // 1. Check viewport filters (onlyOnViewport / skipOnViewport)
      if (
        step.onlyOnViewport &&
        step.onlyOnViewport.length > 0 &&
        !matchesViewportFilter(activeViewport, step.onlyOnViewport)
      ) {
        console.log(
          `   ⏭️  Step [${i + 1}/${allSteps.length}]: ${desc} (Skipped: onlyOnViewport=${step.onlyOnViewport.join(',')})`
        );
        stepResults.push({
          stepIndex: i + 1,
          action,
          description: desc,
          passed: true,
          skipped: true,
          durationMs: Date.now() - stepStart
        });
        continue;
      }

      if (
        step.skipOnViewport &&
        step.skipOnViewport.length > 0 &&
        matchesViewportFilter(activeViewport, step.skipOnViewport)
      ) {
        console.log(
          `   ⏭️  Step [${i + 1}/${allSteps.length}]: ${desc} (Skipped: skipOnViewport=${step.skipOnViewport.join(',')})`
        );
        stepResults.push({
          stepIndex: i + 1,
          action,
          description: desc,
          passed: true,
          skipped: true,
          durationMs: Date.now() - stepStart
        });
        continue;
      }

      // 2. Check conditional ifVisible guard (supports primary selector + fallbackSelectors)
      if (step.ifVisible !== undefined && step.ifVisible !== false) {
        const condCheck = await isStepConditionVisible(page, step);
        if (!condCheck.visible) {
          console.log(
            `   ⏭️  Step [${i + 1}/${allSteps.length}]: ${desc} (Skipped: "${condCheck.checkedLabel}" not currently visible)`
          );
          stepResults.push({
            stepIndex: i + 1,
            action,
            description: desc,
            passed: true,
            skipped: true,
            durationMs: Date.now() - stepStart
          });
          continue;
        }
      }

      console.log(`   Step [${i + 1}/${allSteps.length}]: ${desc}`);

      const maxAttempts = Math.max(1, (step.retries || 0) + 1);
      const retryDelay = step.retryDelayMs || 500;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await dispatchUatStepAction(action, {
            page,
            step,
            stepIndex: i,
            scenario,
            activeViewport,
            consoleErrors,
            networkErrors,
            kinematics: this.kinematics,
            typist: this.typist,
            scroller: this.scroller,
            formFiller: this.formFiller,
            onViewportChanged: (newVp) => {
              activeViewport = newVp;
            },
            onAnomalies: (foundAnomalies) => {
              anomalies = foundAnomalies;
            },
            onScreenshot: (shotPath) => {
              screenshotFilePath = shotPath;
            }
          });
          stepPassed = true;
          errorMsg = undefined;
          break;
        } catch (err) {
          if (attempt < maxAttempts) {
            console.log(`   🔄 Retrying step [${i + 1}] (attempt ${attempt + 1}/${maxAttempts})...`);
            await page.waitForTimeout(retryDelay);
            continue;
          }

          const isOptional = step.optional === true;
          const msg = (err as Error).message;

          if (isOptional) {
            stepPassed = true;
            warningMsg = `Optional step skipped due to non-fatal issue: ${msg}`;
            console.log(`   ⚠️ [Optional Warning]: ${msg}`);
          } else {
            stepPassed = false;
            passed = false;
            errorMsg = msg;
            console.log(`   ❌ Step Failed: ${errorMsg}`);

            failureScreenshotPath = await this.captureForensicFailureSnapshot(
              page,
              step,
              action,
              i,
              scenario,
              activeViewport
            );
          }
        }
      }

      stepResults.push({
        stepIndex: i + 1,
        action,
        description: desc,
        passed: stepPassed,
        skipped: stepSkipped,
        durationMs: Date.now() - stepStart,
        optional: step.optional,
        warning: warningMsg,
        error: errorMsg,
        anomaliesDetected: anomalies,
        screenshotPath: screenshotFilePath,
        failureScreenshotPath
      });

      if (!stepPassed) {
        break;
      }
    }

    // Run scenario-level anomalyChecks concurrently in parallel
    if (scenario.anomalyChecks) {
      const checks = scenario.anomalyChecks;
      try {
        const tasks: Promise<VisualDefect[]>[] = [];
        if (checks.textOverlap) {
          tasks.push(detectTextCollisions(page, activeViewport));
        }
        if (checks.horizontalBleed && activeViewport.isMobile) {
          tasks.push(detectHorizontalBleed(page, activeViewport).then((r) => r.defects));
        }
        if (checks.containerClipping) {
          tasks.push(detectContainerClipping(page, activeViewport));
        }
        if (checks.interactiveOcclusion) {
          tasks.push(detectInteractiveOcclusion(page, activeViewport));
        }
        if (checks.unsizedMedia) {
          tasks.push(detectUnsizedMedia(page, activeViewport).then((r) => r.defects));
        }
        if (checks.lowContrast) {
          tasks.push(auditColorContrast(page, activeViewport).then((r) => r.defects));
        }
        if (checks.brokenLinks) {
          tasks.push(auditPageLinks(page, activeViewport, false).then((r) => r.defects));
        }
        const results = await Promise.all(tasks);
        for (const group of results) {
          scenarioAnomalies.push(...group);
        }

        // Run any enabled optional web-based frontend checks
        const optionalWebDefects = await runOptionalWebChecks(page, activeViewport, checks);
        scenarioAnomalies.push(...optionalWebDefects);
      } catch {
        // Ignore post-scenario inspection issues if page closed
      }
    }

    const passedCount = stepResults.filter((s) => s.passed).length;
    const skippedCount = stepResults.filter((s) => s.skipped).length;
    const failedCount = stepResults.length - passedCount;

    console.log(
      `   Result: ${passed ? '✅ PASSED' : '🚨 FAILED'} (${passedCount}/${allSteps.length} steps completed)`
    );

    const firstFailure = stepResults.find((s) => !s.passed && s.failureScreenshotPath);

    return {
      scenarioName: scenario.name,
      viewportName: viewport.name,
      passed,
      totalSteps: allSteps.length,
      passedSteps: passedCount,
      failedSteps: failedCount,
      skippedSteps: skippedCount,
      durationMs: Date.now() - startTime,
      steps: stepResults,
      anomaliesDetected: scenarioAnomalies,
      failureScreenshotPath: firstFailure?.failureScreenshotPath
    };
  }

  private async captureForensicFailureSnapshot(
    page: Page,
    step: UatStep,
    action: string,
    stepIndex: number,
    scenario: UatScenario,
    activeViewport: ViewportDefinition
  ): Promise<string | undefined> {
    if (scenario.recording?.screenshotOnFailure === false) return undefined;
    try {
      const artifactsDir = path.resolve(scenario.recording?.artifactsDir || './betterfront-artifacts');
      const failuresDir = path.join(artifactsDir, 'failures');
      if (!fs.existsSync(failuresDir)) fs.mkdirSync(failuresDir, { recursive: true });

      const vpSafe = activeViewport.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const failureFilename = `failure_step_${stepIndex + 1}_${action.toLowerCase()}_${vpSafe}_${Date.now()}.png`;
      const fullFailurePath = path.join(failuresDir, failureFilename);

      const highlightSel = step.selector || step.fallbackSelectors?.[0];
      if (highlightSel) {
        await page
          .evaluate((sel) => {
            try {
              const el = document.querySelector(sel);
              if (el) {
                const prevStyle = el.getAttribute('style') || '';
                el.setAttribute(
                  'style',
                  prevStyle +
                    '; outline: 4px solid #ef4444 !important; outline-offset: 3px !important; box-shadow: 0 0 20px rgba(239, 68, 68, 0.9) !important;'
                );
              }
            } catch {}
          }, highlightSel)
          .catch(() => {});
      }

      await page.screenshot({ path: fullFailurePath, fullPage: false }).catch(() => {});
      const fileUrl = 'file:///' + fullFailurePath.replace(/\\/g, '/');
      console.log(`   📸 [Failure Captured] Exact error snapshot saved:`);
      console.log(`      ${fileUrl}`);
      return fullFailurePath;
    } catch (shotErr) {
      console.warn(`   ⚠️ Could not capture failure screenshot: ${(shotErr as Error).message}`);
      return undefined;
    }
  }
}
