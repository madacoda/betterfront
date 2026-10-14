import * as fs from 'fs';
import * as path from 'path';
import { AuditRunSummary } from '../types/index.js';

function ensureParentDir(filePath: string): void {
  const dir = path.dirname(path.resolve(filePath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generates a Markdown summary formatted for GitHub Pull Request comments and GitHub Actions Step Summaries.
 */
export function generatePrMarkdownSummary(summary: AuditRunSummary): string {
  const statusEmoji = summary.passed ? '✅ PASSED' : '🚨 BLOCKED';
  const lines: string[] = [];

  lines.push(`## 🛡️ BetterFront Production Readiness Gate: **${statusEmoji}**`);
  lines.push(`**Target:** \`${summary.targetUrl}\` • **Duration:** \`${(summary.durationMs / 1000).toFixed(1)}s\`\n`);

  lines.push(`### 📊 Health Score Index: **${summary.score.total}/100**`);
  lines.push(`| Dimension | Weight | Score |`);
  lines.push(`| :--- | :---: | :---: |`);
  lines.push(`| **Visual & Layout Integrity** | 30% | **${summary.score.visual}/100** |`);
  lines.push(`| **Performance & Core Web Vitals** | 25% | **${summary.score.performance}/100** |`);
  lines.push(`| **Accessibility & Ergonomics** | 20% | **${summary.score.accessibility}/100** |`);
  lines.push(`| **Functional UAT & Console** | 15% | **${summary.score.uat}/100** |`);
  lines.push(`| **Best Practices & Standards** | 10% | **${summary.score.standards}/100** |\n`);

  if (summary.blockersTriggered.length > 0) {
    lines.push(`### 🚨 Deployment Blockers Triggered (${summary.blockersTriggered.length})`);
    for (const b of summary.blockersTriggered) {
      lines.push(`- ❌ ${b}`);
    }
    lines.push('');
  }

  lines.push(`### 📱 Viewport Matrix Summary`);
  lines.push(`| Viewport | Size | Status | Visual Defects | Bleeds | CLS | Console Errors |`);
  lines.push(`| :--- | :---: | :---: | :---: | :---: | :---: | :---: |`);
  for (const vr of summary.viewportResults) {
    const confirmed = vr.defects.filter((d) => !d.aiTriage || d.aiTriage.isBug).length;
    const clsVal = (vr.cwvMetrics?.clsWindowed ?? vr.layoutShifts.reduce((a, s) => a + s.value, 0)).toFixed(3);
    lines.push(
      `| **${vr.viewport.name}** | \`${vr.viewport.width}x${vr.viewport.height}\` | ${vr.passed ? '✅ Pass' : '🚨 Fail'} | ${confirmed} | ${vr.bleeds.length} | ${clsVal} | ${vr.consoleErrors.length} |`
    );
  }
  lines.push('');

  return lines.join('\n');
}

export function saveMarkdownReport(summary: AuditRunSummary, outputPath: string): void {
  ensureParentDir(outputPath);
  fs.writeFileSync(outputPath, generatePrMarkdownSummary(summary), 'utf8');
}
