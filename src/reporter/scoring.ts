import {
  ViewportAuditResult,
  HealthScoreBreakdown,
  BetterFrontConfig,
  UatRunResult,
  AuditRunSummary
} from '../types/index.js';

export interface ScoreEvaluationResult {
  score: HealthScoreBreakdown;
  passed: boolean;
  blockersTriggered: string[];
  warningsTriggered: string[];
}

export class ScoringEngine {
  public evaluate(
    viewportResults: ViewportAuditResult[],
    config: BetterFrontConfig,
    uatResults?: UatRunResult[],
    lighthouseSummary?: AuditRunSummary['lighthouseSummary']
  ): ScoreEvaluationResult {
    let visualScore = 100;
    let perfScore = lighthouseSummary ? lighthouseSummary.performance : 100;
    let a11yScore = 100;
    let uatScore = 100;
    let standardsScore = lighthouseSummary
      ? Math.round((lighthouseSummary.bestPractices + lighthouseSummary.seo) / 2)
      : 100;

    const blockersTriggered: string[] = [];
    const warningsTriggered: string[] = [];

    const addBlocker = (msg: string) => {
      if (!blockersTriggered.includes(msg)) blockersTriggered.push(msg);
    };
    const addWarning = (msg: string) => {
      if (!warningsTriggered.includes(msg)) warningsTriggered.push(msg);
    };

    for (const vr of viewportResults) {
      // 1. Visual, Layout & Standards Defect Penalties
      for (const d of vr.defects) {
        if (d.aiTriage && !d.aiTriage.isBug) continue; // Skip intentional patterns

        if (d.type === 'TEXT_ON_TEXT_COLLISION') {
          visualScore -= 25;
          if (config.qualityGate.blockOnTextCollision) {
            addBlocker(`Text collision on ${vr.viewport.name}: ${d.elementA.selector}`);
          }
        } else if (d.type === 'HORIZONTAL_BLEED') {
          visualScore -= 20;
          if (config.qualityGate.blockOnHorizontalBleed) {
            addBlocker(`Mobile horizontal bleed on ${vr.viewport.name}: ${d.elementA.selector} (+${d.overflowPx}px)`);
          }
        } else if (d.type === 'COMPONENT_OCCLUSION') {
          visualScore -= 25;
          if (config.qualityGate.blockOnComponentOcclusion !== false) {
            addBlocker(`Interactive element occlusion on ${vr.viewport.name}: ${d.elementA.selector} blocked by ${d.elementB?.selector || 'overlay'}`);
          }
        } else if (d.type === 'TEXT_CLIPPING') {
          visualScore -= d.meta?.isPrematureEllipsis ? 20 : 15;
          addWarning(`Text clipping on ${vr.viewport.name}: ${d.elementA.selector}`);
        } else if (d.type === 'UNSIZED_MEDIA') {
          standardsScore -= 8;
          perfScore -= 4;
          if (config.qualityGate.blockOnUnsizedMedia) {
            addBlocker(`Unsized media element on ${vr.viewport.name}: ${d.elementA.selector}`);
          } else {
            addWarning(`Unsized media element on ${vr.viewport.name}: ${d.elementA.selector}`);
          }
        } else if (d.type === 'LOW_COLOR_CONTRAST') {
          a11yScore -= 6;
          addWarning(`Low color contrast on ${vr.viewport.name}: ${d.elementA.selector}`);
        } else if (d.type === 'BROKEN_LINK') {
          standardsScore -= 8;
          if (config.qualityGate.blockOnBrokenLinks) {
            addBlocker(`Broken link on ${vr.viewport.name}: ${d.elementA.selector}`);
          } else {
            addWarning(`Broken link on ${vr.viewport.name}: ${d.elementA.selector}`);
          }
        } else if (d.type === 'ACCESSIBILITY_VIOLATION') {
          a11yScore -= 15;
          addBlocker(`Critical keyboard/a11y trap on ${vr.viewport.name}: ${d.elementA.selector}`);
        }
      }

      // Raw bleeds fallback
      for (const b of vr.bleeds) {
        if (config.qualityGate.blockOnHorizontalBleed) {
          addBlocker(`Horizontal bleed on ${vr.viewport.name}: ${b.selector} (+${b.overflowPx}px)`);
        }
      }

      // 2. Performance, CLS & CWV Penalties
      const totalShiftValue =
        vr.cwvMetrics?.clsWindowed ??
        vr.layoutShifts.reduce((acc, s) => acc + s.value, 0);

      if (totalShiftValue > config.performance.maxAllowedCls) {
        perfScore -= 25;
        if (totalShiftValue > 0.25) {
          addBlocker(`Severe Cumulative Layout Shift (${totalShiftValue.toFixed(3)}) on ${vr.viewport.name}`);
        } else {
          addWarning(`Elevated CLS (${totalShiftValue.toFixed(3)}) on ${vr.viewport.name}`);
        }
      }

      if (vr.cwvMetrics) {
        if (vr.cwvMetrics.lcpMs > config.performance.maxAllowedLcpMs) {
          perfScore -= vr.cwvMetrics.lcpMs > 4000 ? 25 : 12;
          addWarning(`High LCP (${vr.cwvMetrics.lcpMs}ms) on ${vr.viewport.name}`);
        }
        const maxInp = config.performance.maxAllowedInpMs ?? 200;
        if (vr.cwvMetrics.inpMs > maxInp) {
          perfScore -= vr.cwvMetrics.inpMs > 500 ? 20 : 10;
          addWarning(`Slow INP (${vr.cwvMetrics.inpMs}ms) on ${vr.viewport.name}`);
        }
      }

      // 3. Accessibility Penalties
      for (const t of vr.touchTargetDefects) {
        a11yScore -= 4;
        addWarning(`Undersized touch target on ${vr.viewport.name}: ${t.selector} (${t.width}x${t.height}px)`);
      }
      for (const v of vr.axeViolations) {
        a11yScore -= v.impact === 'critical' ? 15 : v.impact === 'serious' ? 8 : 4;
        if (v.impact === 'critical') {
          addBlocker(`Critical WCAG a11y violation (${v.id}) on ${vr.viewport.name}`);
        }
      }

      // 4. Functional UAT, Console & Network Penalties
      for (const err of vr.consoleErrors) {
        uatScore -= 20;
        if (config.qualityGate.blockOnConsoleErrors) {
          addBlocker(`Unhandled console error on ${vr.viewport.name}: ${err.text.substring(0, 80)}`);
        }
      }

      for (const net of vr.networkErrors) {
        uatScore -= 15;
        standardsScore -= 5;
        if (net.status >= 500) {
          addBlocker(`Server Error 5xx on ${net.method} ${net.url}`);
        }
      }
    }

    // 5. Attached Declarative UAT Journey Results
    if (uatResults && uatResults.length > 0) {
      for (const uat of uatResults) {
        if (!uat.passed) {
          uatScore -= 35;
          addBlocker(`Declarative UAT Scenario failed: "${uat.scenarioName}" (${uat.passedSteps}/${uat.totalSteps} steps passed)`);
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
      blockersTriggered,
      warningsTriggered
    };
  }
}
