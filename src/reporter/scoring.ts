import { ViewportAuditResult, HealthScoreBreakdown, BetterFrontConfig } from '../types/index.js';

export interface ScoreEvaluationResult {
  score: HealthScoreBreakdown;
  passed: boolean;
  blockersTriggered: string[];
}

export class ScoringEngine {
  public evaluate(
    viewportResults: ViewportAuditResult[],
    config: BetterFrontConfig
  ): ScoreEvaluationResult {
    let visualScore = 100;
    let perfScore = 100;
    let a11yScore = 100;
    let uatScore = 100;
    let standardsScore = 100;

    const blockersTriggered: string[] = [];

    let totalConfirmedCollisions = 0;
    let totalBleeds = 0;
    let totalConsoleErrors = 0;
    let totalNetworkErrors = 0;

    for (const vr of viewportResults) {
      // 1. Visual Defect Penalties
      for (const d of vr.defects) {
        if (d.aiTriage && !d.aiTriage.isBug) continue; // Skip intentional patterns

        if (d.type === 'TEXT_ON_TEXT_COLLISION') {
          totalConfirmedCollisions++;
          visualScore -= 25;
          if (config.qualityGate.blockOnTextCollision) {
            blockersTriggered.push(`Text collision on ${vr.viewport.name}: ${d.elementA.selector}`);
          }
        } else if (d.type === 'HORIZONTAL_BLEED') {
          totalBleeds++;
          visualScore -= 20;
          if (config.qualityGate.blockOnHorizontalBleed) {
            blockersTriggered.push(`Mobile horizontal bleed on ${vr.viewport.name}: ${d.elementA.selector} (+${d.overflowPx}px)`);
          }
        } else if (d.type === 'TEXT_CLIPPING') {
          visualScore -= 15;
        }
      }

      // Bleeds directly
      for (const b of vr.bleeds) {
        if (config.qualityGate.blockOnHorizontalBleed) {
          const msg = `Horizontal bleed on ${vr.viewport.name}: ${b.selector} (+${b.overflowPx}px)`;
          if (!blockersTriggered.includes(msg)) blockersTriggered.push(msg);
        }
      }

      // 2. Performance & CLS Penalties
      const totalShiftValue = vr.layoutShifts.reduce((acc, s) => acc + s.value, 0);
      if (totalShiftValue > config.performance.maxAllowedCls) {
        perfScore -= 25;
        if (totalShiftValue > 0.25) {
          blockersTriggered.push(`Severe Cumulative Layout Shift (${totalShiftValue.toFixed(3)}) on ${vr.viewport.name}`);
        }
      }

      // 3. Accessibility Penalties
      for (const t of vr.touchTargetDefects) {
        a11yScore -= 4;
      }
      for (const v of vr.axeViolations) {
        a11yScore -= (v.impact === 'critical' ? 15 : 5);
        if (v.impact === 'critical') {
          blockersTriggered.push(`Critical WCAG a11y violation (${v.id}) on ${vr.viewport.name}`);
        }
      }

      // 4. Functional UAT & Console Penalties
      for (const err of vr.consoleErrors) {
        totalConsoleErrors++;
        uatScore -= 20;
        if (config.qualityGate.blockOnConsoleErrors) {
          blockersTriggered.push(`Unhandled console error on ${vr.viewport.name}: ${err.text.substring(0, 80)}`);
        }
      }

      for (const net of vr.networkErrors) {
        totalNetworkErrors++;
        uatScore -= 15;
        if (net.status >= 500) {
          blockersTriggered.push(`Server Error 5xx on ${net.method} ${net.url}`);
        }
      }
    }

    // Clamp sub-scores between 0 and 100
    visualScore = Math.max(0, Math.min(100, visualScore));
    perfScore = Math.max(0, Math.min(100, perfScore));
    a11yScore = Math.max(0, Math.min(100, a11yScore));
    uatScore = Math.max(0, Math.min(100, uatScore));
    standardsScore = Math.max(0, Math.min(100, standardsScore));

    // Weighted composite equation
    const totalScore = Math.round(
      0.30 * visualScore +
      0.25 * perfScore +
      0.20 * a11yScore +
      0.15 * uatScore +
      0.10 * standardsScore
    );

    const hasBlockers = blockersTriggered.length > 0;
    const meetsScoreThreshold = totalScore >= config.qualityGate.minOverallScore;
    const passed = !hasBlockers && meetsScoreThreshold;

    return {
      score: {
        total: totalScore,
        visual: visualScore,
        performance: perfScore,
        accessibility: a11yScore,
        uat: uatScore,
        standards: standardsScore
      },
      passed,
      blockersTriggered
    };
  }
}
