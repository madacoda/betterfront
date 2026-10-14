/**
 * BetterFront Reporter - Standalone UAT Scenario HTML Report Generator
 */

import { UatRunResult } from '../types/index.js';

function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generates a standalone interactive HTML report for Declarative UAT Scenario runs.
 */
export function generateUatHtmlReport(result: UatRunResult): string {
  const statusColor = result.passed ? '#10b981' : '#ef4444';
  const statusBadge = result.passed ? 'UAT PASSED' : 'UAT FAILED';

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
    .container { max-width: 1100px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 24px;
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
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>🧪 ${escapeHtml(result.scenarioName)}</h1>
        <p style="color: var(--text-muted); font-size: 14px;">Viewport: ${escapeHtml(result.viewportName || 'Default')} • Steps: ${result.passedSteps}/${result.totalSteps} passed • Duration: ${(result.durationMs / 1000).toFixed(1)}s</p>
      </div>
      <span class="badge">${statusBadge}</span>
    </header>

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
                ${s.warning ? `<div style="color: #f59e0b; font-size: 12px; margin-top: 4px;">⚠️ ${escapeHtml(s.warning)}</div>` : ''}
              </td>
              <td style="font-weight: 700; color: ${s.passed ? 'var(--success)' : 'var(--danger)'};">${s.passed ? 'PASS' : 'FAIL'}</td>
              <td>${s.durationMs}ms</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}
