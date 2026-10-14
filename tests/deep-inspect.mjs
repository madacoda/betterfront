import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const ROUTES_TO_EXPLORE = [
  '/',
  '/gacha',
  '/afk-rewards',
  '/battle',
  '/battle-v2',
  '/formations',
  '/profile',
  '/inventory',
  '/shop',
  '/missions',
  '/daily-login',
  '/balance',
  '/dreamwalkers',
  '/captains',
  '/heroes',
  '/enemies'
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const report = {};

  console.log('Navigating to http://localhost:7777/ to login...');
  await page.goto('http://localhost:7777/', { waitUntil: 'networkidle' });

  // Perform login
  await page.locator('button.save-button').click();
  await page.waitForTimeout(400);
  await page.fill('input[type="email"]', 'user@example.com');
  await page.fill('input[type="password"]', 'Password123');
  await page.click('button:has-text("SIGN IN TO ACCOUNT")');
  await page.waitForTimeout(2500);

  for (const route of ROUTES_TO_EXPLORE) {
    const targetUrl = `http://localhost:7777${route}`;
    console.log(`\n======================================================`);
    console.log(`Analyzing: ${targetUrl}`);
    console.log(`======================================================`);

    const consoleMessages = [];
    const pageErrors = [];
    const networkRequests = [];

    const onConsole = msg => {
      if (msg.type() === 'error') consoleMessages.push(msg.text());
    };
    const onPageError = err => pageErrors.push(err.message);
    const onRequest = req => {
      if (req.url().includes('/api/')) networkRequests.push({ url: req.url(), method: req.method() });
    };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('request', onRequest);

    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);

      const pageAnalysis = await page.evaluate(() => {
        const title = document.title;
        const h1 = document.querySelector('h1')?.innerText?.trim() || '';
        const h2s = Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim()).filter(Boolean);

        const buttons = Array.from(document.querySelectorAll('button'))
          .filter(b => b.offsetWidth > 0 && b.offsetHeight > 0)
          .map(b => ({
            text: b.innerText.trim().replace(/\s+/g, ' '),
            id: b.id,
            className: b.className,
            disabled: b.disabled
          }));

        const inputs = Array.from(document.querySelectorAll('input, select, textarea'))
          .filter(i => i.offsetWidth > 0 && i.offsetHeight > 0)
          .map(i => ({
            tag: i.tagName.toLowerCase(),
            type: i.getAttribute('type'),
            id: i.id,
            placeholder: i.getAttribute('placeholder'),
            value: i.value
          }));

        const cards = Array.from(document.querySelectorAll('[class*="card"], [class*="item"], [class*="banner"], [class*="slot"]'))
          .slice(0, 10)
          .map(c => ({
            className: c.className,
            text: c.innerText.trim().slice(0, 100).replace(/\s+/g, ' ')
          }));

        const mainTextSnippet = (document.querySelector('main') || document.body).innerText.slice(0, 400).replace(/\s+/g, ' ');

        return {
          title,
          h1,
          h2s,
          buttonsCount: buttons.length,
          buttons: buttons.slice(0, 15),
          inputs,
          cardsSample: cards.slice(0, 5),
          mainTextSnippet
        };
      });

      const shotDir = path.resolve('./betterfront-artifacts/deep-analysis');
      if (!fs.existsSync(shotDir)) fs.mkdirSync(shotDir, { recursive: true });
      const shotPath = path.join(shotDir, `${route.replace(/[\/\\]/g, '_') || 'home'}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });

      report[route] = {
        url: targetUrl,
        analysis: pageAnalysis,
        consoleErrors: consoleMessages,
        pageErrors,
        apiRequests: networkRequests,
        screenshot: shotPath
      };

      console.log(`Title: ${pageAnalysis.title}`);
      console.log(`H1: ${pageAnalysis.h1}`);
      console.log(`Buttons (${pageAnalysis.buttonsCount}):`, pageAnalysis.buttons.map(b => b.text).join(' | '));
      if (pageAnalysis.inputs.length) {
        console.log(`Inputs:`, pageAnalysis.inputs.map(i => `${i.tag}[${i.type}]`).join(', '));
      }
    } catch (err) {
      console.error(`Error analyzing ${targetUrl}:`, err.message);
      report[route] = { error: err.message };
    } finally {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      page.off('request', onRequest);
    }
  }

  const outJson = path.resolve('./betterfront-artifacts/deep-analysis-report.json');
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
  console.log(`\nSaved deep analysis report to ${outJson}`);

  await browser.close();
}

main().catch(console.error);
