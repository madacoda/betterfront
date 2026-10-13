import * as fs from 'fs';
import * as path from 'path';
import { AuditRunSummary } from '../types/index.js';

export function generateHtmlReport(summary: AuditRunSummary): string {
  const statusColor = summary.passed ? '#10b981' : '#ef4444';
  const statusBadge = summary.passed ? 'PASSED: PRODUCTION READY' : 'BLOCKED: CRITICAL DEFECTS';

  // Gather video paths
  const videoPaths: string[] = [];
  summary.viewportResults.forEach((vr) => {
    if (vr.artifacts.videoPath && fs.existsSync(vr.artifacts.videoPath)) {
      videoPaths.push(vr.artifacts.videoPath);
    }
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BetterFront Audit Report - ${summary.targetUrl}</title>
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      padding: 32px 24px;
      line-height: 1.5;
    }
    .container { max-width: 1240px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-pass { background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid var(--success); }
    .badge-fail { background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid var(--danger); }
    
    .score-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .score-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .score-val { font-size: 36px; font-weight: 800; margin: 8px 0; }
    .score-lbl { font-size: 13px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }

    .section-title {
      font-size: 20px;
      font-weight: 700;
      margin: 32px 0 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .defect-item {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .defect-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .defect-type { font-weight: 700; font-size: 15px; color: #f87171; }
    .code-block {
      background: #0f172a;
      border: 1px solid #334155;
      padding: 10px 14px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 13px;
      color: #38bdf8;
      overflow-x: auto;
      margin: 8px 0;
    }
    .remediation {
      background: rgba(59, 130, 246, 0.1);
      border-left: 4px solid var(--accent);
      padding: 12px;
      border-radius: 4px;
      margin-top: 10px;
      font-size: 13px;
    }
    .remediation strong { color: #60a5fa; }

    .crop-img {
      max-width: 100%;
      border-radius: 6px;
      border: 1px solid #475569;
      margin-top: 12px;
      background: #fff;
    }

    .video-container {
      margin-top: 16px;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      max-width: 800px;
    }
    video { width: 100%; height: auto; display: block; }

    .tab-content { display: block; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #1f2937; font-size: 13px; }
    th { color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <span style="font-size: 28px;">🛡️</span>
        <div>
          <h1>BetterFront Audit Report</h1>
          <p style="color: var(--text-muted); font-size: 14px;">Audited Target: <a href="${summary.targetUrl}" target="_blank" style="color: var(--accent);">${summary.targetUrl}</a></p>
        </div>
      </div>
      <div>
        <span class="badge ${summary.passed ? 'badge-pass' : 'badge-fail'}">${statusBadge}</span>
      </div>
    </header>

    <!-- Health Scores -->
    <div class="score-grid">
      <div class="score-card">
        <div class="score-lbl">Total Health Score</div>
        <div class="score-val" style="color: ${statusColor};">${summary.score.total}/100</div>
      </div>
      <div class="score-card">
        <div class="score-lbl">Visual Layout</div>
        <div class="score-val">${summary.score.visual}/100</div>
      </div>
      <div class="score-card">
        <div class="score-lbl">Performance & CLS</div>
        <div class="score-val">${summary.score.performance}/100</div>
      </div>
      <div class="score-card">
        <div class="score-lbl">Accessibility</div>
        <div class="score-val">${summary.score.accessibility}/100</div>
      </div>
      <div class="score-card">
        <div class="score-lbl">Functional UAT</div>
        <div class="score-val">${summary.score.uat}/100</div>
      </div>
    </div>

    <!-- Hard Blockers if any -->
    ${summary.blockersTriggered.length > 0 ? `
    <div class="card" style="border-color: var(--danger); background: rgba(239, 68, 68, 0.08);">
      <h3 style="color: var(--danger); margin-bottom: 12px;">🚨 Deployment Blockers Triggered</h3>
      <ul style="padding-left: 20px; font-size: 14px; color: #fca5a5;">
        ${summary.blockersTriggered.map(b => `<li style="margin-bottom: 6px;">${b}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Video Recording Flight Recorder -->
    ${videoPaths.length > 0 ? `
    <div class="card">
      <h3 class="section-title">🎥 Flight Recorder: Full-Motion Interaction Video</h3>
      <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 12px;">Recorded user interaction session across tested viewports:</p>
      <div class="video-container">
        <video controls>
          <source src="${path.relative(path.dirname(summary.outputPaths.htmlReport || '.'), videoPaths[0])}" type="video/webm">
          Your browser does not support HTML5 video.
        </video>
      </div>
    </div>
    ` : ''}

    <!-- Visual Defects & Layout Collisions -->
    <h2 class="section-title">👁️ Visual Defects & Layout Collisions (${summary.totalDefects})</h2>
    ${summary.viewportResults.flatMap(vr => vr.defects).length === 0 ? `
      <div class="card"><p style="color: var(--success); font-weight: 600;">✅ Clean Layout! No text collisions, mobile horizontal bleeds, or clipping detected.</p></div>
    ` : summary.viewportResults.flatMap(vr => vr.defects).map((d, i) => `
      <div class="defect-item">
        <div class="defect-header">
          <span class="defect-type">[#${i + 1}] ${d.type.replace(/_/g, ' ')}</span>
          <span style="font-size: 12px; color: var(--text-muted);">Viewport: ${d.viewportName} (${d.viewportSize.width}x${d.viewportSize.height})</span>
        </div>
        <p style="font-size: 14px; margin-bottom: 8px;"><strong>Element A:</strong> <span class="code-block">${d.elementA.selector}</span></p>
        ${d.elementB ? `<p style="font-size: 14px; margin-bottom: 8px;"><strong>Element B:</strong> <span class="code-block">${d.elementB.selector}</span></p>` : ''}
        ${d.aiTriage ? `
          <div class="remediation">
            <strong>Diagnosis:</strong> ${d.aiTriage.description}<br/>
            <strong>Suggested CSS Fix:</strong> <code>${d.aiTriage.suggestedCssFix}</code>
          </div>
        ` : ''}
        ${d.cropScreenshotBase64 ? `
          <div>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">Forensic Defect Crop:</p>
            <img class="crop-img" src="data:image/png;base64,${d.cropScreenshotBase64}" alt="Defect Crop" />
          </div>
        ` : ''}
      </div>
    `).join('')}

    <!-- Layout Shifts (CLS) -->
    <h2 class="section-title">📉 Cumulative Layout Shifts (CLS)</h2>
    <div class="card">
      ${summary.viewportResults.flatMap(vr => vr.layoutShifts).length === 0 ? `
        <p style="color: var(--success);">✅ Zero unprovoked layout shifts recorded.</p>
      ` : `
        <table>
          <thead>
            <tr>
              <th>Viewport</th>
              <th>Shift Value</th>
              <th>Shifted Element</th>
              <th>Vertical Jump (ΔY)</th>
            </tr>
          </thead>
          <tbody>
            ${summary.viewportResults.flatMap(vr => 
              vr.layoutShifts.flatMap(s => 
                s.sources.map(src => `
                  <tr>
                    <td>${vr.viewport.name}</td>
                    <td>${s.value.toFixed(4)}</td>
                    <td><code>${src.selector}</code></td>
                    <td style="color: #f87171; font-weight: 700;">${src.deltaY > 0 ? '+' : ''}${src.deltaY}px</td>
                  </tr>
                `)
              )
            ).join('')}
          </tbody>
        </table>
      `}
    </div>

    <!-- Console Health -->
    <h2 class="section-title">🖥️ Console Health & Uncaught Exceptions (${summary.totalConsoleErrors})</h2>
    <div class="card">
      ${summary.totalConsoleErrors === 0 ? `
        <p style="color: var(--success);">✅ 0 unhandled console errors or exceptions.</p>
      ` : `
        <table>
          <thead>
            <tr>
              <th>Viewport</th>
              <th>Type</th>
              <th>Error Message</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            ${summary.viewportResults.flatMap(vr => 
              vr.consoleErrors.map(err => `
                <tr>
                  <td>${vr.viewport.name}</td>
                  <td style="color: var(--danger); font-weight: 700;">${err.type}</td>
                  <td>${err.text}</td>
                  <td style="font-family: monospace; font-size: 11px;">${err.location || 'N/A'}</td>
                </tr>
              `)
            ).join('')}
          </tbody>
        </table>
      `}
    </div>

    <!-- Footer -->
    <footer style="margin-top: 48px; text-align: center; color: var(--text-muted); font-size: 13px;">
      Report generated by BetterFront Autonomous Frontend QA Engine • ${new Date(summary.timestamp).toLocaleString()}
    </footer>
  </div>
</body>
</html>`;
}
