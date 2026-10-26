/**
 * BetterFront Reporter - Standalone UAT Scenario HTML Report Generator
 */

import * as fs from 'fs';
import { UatRunResult } from '../types/index.js';

function escapeHtml(raw: unknown): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tryImageToDataUri(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  try {
    if (fs.existsSync(filePath)) {
      const b64 = fs.readFileSync(filePath).toString('base64');
      return `data:image/png;base64,${b64}`;
    }
  } catch {
    // Ignore file read errors
  }
  return undefined;
}

/**
 * Generates a standalone interactive HTML report for Declarative UAT Scenario runs,
 * including multi-viewport breakdown, embedded forensic failure snapshots, step screenshots,
 * video/trace links, and detected visual/web anomalies.
 */
export function generateUatHtmlReport(result: UatRunResult): string {
  const statusColor = result.passed ? '#10b981' : '#ef4444';
  const statusBadge = result.passed ? 'UAT PASSED' : 'UAT FAILED';
  const anomalies = result.anomaliesDetected || [];
  const failureDataUri = tryImageToDataUri(result.failureScreenshotPath);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BetterFront UAT Report - ${escapeHtml(result.scenarioName)}</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f2937;
      --text-main: #f9fafb;
      --text-muted: #9ca3af;
      --accent: #3b82f6;
      --danger: #ef4444;
      --warning: #f59e0b;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      padding: 32px 24px;
      line-height: 1.5;
    }
    .container { max-width: 1180px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .badge {
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      background: ${result.passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'};
      color: ${statusColor};
      border: 1px solid ${statusColor};
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .kpi-val { font-size: 28px; font-weight: 800; margin-top: 4px; }
    .kpi-lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #1f2937; font-size: 13px; }
    th { color: var(--text-muted); text-transform: uppercase; font-size: 12px; }
    code {
      background: #0f172a;
      border: 1px solid #334155;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      color: #38bdf8;
    }
    .shot-preview {
      max-width: 100%;
      max-height: 420px;
      border-radius: 8px;
      border: 1px solid #334155;
      margin-top: 12px;
    }
    .defect-box {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>🧪 ${escapeHtml(result.scenarioName)}</h1>
        <p style="color: var(--text-muted); font-size: 14px;">Viewport(s): ${escapeHtml(result.viewportName || 'Default')} • Steps: ${result.passedSteps}/${result.totalSteps} passed • Duration: ${(result.durationMs / 1000).toFixed(1)}s</p>
      </div>
      <span class="badge">${statusBadge}</span>
    </header>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-lbl">Execution Status</div>
        <div class="kpi-val" style="color: ${statusColor};">${result.passed ? 'PASSED' : 'FAILED'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Steps Passed</div>
        <div class="kpi-val">${result.passedSteps}/${result.totalSteps}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Visual/Web Anomalies</div>
        <div class="kpi-val" style="color: ${anomalies.length > 0 ? 'var(--warning)' : 'var(--success)'};">${anomalies.length}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Total Duration</div>
        <div class="kpi-val">${(result.durationMs / 1000).toFixed(2)}s</div>
      </div>
    </div>

    ${failureDataUri ? `
    <div class="card" style="border-color: var(--danger);">
      <h3 style="color: var(--danger); margin-bottom: 8px;">📸 Forensic Failure Snapshot</h3>
      <p style="color: var(--text-muted); font-size: 13px;">Captured at the exact moment of step failure with red element boundary highlight:</p>
      <img class="shot-preview" src="${failureDataUri}" alt="Failure Snapshot" />
    </div>
    ` : ''}

    ${result.videoPath || result.tracePath ? `
    <div class="card">
      <h3 style="margin-bottom: 10px;">🎬 Recorded Forensic Artifacts</h3>
      ${result.videoPath ? `<p style="font-size: 13px; margin-bottom: 6px;">🎥 <strong>Video Recording:</strong> <code>${escapeHtml(result.videoPath)}</code></p>` : ''}
      ${result.tracePath ? `<p style="font-size: 13px;">🔍 <strong>Playwright Trace:</strong> <code>npx playwright show-trace "${escapeHtml(result.tracePath)}"</code></p>` : ''}
    </div>
    ` : ''}

    <div class="card">
      <h3 style="margin-bottom: 12px;">Step-by-Step Execution Timeline</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Action</th>
            <th>Description</th>
            <th>Status</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${result.steps
            .map(
              (s) => `
            <tr>
              <td>${s.stepIndex}</td>
              <td><code>${escapeHtml(s.action)}</code></td>
              <td>
                ${escapeHtml(s.description)}
                ${s.error ? `<div style="color: var(--danger); font-size: 12px; margin-top: 4px;">❌ ${escapeHtml(s.error)}</div>` : ''}
                ${s.warning ? `<div style="color: var(--warning); font-size: 12px; margin-top: 4px;">⚠️ ${escapeHtml(s.warning)}</div>` : ''}
              </td>
              <td style="font-weight: 700; color: ${s.skipped ? 'var(--text-muted)' : s.passed ? 'var(--success)' : 'var(--danger)'};">${s.skipped ? 'SKIP' : s.passed ? 'PASS' : 'FAIL'}</td>
              <td>${s.durationMs}ms</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>

    ${anomalies.length > 0 ? `
    <div class="card">
      <h3 style="margin-bottom: 12px;">👁️ Detected Visual &amp; Frontend Web Anomalies (${anomalies.length})</h3>
      ${anomalies.map((d, i) => `
        <div class="defect-box">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <strong style="color: var(--warning);">[#${i + 1}] ${escapeHtml(d.type.replace(/_/g, ' '))} (${escapeHtml(d.severity)})</strong>
            <span style="font-size: 12px; color: var(--text-muted);">${escapeHtml(d.viewportName)}</span>
          </div>
          <p style="font-size: 13px;"><strong>Element:</strong> <code>${escapeHtml(d.elementA.selector)}</code> ${d.elementA.text ? `<span style="color: var(--text-muted);">"${escapeHtml(d.elementA.text)}"</span>` : ''}</p>
          ${d.aiTriage ? `
            <p style="font-size: 13px; margin-top: 6px; color: #cbd5e1;">${escapeHtml(d.aiTriage.description)}</p>
            <p style="font-size: 12px; margin-top: 4px; color: #60a5fa;"><strong>Suggested Fix:</strong> <code>${escapeHtml(d.aiTriage.suggestedCssFix)}</code></p>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}
  </div>
</body>
</html>`;
}
