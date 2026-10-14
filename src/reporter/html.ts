import * as fs from 'fs';
import * as path from 'path';
import { AuditRunSummary, UatRunResult } from '../types/index.js';

export function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateHtmlReport(summary: AuditRunSummary): string {
  const statusColor = summary.passed ? '#10b981' : '#ef4444';
  const statusBadge = summary.passed ? 'PASSED: PRODUCTION READY' : 'BLOCKED: CRITICAL DEFECTS';
  const reportDir = path.dirname(path.resolve(summary.outputPaths.htmlReport || './betterfront-report.html'));

  const videoEntries = summary.viewportResults
    .filter((vr) => vr.artifacts.videoPath && fs.existsSync(vr.artifacts.videoPath))
    .map((vr) => ({
      viewportName: vr.viewport.name,
      relPath: path.relative(reportDir, vr.artifacts.videoPath!).replace(/\\/g, '/')
    }));

  const allDefects = summary.viewportResults.flatMap((vr) => vr.defects);
  const allShifts = summary.viewportResults.flatMap((vr) =>
    vr.layoutShifts.flatMap((s) =>
      s.sources.map((src) => ({
        viewportName: vr.viewport.name,
        value: s.value,
        selector: src.selector,
        deltaY: src.deltaY
      }))
    )
  );
  const allTouchDefects = summary.viewportResults.flatMap((vr) =>
    vr.touchTargetDefects.map((t) => ({ viewportName: vr.viewport.name, ...t }))
  );
  const allAxeViolations = summary.viewportResults.flatMap((vr) =>
    vr.axeViolations.map((a) => ({ viewportName: vr.viewport.name, ...a }))
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BetterFront Audit Report - ${escapeHtml(summary.targetUrl)}</title>
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
    .container { max-width: 1280px; margin: 0 auto; }
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
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
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
    .score-val { font-size: 34px; font-weight: 800; margin: 8px 0; }
    .score-lbl { font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }

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

    .vp-tabs {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .vp-tab-btn {
      background: #1e293b;
      color: var(--text-main);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .vp-tab-btn.active {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
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
    .defect-type.exempt { color: var(--success); }
    .code-block {
      background: #0f172a;
      border: 1px solid #334155;
      padding: 6px 10px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      color: #38bdf8;
      display: inline-block;
      margin: 4px 0;
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

    .video-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .video-container {
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #334155;
    }
    .video-label {
      padding: 8px 12px;
      background: #1e293b;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }
    video { width: 100%; height: auto; display: block; }

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
          <p style="color: var(--text-muted); font-size: 14px;">Audited Target: <a href="${escapeHtml(summary.targetUrl)}" target="_blank" style="color: var(--accent);">${escapeHtml(summary.targetUrl)}</a> • Duration: ${(summary.durationMs / 1000).toFixed(1)}s</p>
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
        <div class="score-lbl">Visual Layout (30%)</div>
        <div class="score-val">${summary.score.visual}/100</div>
      </div>
      <div class="score-card">
        <div class="score-lbl">Perf &amp; CLS (25%)</div>
        <div class="score-val">${summary.score.performance}/100</div>
      </div>
      <div class="score-card">
        <div class="score-lbl">Accessibility (20%)</div>
        <div class="score-val">${summary.score.accessibility}/100</div>
      </div>
      <div class="score-card">
        <div class="score-lbl">Functional UAT (15%)</div>
        <div class="score-val">${summary.score.uat}/100</div>
      </div>
      <div class="score-card">
        <div class="score-lbl">Standards (10%)</div>
        <div class="score-val">${summary.score.standards}/100</div>
      </div>
    </div>

    <!-- Hard Blockers if any -->
    ${summary.blockersTriggered.length > 0 ? `
    <div class="card" style="border-color: var(--danger); background: rgba(239, 68, 68, 0.08);">
      <h3 style="color: var(--danger); margin-bottom: 12px;">🚨 Deployment Blockers Triggered (${summary.blockersTriggered.length})</h3>
      <ul style="padding-left: 20px; font-size: 14px; color: #fca5a5;">
        ${summary.blockersTriggered.map(b => `<li style="margin-bottom: 6px;">${escapeHtml(b)}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Viewport Matrix & Core Web Vitals Overview -->
    <h2 class="section-title">📱 Multi-Viewport Matrix &amp; Core Web Vitals</h2>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Viewport</th>
            <th>Dimensions</th>
            <th>Status</th>
            <th>LCP</th>
            <th>FCP</th>
            <th>INP</th>
            <th>Windowed CLS</th>
            <th>Defects</th>
          </tr>
        </thead>
        <tbody>
          ${summary.viewportResults.map(vr => {
            const cwv = vr.cwvMetrics;
            const clsScore = (cwv?.clsWindowed ?? vr.layoutShifts.reduce((a, s) => a + s.value, 0)).toFixed(4);
            return `
              <tr>
                <td><strong>${escapeHtml(vr.viewport.name)}</strong></td>
                <td><code>${vr.viewport.width}x${vr.viewport.height}</code></td>
                <td style="color: ${vr.passed ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">${vr.passed ? 'PASSED' : 'FAILED'}</td>
                <td>${cwv?.lcpMs ? `${cwv.lcpMs}ms` : 'N/A'}</td>
                <td>${cwv?.fcpMs ? `${cwv.fcpMs}ms` : 'N/A'}</td>
                <td>${cwv?.inpMs ? `${cwv.inpMs}ms` : '0ms'}</td>
                <td>${clsScore}</td>
                <td>${vr.defects.length}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Video Recording Flight Recorder -->
    ${videoEntries.length > 0 ? `
    <div class="card">
      <h3 class="section-title" style="margin-top: 0;">🎥 Flight Recorder: Full-Motion Interaction Videos (${videoEntries.length})</h3>
      <p style="color: var(--text-muted); font-size: 13px;">Recorded user interaction sessions across tested viewports:</p>
      <div class="video-grid">
        ${videoEntries.map(v => `
          <div class="video-container">
            <div class="video-label">${escapeHtml(v.viewportName)}</div>
            <video controls preload="metadata">
              <source src="${escapeHtml(v.relPath)}" type="video/webm">
              Your browser does not support HTML5 video.
            </video>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Visual Defects & Layout Collisions with Viewport Filter Tabs -->
    <h2 class="section-title">👁️ Visual Defects, Occlusions &amp; Layout Anomalies (${allDefects.length})</h2>
    ${summary.viewportResults.length > 1 ? `
      <div class="vp-tabs">
        <button class="vp-tab-btn active" onclick="filterViewport('ALL', this)">All Viewports (${allDefects.length})</button>
        ${summary.viewportResults.map(vr => `
          <button class="vp-tab-btn" onclick="filterViewport('${escapeHtml(vr.viewport.name)}', this)">${escapeHtml(vr.viewport.name)} (${vr.defects.length})</button>
        `).join('')}
      </div>
    ` : ''}

    ${allDefects.length === 0 ? `
      <div class="card"><p style="color: var(--success); font-weight: 600;">✅ Clean Layout! Zero text collisions, mobile horizontal bleeds, occlusions, or clipping detected.</p></div>
    ` : allDefects.map((d, i) => {
      const isExempt = d.aiTriage && !d.aiTriage.isBug;
      return `
      <div class="defect-item" data-viewport="${escapeHtml(d.viewportName)}">
        <div class="defect-header">
          <span class="defect-type ${isExempt ? 'exempt' : ''}">[#${i + 1}] ${escapeHtml(d.type.replace(/_/g, ' '))} ${isExempt ? '(INTENTIONAL DESIGN PATTERN)' : `(${escapeHtml(d.severity)})`}</span>
          <span style="font-size: 12px; color: var(--text-muted);">Viewport: ${escapeHtml(d.viewportName)} (${d.viewportSize.width}x${d.viewportSize.height})</span>
        </div>
        <p style="font-size: 14px; margin-bottom: 6px;"><strong>Element A:</strong> <span class="code-block">${escapeHtml(d.elementA.selector)}</span> ${d.elementA.text ? `<span style="color: var(--text-muted); font-size: 12px;">"${escapeHtml(d.elementA.text)}"</span>` : ''}</p>
        ${d.elementB ? `<p style="font-size: 14px; margin-bottom: 6px;"><strong>Element B:</strong> <span class="code-block">${escapeHtml(d.elementB.selector)}</span> ${d.elementB.text ? `<span style="color: var(--text-muted); font-size: 12px;">"${escapeHtml(d.elementB.text)}"</span>` : ''}</p>` : ''}
        ${d.aiTriage ? `
          <div class="remediation">
            <strong>Diagnosis:</strong> ${escapeHtml(d.aiTriage.description)}<br/>
            <strong>Suggested CSS Fix:</strong> <code>${escapeHtml(d.aiTriage.suggestedCssFix)}</code>
          </div>
        ` : ''}
        ${d.cropScreenshotBase64 ? `
          <div>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">Forensic Defect Crop:</p>
            <img class="crop-img" src="data:image/png;base64,${d.cropScreenshotBase64}" alt="Defect Crop" />
          </div>
        ` : ''}
      </div>
      `;
    }).join('')}

    <!-- Touch Targets & WCAG Accessibility -->
    <h2 class="section-title">♿ Ergonomic Touch Targets &amp; WCAG 2.2 AA Accessibility</h2>
    <div class="card">
      ${allTouchDefects.length === 0 && allAxeViolations.length === 0 ? `
        <p style="color: var(--success);">✅ All interactive controls meet minimum touch target dimensions and WCAG 2.2 AA rules.</p>
      ` : `
        ${allTouchDefects.length > 0 ? `
          <h4 style="margin-bottom: 8px; color: var(--warning);">Undersized Touch Targets (${allTouchDefects.length})</h4>
          <table>
            <thead>
              <tr><th>Viewport</th><th>Selector</th><th>Actual Size</th><th>Required Min</th></tr>
            </thead>
            <tbody>
              ${allTouchDefects.map(t => `
                <tr>
                  <td>${escapeHtml(t.viewportName)}</td>
                  <td><code>${escapeHtml(t.selector)}</code></td>
                  <td style="color: var(--warning); font-weight: 700;">${t.width}x${t.height}px</td>
                  <td>${t.expectedMinPx}x${t.expectedMinPx}px</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
        ${allAxeViolations.length > 0 ? `
          <h4 style="margin: 20px 0 8px; color: var(--danger);">Axe-Core WCAG Violations (${allAxeViolations.length})</h4>
          <table>
            <thead>
              <tr><th>Viewport</th><th>Rule ID</th><th>Impact</th><th>Description</th><th>Nodes</th></tr>
            </thead>
            <tbody>
              ${allAxeViolations.map(v => `
                <tr>
                  <td>${escapeHtml(v.viewportName)}</td>
                  <td><code>${escapeHtml(v.id)}</code></td>
                  <td style="font-weight: 700; color: ${v.impact === 'critical' ? 'var(--danger)' : 'var(--warning)'};">${escapeHtml(v.impact)}</td>
                  <td>${escapeHtml(v.description)}</td>
                  <td>${v.nodesCount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      `}
    </div>

    <!-- Layout Shifts (CLS) -->
    <h2 class="section-title">📉 Cumulative Layout Shifts (CLS)</h2>
    <div class="card">
      ${allShifts.length === 0 ? `
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
            ${allShifts.map(s => `
              <tr>
                <td>${escapeHtml(s.viewportName)}</td>
                <td>${s.value.toFixed(4)}</td>
                <td><code>${escapeHtml(s.selector)}</code></td>
                <td style="color: #f87171; font-weight: 700;">${s.deltaY > 0 ? '+' : ''}${s.deltaY}px</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    <!-- Console Health -->
    <h2 class="section-title">🖥️ Console Health &amp; Uncaught Exceptions (${summary.totalConsoleErrors})</h2>
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
                  <td>${escapeHtml(vr.viewport.name)}</td>
                  <td style="color: var(--danger); font-weight: 700;">${escapeHtml(err.type)}</td>
                  <td>${escapeHtml(err.text)}</td>
                  <td style="font-family: monospace; font-size: 11px;">${escapeHtml(err.location || 'N/A')}</td>
                </tr>
              `)
            ).join('')}
          </tbody>
        </table>
      `}
    </div>

    ${summary.uatResults && summary.uatResults.length > 0 ? `
    <h2 class="section-title">🧪 Attached Declarative UAT Scenarios (${summary.uatResults.length})</h2>
    <div class="card">
      ${summary.uatResults.map(uat => `
        <div style="margin-bottom: 16px;">
          <h4>${escapeHtml(uat.scenarioName)} — <span style="color: ${uat.passed ? 'var(--success)' : 'var(--danger)'};">${uat.passed ? 'PASSED' : 'FAILED'} (${uat.passedSteps}/${uat.totalSteps} steps)</span></h4>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Footer -->
    <footer style="margin-top: 48px; text-align: center; color: var(--text-muted); font-size: 13px;">
      Report generated by BetterFront Autonomous Frontend QA Engine • ${escapeHtml(new Date(summary.timestamp).toLocaleString())}
    </footer>
  </div>

  <script>
    function filterViewport(vpName, btnEl) {
      document.querySelectorAll('.vp-tab-btn').forEach(b => b.classList.remove('active'));
      if (btnEl) btnEl.classList.add('active');
      document.querySelectorAll('.defect-item').forEach(item => {
        const itemVp = item.getAttribute('data-viewport') || '';
        if (vpName === 'ALL' || itemVp.startsWith(vpName)) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>`;
}

export { generateUatHtmlReport } from './uatHtmlReport.js';

