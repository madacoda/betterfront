import test from 'node:test';
import assert from 'node:assert';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit, defineConfig } from '../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('BetterFront End-to-End Production Verification Suite', { timeout: 180000 }, async (t) => {
  // Remove any root betterfront.config.json left over from CLI tests
  const rootConfig = path.resolve(__dirname, '..', 'betterfront.config.json');
  if (fs.existsSync(rootConfig)) {
    fs.unlinkSync(rootConfig);
  }

  // 1. Create a local HTTP server serving the defect-gallery fixture on ephemeral port
  const fixturePath = path.join(__dirname, 'fixtures', 'defect-gallery.html');
  const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html', Connection: 'close' });
    res.end(fixtureHtml);
  });

  await new Promise((resolve) => server.listen(0, () => resolve(true)));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 8912;
  const testUrl = `http://localhost:${port}`;

  console.log(`[Test Server] Running on ${testUrl}`);

  try {
    await t.test('Executes full audit across mobile and desktop viewports with CWV, SARIF, JUnit & Markdown reports', { timeout: 150000 }, async () => {
      const reportHtmlPath = path.join(__dirname, 'test-report.html');
      const summaryJsonPath = path.join(__dirname, 'test-summary.json');
      const sarifPath = path.join(__dirname, 'test-report.sarif.json');
      const junitPath = path.join(__dirname, 'test-report.junit.xml');
      const markdownPath = path.join(__dirname, 'test-report.md');
      const artifactsDir = path.join(__dirname, 'test-artifacts');

      // Clean up previous test artifacts
      if (fs.existsSync(artifactsDir)) {
        fs.rmSync(artifactsDir, { recursive: true, force: true });
      }

      const customCfg = defineConfig({
        preset: 'production-gate',
        concurrency: 3,
        humanAgent: {
          enabled: true,
          persona: 'impatient-mobile',
          simulateMouseTrails: true,
          simulateTypingCadence: true,
          simulateScrollMomentum: true,
          maxInteractionsPerPage: 5
        },
        recording: {
          recordVideo: true,
          recordTrace: true,
          captureScreenshots: true,
          highlightAnomalies: true,
          artifactsDir
        },
        reporting: {
          outputHtml: reportHtmlPath,
          outputJson: summaryJsonPath,
          outputSarif: sarifPath,
          outputJunit: junitPath,
          outputMarkdown: markdownPath
        }
      });

      const summary = await audit(testUrl, customCfg);

      // Assertions on audit execution
      assert.ok(summary, 'Audit summary should be defined');
      assert.strictEqual(summary.viewportResults.length, 3, 'Should audit all 3 configured viewports');

      // 1. Text Collision Detection Assertion (with computed CSS diagnosis)
      const mobileResult = summary.viewportResults.find((v) => v.viewport.name.includes('Modern Mobile'));
      assert.ok(mobileResult, 'Mobile viewport result should exist');

      const textCollisions = mobileResult.defects.filter((d) => d.type === 'TEXT_ON_TEXT_COLLISION');
      assert.ok(textCollisions.length >= 1, 'Should detect the text-on-text collision anomaly');
      assert.ok(textCollisions[0].elementA.computedStyles, 'Should extract computed CSS styles for colliding element');
      console.log(`[Test] Confirmed text collision detection: ${textCollisions[0].elementA.text}`);

      // 2. Mobile Horizontal Bleed Detection Assertion
      const bleeds = mobileResult.defects.filter((d) => d.type === 'HORIZONTAL_BLEED');
      assert.ok(bleeds.length >= 1, 'Should detect mobile horizontal viewport bleed (+520px container)');
      console.log(`[Test] Confirmed horizontal bleed detection: ${bleeds[0].overflowPx}px overflow`);

      // 3. Container Clipping Detection Assertion
      const clippings = mobileResult.defects.filter((d) => d.type === 'TEXT_CLIPPING');
      assert.ok(clippings.length >= 1, 'Should detect container text starvation / clipping');
      console.log(`[Test] Confirmed container clipping detection: ${clippings[0].elementA.selector}`);

      // 4. Undersized Touch Target Assertion
      assert.ok(mobileResult.touchTargetDefects.length >= 1, 'Should detect touch target smaller than 44px');
      const tinyBtn = mobileResult.touchTargetDefects.find((t) => t.selector.includes('delete-btn') || t.selector.includes('tiny-action-btn'));
      assert.ok(tinyBtn, 'Should flag #delete-btn as undersized touch target');
      console.log(`[Test] Confirmed undersized touch target: ${tinyBtn.width}x${tinyBtn.height}px`);

      // 5. Intentional Pattern Exemption (Avatar Stack)
      const avatarBug = mobileResult.defects.find((d) => d.elementA.selector.includes('avatar') && d.aiTriage?.isBug === true);
      assert.strictEqual(avatarBug, undefined, 'Avatar stack should be recognized as intentional pattern, not flagged as bug');

      // 6. Core Web Vitals (CWV) Telemetry Assertion
      assert.ok(mobileResult.cwvMetrics, 'CWV metrics should be captured on viewport');
      assert.strictEqual(typeof mobileResult.cwvMetrics.clsWindowed, 'number', 'Windowed CLS should be numeric');

      // 7. Video Recording, Reports & CI/CD Exporters Verification
      assert.ok(fs.existsSync(reportHtmlPath), 'Interactive HTML report must be generated');
      assert.ok(fs.existsSync(summaryJsonPath), 'JSON summary must be generated');
      assert.ok(fs.existsSync(sarifPath), 'SARIF 2.1.0 report must be generated');
      assert.ok(fs.existsSync(junitPath), 'JUnit XML report must be generated');
      assert.ok(fs.existsSync(markdownPath), 'GitHub PR Markdown report must be generated');
      assert.ok(fs.existsSync(artifactsDir), 'Artifacts directory must exist');

      const sarifJson = JSON.parse(fs.readFileSync(sarifPath, 'utf8'));
      assert.strictEqual(sarifJson.version, '2.1.0', 'SARIF version must be 2.1.0');
      assert.ok(sarifJson.runs[0].results.length > 0, 'SARIF report should contain defect results');

      const filesInArtifacts = fs.readdirSync(artifactsDir);
      assert.ok(filesInArtifacts.length > 0, 'Artifacts directory must contain recorded sessions');
      console.log(`[Test] Artifacts produced in: ${artifactsDir} (${filesInArtifacts.join(', ')})`);

      // 8. Quality Gate Enforcement
      assert.strictEqual(summary.passed, false, 'Production gate should fail (BLOCKED) due to critical collisions and bleeds');
      assert.ok(summary.blockersTriggered.length > 0, 'Should list blockers');
      console.log(`[Test] Blockers triggered: ${summary.blockersTriggered.join(' | ')}`);
    });
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});
