import test from 'node:test';
import assert from 'node:assert';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runUat,
  runAutoUat,
  listUatTemplates,
  BrowserPool
} from '../dist/index.js';
import { VARIANT_HTML_PAGES } from './fixtures/multi-variant-apps.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('BetterFront Multi-Variant & Example Project Customizable Workflow Verification Suite', { timeout: 240000 }, async (t) => {
  // Remove any root betterfront.config.json left over from CLI runs
  const rootConfig = path.resolve(__dirname, '..', 'betterfront.config.json');
  if (fs.existsSync(rootConfig)) {
    fs.unlinkSync(rootConfig);
  }

  // Load the example project (defect-gallery.html)
  const defectGalleryPath = path.join(__dirname, 'fixtures', 'defect-gallery.html');
  const defectGalleryHtml = fs.readFileSync(defectGalleryPath, 'utf8');

  // Create unified HTTP server serving:
  // - /example (the example project defect-gallery.html)
  // - /dreamblu
  // - /shopee
  // - /tokopedia
  // - /youtube
  // - /google
  const server = http.createServer((req, res) => {
    const pathname = (req.url || '/').split('?')[0];
    const html = VARIANT_HTML_PAGES[pathname] || defectGalleryHtml;
    res.writeHead(200, { 'Content-Type': 'text/html', Connection: 'close' });
    res.end(html);
  });

  await new Promise((resolve) => server.listen(0, () => resolve(true)));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 8955;
  const baseUrl = `http://localhost:${port}`;
  console.log(`[Multi-Variant Server] Running on ${baseUrl}`);

  const sharedPool = new BrowserPool({ headless: true, browserEngine: 'chromium' });

  try {
    await t.test('1. Verifies all 14 customizable workflow templates are registered in the catalog', () => {
      const templates = listUatTemplates();
      assert.strictEqual(templates.length, 14, 'Should expose all 14 built-in customizable UAT workflow templates');
      const ids = templates.map((tpl) => tpl.id);
      for (const expectedId of [
        'universal-smoke',
        'rpg-game-hud',
        'shopee-marketplace',
        'tokopedia-commerce',
        'youtube-media-streaming',
        'google-search-portal',
        'form-validation-chaos',
        'auth-login-session',
        'ecommerce-checkout',
        'navigation-modals-drawers',
        'responsive-breakpoint-matrix',
        'accessibility-keyboard-ergonomics',
        'crud-dashboard-workflow',
        'visual-regression-invariants'
      ]) {
        assert.ok(ids.includes(expectedId), `Catalog must include template "${expectedId}"`);
      }
    });

    await t.test('2. Retests Example Project (defect-gallery.html) using customizable workflows (universal-smoke & form-validation-chaos) + runAutoUat', { timeout: 90000 }, async () => {
      const exampleUrl = `${baseUrl}/example`;

      // A) Retest Example Project with customized 'universal-smoke' workflow
      const smokeResult = await runUat('universal-smoke', {
        baseUrl: exampleUrl,
        browserPool: sharedPool,
        headless: true,
        variables: {
          PRIMARY_HEADING_SELECTOR: '#hero-title',
          CTA_BUTTON_SELECTOR: '#submit-btn'
        }
      });
      assert.strictEqual(smokeResult.passed, true, 'Universal smoke workflow with custom variables should pass on example project');

      // B) Retest Example Project with customized 'form-validation-chaos' workflow
      const formResult = await runUat('form-validation-chaos', {
        targetUrl: exampleUrl,
        browserPool: sharedPool,
        headless: true,
        variables: {
          NAME_INPUT: '#user-name',
          EMAIL_INPUT: '#user-email',
          SUBMIT_BUTTON: '#submit-form-btn',
          FEEDBACK_SELECTOR: '#form-feedback',
          TEST_EMAIL: 'champion@betterfront.io',
          TEST_NAME: 'Aria Vanguard'
        }
      });
      assert.strictEqual(formResult.passed, true, 'Form validation chaos workflow should pass on example project');

      // C) Retest Example Project with Zero-Config Autonomous UAT (runAutoUat)
      const autoResult = await runAutoUat(exampleUrl, {
        browserPool: sharedPool,
        headless: true,
        viewports: ['desktop_fhd']
      });
      assert.strictEqual(autoResult.passed, true, 'Zero-config runAutoUat should autonomously discover and pass on example project');
    });

    await t.test('3. Verifies Dreamblu Variant (/dreamblu) with customizable "dreamblu" (rpg-game-hud) workflow & runAutoUat', { timeout: 60000 }, async () => {
      const dreambluUrl = `${baseUrl}/dreamblu`;
      const res = await runUat('dreamblu', {
        targetUrl: dreambluUrl,
        browserPool: sharedPool,
        headless: true
      });
      assert.strictEqual(res.passed, true, 'Dreamblu RPG HUD workflow should pass 100% across desktop & mobile');
      assert.strictEqual(res.viewportResults?.length, 2, 'Should verify both Desktop Full HD and Modern Mobile viewports');
    });

    await t.test('4. Verifies Shopee Variant (/shopee) with customizable "shopee" (shopee-marketplace) workflow', { timeout: 60000 }, async () => {
      const shopeeUrl = `${baseUrl}/shopee`;
      const res = await runUat('shopee', {
        baseUrl: shopeeUrl,
        browserPool: sharedPool,
        headless: true,
        variables: {
          SEARCH_QUERY: 'Mechanical Keyboard'
        }
      });
      assert.strictEqual(res.passed, true, 'Shopee marketplace workflow should pass 100% across desktop & mobile');
    });

    await t.test('5. Verifies Tokopedia Variant (/tokopedia) with customizable "tokopedia" (tokopedia-commerce) workflow', { timeout: 60000 }, async () => {
      const tokopediaUrl = `${baseUrl}/tokopedia`;
      const res = await runUat('tokopedia', {
        baseUrl: tokopediaUrl,
        browserPool: sharedPool,
        headless: true,
        variables: {
          SEARCH_QUERY: 'Monitor Gaming 144Hz'
        }
      });
      assert.strictEqual(res.passed, true, 'Tokopedia commerce workflow should pass 100% across desktop & mobile');
    });

    await t.test('6. Verifies YouTube Variant (/youtube) with customizable "youtube" (youtube-media-streaming) workflow', { timeout: 60000 }, async () => {
      const youtubeUrl = `${baseUrl}/youtube`;
      const res = await runUat('youtube', {
        baseUrl: youtubeUrl,
        browserPool: sharedPool,
        headless: true,
        variables: {
          SEARCH_QUERY: 'Autonomous Visual QA'
        }
      });
      assert.strictEqual(res.passed, true, 'YouTube media streaming workflow should pass 100% across desktop & mobile');
    });

    await t.test('7. Verifies Google Variant (/google) with customizable "google" (google-search-portal) workflow', { timeout: 60000 }, async () => {
      const googleUrl = `${baseUrl}/google`;
      const res = await runUat('google', {
        baseUrl: googleUrl,
        headless: true,
        variables: {
          SEARCH_QUERY: 'BetterFront Gold Standard QA'
        }
      });
      assert.strictEqual(res.passed, true, 'Google search portal workflow should pass 100% across desktop & mobile');
    });
  } finally {
    await sharedPool.closeAll();
    server.closeAllConnections?.();
    server.close();
  }
});

