import * as fs from 'fs';
import * as path from 'path';
import { AuditRunSummary, UatRunResult } from '../types/index.js';

function ensureParentDir(filePath: string): void {
  const dir = path.dirname(path.resolve(filePath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function escapeXml(unsafe: string): string {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates JUnit XML test suite output for CI/CD systems (GitHub Actions, GitLab CI, Jenkins, CircleCI).
 */
export function generateJunitXml(summary: AuditRunSummary): string {
  const suites: string[] = [];
  const totalTimeSec = (summary.durationMs / 1000).toFixed(2);

  for (const vr of summary.viewportResults) {
    const confirmedDefects = vr.defects.filter((d) => !d.aiTriage || d.aiTriage.isBug);
    const failuresCount = confirmedDefects.length + vr.consoleErrors.length;
    const testsCount = Math.max(1, failuresCount + 1);

    const testCases: string[] = [];

    if (failuresCount === 0) {
      testCases.push(
        `    <testcase name="${escapeXml(vr.viewport.name)} - Layout &amp; Runtime Invariants" classname="BetterFront.Audit"/>`
      );
    } else {
      for (const d of confirmedDefects) {
        testCases.push(
          `    <testcase name="${escapeXml(`[${vr.viewport.name}] ${d.type}: ${d.elementA.selector}`)}" classname="BetterFront.VisualDefect">\n` +
            `      <failure message="${escapeXml(d.aiTriage?.description || d.type)}" type="${escapeXml(d.type)}">${escapeXml(
              `Element A: ${d.elementA.selector}\nElement B: ${d.elementB?.selector || 'N/A'}\nSuggested Fix: ${d.aiTriage?.suggestedCssFix || ''}`
            )}</failure>\n` +
            `    </testcase>`
        );
      }
      for (const err of vr.consoleErrors) {
        testCases.push(
          `    <testcase name="${escapeXml(`[${vr.viewport.name}] Console Exception`)}" classname="BetterFront.ConsoleHealth">\n` +
            `      <failure message="${escapeXml(err.text)}" type="${escapeXml(err.type)}">${escapeXml(err.location || '')}</failure>\n` +
            `    </testcase>`
        );
      }
    }

    suites.push(
      `  <testsuite name="${escapeXml(vr.viewport.name)}" tests="${testsCount}" failures="${failuresCount}">\n${testCases.join('\n')}\n  </testsuite>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="BetterFront Production Audit" time="${totalTimeSec}">\n${suites.join('\n')}\n</testsuites>\n`;
}

export function saveJunitReport(summary: AuditRunSummary, outputPath: string): void {
  ensureParentDir(outputPath);
  fs.writeFileSync(outputPath, generateJunitXml(summary), 'utf8');
}

export function generateUatJunitXml(result: UatRunResult): string {
  const timeSec = (result.durationMs / 1000).toFixed(2);
  const cases = result.steps.map((s) => {
    const stepTime = (s.durationMs / 1000).toFixed(2);
    if (s.passed) {
      return `    <testcase name="${escapeXml(`Step ${s.stepIndex}: ${s.description}`)}" classname="${escapeXml(result.scenarioName)}" time="${stepTime}"/>`;
    }
    return (
      `    <testcase name="${escapeXml(`Step ${s.stepIndex}: ${s.description}`)}" classname="${escapeXml(result.scenarioName)}" time="${stepTime}">\n` +
      `      <failure message="${escapeXml(s.error || 'Step failed')}" type="${escapeXml(s.action)}"/>\n` +
      `    </testcase>`
    );
  });

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<testsuites name="${escapeXml(result.scenarioName)}" time="${timeSec}">\n` +
    `  <testsuite name="${escapeXml(result.scenarioName)}" tests="${result.totalSteps}" failures="${result.failedSteps}" time="${timeSec}">\n` +
    `${cases.join('\n')}\n` +
    `  </testsuite>\n` +
    `</testsuites>\n`
  );
}

export function saveUatJunitReport(result: UatRunResult, outputPath: string): void {
  ensureParentDir(outputPath);
  fs.writeFileSync(outputPath, generateUatJunitXml(result), 'utf8');
}
