import test from 'node:test';
import assert from 'node:assert';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FRONTEND_WEB_CHECKS_CATALOG,
  BrowserPool,
  runUat,
  validateScenario,
  detectTextCollisions,
  auditColorContrast,
  detectBrokenImagesAndSvg,
  auditStickyViewportBudget,
  auditDarkModeParity,
  auditI18nTextExpansion,
  auditFormErgonomics,
  auditDomComplexityBudget,
  auditFrontendHygiene,
  auditReducedMotionCompliance,
  startStudioServer
} from '../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFECTIVE_WEB_CHECKS_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #ffffff; color: #111827; }
    @media (prefers-color-scheme: dark) {
      body { background: #0f172a; }
      .dark-mode-bad-text { color: #1e293b !important; background: #0f172a !important; }
    }
    .sticky-giant-header {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 40vh;
      min-height: 280px;
      background: #1e293b;
      color: #ffffff;
      z-index: 50;
    }
    .content { margin-top: 300px; padding: 16px; }
    .i18n-tight-btn {
      display: inline-block;
      width: 110px;
      height: 28px;
      overflow: hidden;
      white-space: nowrap;
      font-size: 14px;
      border: 1px solid #334155;
    }
    .small-mobile-input {
      font-size: 12px;
      padding: 6px;
    }
    @keyframes spinForever {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .infinite-spinner {
      width: 40px;
      height: 40px;
      background: #ef4444;
      animation: spinForever 1s linear infinite;
    }
    .oklch-low-contrast {
      background: oklch(0.95 0.02 240);
      color: oklch(0.88 0.03 240);
      padding: 8px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <header class="sticky-giant-header">Oversized Sticky Header</header>
  <main class="content">
    <h1 class="dark-mode-bad-text">Dark Mode Unreadable Heading</h1>
    <p class="oklch-low-contrast">OKLCH low contrast text sample</p>
    <img id="broken-img" src="/non-existent-broken-image-404.png" width="120" height="80" alt="Broken asset" />
    <svg id="collapsed-svg" width="0" height="0"></svg>
    <button class="i18n-tight-btn">Checkout Now</button>
    <form>
      <input id="unlabeled-email" type="email" class="small-mobile-input" />
    </form>
    <a href="https://external-site.example.com" target="_blank">Unsafe External Link</a>
    <div class="infinite-spinner">Spin</div>
    <div id="shadow-host"></div>
  </main>
  <script>
    const host = document.getElementById('shadow-host');
    if (host && host.attachShadow) {
      const root = host.attachShadow({ mode: 'open' });
      root.innerHTML = '<div style="position:relative;height:40px;"><span style="position:absolute;top:0;left:0;font-size:18px;">Shadow Alpha</span><span style="position:absolute;top:2px;left:4px;font-size:18px;">Shadow Beta</span></div>';
    }
  </script>
</body>
</html>`;

const CLEAN_WEB_CHECKS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Compliant frontend web check verification page with clean accessibility, dark mode parity, and form ergonomics." />
  <link rel="canonical" href="http://localhost/clean-web-checks" />
  <title>BetterFront Compliant Web Page</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #ffffff; color: #0f172a; }
    @media (prefers-color-scheme: dark) {
      body { background: #0f172a; color: #f8fafc; }
    }
    header {
      position: sticky;
      top: 0;
      height: 48px;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      align-items: center;
      padding: 0 16px;
    }
    main { padding: 24px; max-width: 800px; margin: 0 auto; }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 48px;
      min-height: 48px;
      padding: 12px 24px;
      background: #0f172a;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
    }
    @media (prefers-color-scheme: dark) {
      .btn-primary { background: #38bdf8; color: #0f172a; }
    }
    .field-group { margin: 16px 0; display: flex; flex-direction: column; gap: 6px; }
    .field-input { font-size: 16px; padding: 10px 12px; border: 1px solid #475569; border-radius: 6px; min-height: 44px; }
  </style>
</head>
<body>
  <header>
    <span>BetterFront Verified App</span>
  </header>
  <main>
    <h1 id="main-heading">Compliant Frontend Architecture</h1>
    <p>Every optional and core web invariant passes cleanly on this page.</p>
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#10b981" />
    </svg>
    <form id="clean-form" onsubmit="event.preventDefault(); document.getElementById('status-msg').textContent = 'Saved!';">
      <div class="field-group">
        <label for="clean-email">Work Email</label>
        <input id="clean-email" name="email" type="email" autocomplete="email" class="field-input" value="qa@betterfront.dev" />
      </div>
      <button id="save-btn" type="submit" class="btn-primary">Save Preferences</button>
    </form>
    <p id="status-msg" role="status">Ready</p>
  </main>
</body>
</html>`;

test('BetterFront Optional Web Checks, Core Inspector Upgrades & shadcn/ui Studio Suite', { timeout: 240000 }, async (t) => {
  const rootConfig = path.resolve(__dirname, '..', 'betterfront.config.json');
  if (fs.existsSync(rootConfig)) {
    fs.unlinkSync(rootConfig);
  }

  const fixtureServer = http.createServer((req, res) => {
    const pathname = (req.url || '/').split('?')[0];
    if (pathname === '/defective-web-checks') {
      res.writeHead(200, { 'Content-Type': 'text/html', Connection: 'close' });
      res.end(DEFECTIVE_WEB_CHECKS_HTML);
      return;
    }
    if (pathname === '/clean-web-checks') {
      res.writeHead(200, { 'Content-Type': 'text/html', Connection: 'close' });
      res.end(CLEAN_WEB_CHECKS_HTML);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain', Connection: 'close' });
    res.end('Not found');
  });

  await new Promise((resolve) => fixtureServer.listen(0, () => resolve(true)));
  const address = fixtureServer.address();
  const fixturePort = typeof address === 'object' && address ? address.port : 8966;
  const fixtureBaseUrl = `http://localhost:${fixturePort}`;

  const sharedPool = new BrowserPool({ headless: true, browserEngine: 'chromium' });

  try {
    await t.test('1. Verifies FRONTEND_WEB_CHECKS_CATALOG contains 12 Core Required + 9 Optional Web Checks', () => {
      assert.strictEqual(FRONTEND_WEB_CHECKS_CATALOG.length, 21, 'Should contain 21 total frontend checks');
      const requiredChecks = FRONTEND_WEB_CHECKS_CATALOG.filter((c) => c.tier === 'required-invariant');
      const optionalChecks = FRONTEND_WEB_CHECKS_CATALOG.filter((c) => c.tier === 'optional-web-check');
      assert.strictEqual(requiredChecks.length, 12, 'Should have 12 required core invariants');
      assert.strictEqual(optionalChecks.length, 9, 'Should have 9 optional web checks');

      const expectedOptionalKeys = [
        'brokenImagesAndSvg',
        'stickyViewportBudget',
        'darkModeParity',
        'i18nTextExpansion',
        'formErgonomics',
        'fontLoadingHealth',
        'domComplexityBudget',
        'frontendHygiene',
        'reducedMotionCompliance'
      ];
      for (const key of expectedOptionalKeys) {
        assert.ok(
          optionalChecks.some((c) => c.key === key && c.uatAction),
          `Optional check "${key}" must exist and define a uatAction`
        );
      }
    });

    await t.test('2. Verifies Core Inspector Upgrades (Shadow DOM text collision & CSS Color Level 4 oklch contrast) + All Optional Web Inspectors on Defective Fixture', { timeout: 90000 }, async () => {
      const mobileViewport = {
        name: 'Mobile Standard',
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      };
      const session = await sharedPool.createContextSession(mobileViewport);
      try {
        const { page } = session;
        await page.goto(`${fixtureBaseUrl}/defective-web-checks`, { waitUntil: 'networkidle' });

        // 1) Shadow DOM text collision + Y-axis sweep-and-prune
        const collisions = await detectTextCollisions(page, mobileViewport);
        assert.ok(collisions.length >= 1, 'Should detect text collision inside open Shadow DOM');

        // 2) CSS Color Level 4 (oklch) contrast parsing via canvas fallback
        const contrastResult = await auditColorContrast(page, mobileViewport, 4.5);
        assert.ok(
          contrastResult.defects.some(
            (d) =>
              (d.elementA?.selector || '').includes('oklch-low-contrast') ||
              (d.aiTriage?.description || '').includes('poor contrast')
          ),
          'Should detect low contrast on oklch() styled text'
        );

        // 3) Broken images & collapsed SVGs
        const brokenImgDefects = await detectBrokenImagesAndSvg(page, mobileViewport);
        assert.ok(brokenImgDefects.length >= 2, 'Should detect both broken <img> and 0x0 <svg>');

        // 4) Sticky viewport budget (280px header on 844px mobile screen > 25%)
        const stickyDefects = await auditStickyViewportBudget(page, mobileViewport, 0.25);
        assert.strictEqual(stickyDefects.length, 1, 'Should detect oversized sticky/fixed header exceeding 25% mobile height');

        // 5) Dark mode parity
        const darkDefects = await auditDarkModeParity(page, mobileViewport, 4.5);
        assert.ok(darkDefects.length >= 1, 'Should detect dark mode contrast drop when emulating prefers-color-scheme: dark');

        // 6) i18n +35% text expansion stress test
        const i18nDefects = await auditI18nTextExpansion(page, mobileViewport, 0.35);
        assert.ok(i18nDefects.length >= 1, 'Should detect button overflow under +35% i18n pseudolocalization');

        // 7) Form ergonomics (missing label, missing autocomplete, <16px mobile input font)
        const formDefects = await auditFormErgonomics(page, mobileViewport);
        assert.ok(formDefects.length >= 2, 'Should detect missing input label and <16px mobile font-size');

        // 8) DOM complexity budget (test with low threshold to verify detector)
        const domDefects = await auditDomComplexityBudget(page, mobileViewport, {
          maxTotalNodes: 5,
          maxTreeDepth: 2
        });
        assert.ok(domDefects.length >= 1, 'Should detect DOM node/depth budget exceeded');

        // 9) Frontend hygiene (missing title, meta description, lang, and unsafe target=_blank)
        const hygieneDefects = await auditFrontendHygiene(page, mobileViewport);
        assert.ok(hygieneDefects.length >= 3, 'Should detect missing <title>, missing lang, and target="_blank" without rel="noopener"');

        // 10) Reduced motion compliance (infinite animation persisting under prefers-reduced-motion: reduce)
        const motionDefects = await auditReducedMotionCompliance(page, mobileViewport);
        assert.ok(motionDefects.length >= 1, 'Should detect infinite animation ignoring prefers-reduced-motion: reduce');
      } finally {
        await session.context.close();
      }
    });

    await t.test('3. Verifies all 10 new UAT ASSERT_* actions pass on Clean Compliant Fixture', { timeout: 90000 }, async () => {
      const scenario = {
        name: 'Full Optional Web Checks UAT Verification',
        description: 'Executes all new optional web check UAT assertion actions on a compliant page',
        startUrl: `${fixtureBaseUrl}/clean-web-checks`,
        viewports: ['mobile_standard'],
        anomalyChecks: {
          textOverlap: true,
          horizontalBleed: true,
          brokenImagesAndSvg: true,
          stickyViewportBudget: true,
          darkModeParity: true,
          i18nTextExpansion: true,
          formErgonomics: true,
          fontLoadingHealth: true,
          domComplexityBudget: true,
          frontendHygiene: true,
          reducedMotionCompliance: true
        },
        steps: [
          { action: 'GOTO', url: '/clean-web-checks', description: 'Open compliant web page' },
          { action: 'ASSERT_VISIBLE', selector: '#main-heading', description: 'Verify heading visible' },
          { action: 'ASSERT_NO_BROKEN_IMAGES', description: 'Verify no broken images or 0x0 SVGs' },
          { action: 'ASSERT_STICKY_BUDGET', description: 'Verify sticky header within 25% mobile budget' },
          { action: 'ASSERT_DARK_MODE_PARITY', description: 'Verify dark mode contrast parity' },
          { action: 'ASSERT_I18N_EXPANSION', description: 'Verify +35% i18n text expansion resilience' },
          { action: 'ASSERT_FORM_ERGONOMICS', description: 'Verify form label, autocomplete, and 16px mobile font' },
          { action: 'ASSERT_FONT_HEALTH', description: 'Verify web font loading health' },
          { action: 'ASSERT_DOM_BUDGET', description: 'Verify DOM node & depth complexity budget' },
          { action: 'ASSERT_FRONTEND_HYGIENE', description: 'Verify SEO, security & document hygiene' },
          { action: 'ASSERT_REDUCED_MOTION', description: 'Verify reduced motion compliance' },
          { action: 'ASSERT_A11Y', description: 'Verify zero serious/critical axe-core WCAG violations' }
        ]
      };

      const validation = validateScenario(scenario);
      assert.strictEqual(validation.valid, true, 'Pre-flight validator must accept all new optional web check actions and toggles');

      const tmpScenarioPath = path.join(__dirname, 'tmp-optional-web-checks.uat.json');
      fs.writeFileSync(tmpScenarioPath, JSON.stringify(scenario, null, 2), 'utf8');
      try {
        const result = await runUat(tmpScenarioPath, {
          browserPool: sharedPool,
          headless: true
        });
        const failures = result.steps.filter((s) => s.status === 'FAILED').map((s) => s.error);
        assert.strictEqual(result.passed, true, `Clean web checks UAT scenario should pass 100%. Failures: ${failures.join(', ')}`);
      } finally {
        if (fs.existsSync(tmpScenarioPath)) {
          fs.unlinkSync(tmpScenarioPath);
        }
      }
    });

    await t.test('4. Verifies BetterFront Studio Server API + Live shadcn/ui Studio Web Application via UAT Dogfooding', { timeout: 90000 }, async () => {
      const studioServer = await startStudioServer({
        port: 0,
        host: '127.0.0.1',
        workspaceDir: path.resolve(__dirname, '..'),
        openBrowser: false
      });

      try {
        const studioUrl = studioServer.getUrl();

        // A) Test GET /api/overview
        const overviewRes = await fetch(`${studioUrl}/api/overview`);
        assert.strictEqual(overviewRes.status, 200, 'GET /api/overview should return 200 OK');
        const overview = await overviewRes.json();
        assert.strictEqual(overview.templates.length, 14, 'Studio API should return all 14 industry templates');
        assert.strictEqual(overview.webChecksCatalog.length, 21, 'Studio API should return all 21 web checks (12 core + 9 optional)');

        // B) Test POST /api/validate
        const valRes = await fetch(`${studioUrl}/api/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario: {
              name: 'Studio Validation Check',
              description: 'Validates via REST endpoint',
              startUrl: `${fixtureBaseUrl}/clean-web-checks`,
              steps: [{ action: 'GOTO', url: '/' }, { action: 'ASSERT_FRONTEND_HYGIENE' }]
            }
          })
        });
        const valData = await valRes.json();
        assert.strictEqual(valData.valid, true, 'POST /api/validate should validate scenario cleanly');

        // C) Dogfood BetterFront UAT on the live shadcn/ui Studio Web App itself!
        const studioUatScenario = {
          name: 'BetterFront shadcn/ui Studio Self-Verification UAT',
          description: 'Verifies the shadcn/ui UAT Studio renders cleanly and switches across all 4 management tabs with zero layout or console defects',
          startUrl: studioUrl,
          viewports: ['desktop_fhd'],
          steps: [
            { action: 'GOTO', url: '/', description: 'Open BetterFront Studio UI' },
            { action: 'WAIT_FOR', selector: '[data-testid="tab-builder"]', state: 'visible', description: 'Wait for shadcn/ui navigation tabs' },
            { action: 'ASSERT_TEXT', selector: 'header', text: 'BetterFront Studio', description: 'Verify Studio header title' },
            { action: 'ASSERT_VISIBLE', selector: '[data-testid="tweakcn-theme-switcher"]', description: 'Verify TweakCN theme preset switcher (Neo-Brutalism default) is visible' },
            { action: 'ASSERT_TEXT', selector: 'main', text: 'Instant Website Quality Check', description: 'Verify 1-Click Instant Website Quality Check hero bar' },
            { action: 'ASSERT_TEXT', selector: 'main', text: 'In Plain English:', description: 'Verify plain-English step story preview on Builder tab' },
            { action: 'ASSERT_NO_OVERLAP', description: 'Verify zero text collisions on Workflow Builder tab' },
            { action: 'ASSERT_CONTRAST', selector: 'main', description: 'Verify WCAG AA high-contrast text legibility on Daylight Studio UI' },
            { action: 'CLICK', selector: '[data-testid="tab-templates"]', description: 'Switch to 14 Industry Templates tab' },
            { action: 'WAIT', waitMs: 250, description: 'Allow tab transition' },
            { action: 'ASSERT_NO_OVERLAP', description: 'Verify zero text collisions on Industry Templates tab' },
            { action: 'CLICK', selector: '[data-testid="tab-webchecks"]', description: 'Switch to Frontend Web Checks Matrix tab' },
            { action: 'WAIT', waitMs: 250, description: 'Allow tab transition' },
            { action: 'ASSERT_NO_OVERLAP', description: 'Verify zero text collisions on Frontend Web Checks tab' },
            { action: 'CLICK', selector: '[data-testid="tab-execution"]', description: 'Switch to Live Execution & Forensics tab' },
            { action: 'WAIT', waitMs: 250, description: 'Allow tab transition' },
            { action: 'CLICK', selector: '[data-testid="toggle-theme-btn"]', description: 'Toggle Studio into Dark Mode' },
            { action: 'WAIT', waitMs: 200, description: 'Allow Dark Mode CSS theme transition' },
            { action: 'ASSERT_CONTRAST', selector: 'main', description: 'Verify WCAG AA high-contrast legibility in Dark Mode' },
            { action: 'CLICK', selector: '[data-testid="tab-builder"]', description: 'Switch back to Builder tab in Dark Mode' },
            { action: 'WAIT', waitMs: 200, description: 'Allow tab transition in Dark Mode' },
            { action: 'ASSERT_CONTRAST', selector: 'main', description: 'Verify WCAG AA high-contrast legibility on Builder tab in Dark Mode' },
            { action: 'CLICK', selector: '[data-testid="toggle-theme-btn"]', description: 'Toggle Studio back to Crisp Daylight Mode' },
            { action: 'ASSERT_NO_CONSOLE_ERRORS', description: 'Verify zero console/runtime errors across Studio session' },
            { action: 'ASSERT_NO_BLEED', description: 'Verify zero horizontal bleed across Studio UI' }
          ]
        };

        const tmpStudioScenarioPath = path.join(__dirname, 'tmp-studio-self-test.uat.json');
        fs.writeFileSync(tmpStudioScenarioPath, JSON.stringify(studioUatScenario, null, 2), 'utf8');
        try {
          const studioUatResult = await runUat(tmpStudioScenarioPath, {
            browserPool: sharedPool,
            headless: true
          });
          const failures = studioUatResult.steps.filter((s) => s.status === 'FAILED').map((s) => s.error);
          assert.strictEqual(
            studioUatResult.passed,
            true,
            `shadcn/ui Studio UI UAT should pass with 0 defects. Failures: ${failures.join(', ')}`
          );
        } finally {
          if (fs.existsSync(tmpStudioScenarioPath)) {
            fs.unlinkSync(tmpStudioScenarioPath);
          }
        }
      } finally {
        await studioServer.stop();
      }
    });
  } finally {
    await sharedPool.closeAll();
    fixtureServer.closeAllConnections?.();
    fixtureServer.close();
  }
});
