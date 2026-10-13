import test from 'node:test';
import assert from 'node:assert';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runUat, validateScenario, formatValidationReport } from '../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('BetterFront Declarative UAT Engine Suite', async (t) => {

  await t.test('Pre-flight Scenario Validator checks structure and actions', () => {
    // 1. Valid scenario passes
    const validScenario = {
      name: 'Smoke Test',
      description: 'Quick check',
      startUrl: 'http://localhost:3000',
      steps: [
        { action: 'GOTO', url: 'http://localhost:3000', description: 'Nav' },
        { action: 'ASSERT_VISIBLE', selector: 'h1' }
      ]
    };
    const resValid = validateScenario(validScenario);
    assert.strictEqual(resValid.valid, true, 'Valid scenario should pass validation');
    assert.strictEqual(resValid.errors.length, 0);

    // 2. Missing name & startUrl
    const missingMeta = { steps: [{ action: 'WAIT', waitMs: 100 }] };
    const resMeta = validateScenario(missingMeta);
    assert.strictEqual(resMeta.valid, false);
    assert.ok(resMeta.errors.some(e => e.field === 'name'));
    assert.ok(resMeta.errors.some(e => e.field === 'startUrl'));

    // 3. Typo in action with Levenshtein suggestion
    const typoScenario = {
      name: 'Typo Scenario',
      description: 'Checks suggestion',
      startUrl: 'http://localhost:3000',
      steps: [
        { action: 'CLIK', selector: '#btn' }
      ]
    };
    const resTypo = validateScenario(typoScenario);
    assert.strictEqual(resTypo.valid, false);
    const typoError = resTypo.errors.find(e => e.field === 'action');
    assert.ok(typoError, 'Should catch typo action');
    assert.ok(typoError.suggestion?.includes('CLICK'), `Should suggest CLICK, got: ${typoError?.suggestion}`);

    // 4. Missing required selector for CLICK
    const missingSelector = {
      name: 'No Selector',
      description: 'Checks missing selector',
      startUrl: 'http://localhost:3000',
      steps: [
        { action: 'CLICK' }
      ]
    };
    const resSel = validateScenario(missingSelector);
    assert.strictEqual(resSel.valid, false);
    assert.ok(resSel.errors.some(e => e.field === 'selector'));

    // 5. Format validation report string
    const reportStr = formatValidationReport(resTypo, 'Typo Scenario');
    assert.ok(reportStr.includes('Found 1 validation error'));
    assert.ok(reportStr.includes('Did you mean "CLICK"?'));
  });

  // 2. Integration Execution Tests with local server
  const fixturePath = path.join(__dirname, 'fixtures', 'defect-gallery.html');
  const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fixtureHtml);
  });

  await new Promise((resolve) => server.listen(0, () => resolve(true)));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 8913;
  const testUrl = `http://localhost:${port}`;

  try {
    await t.test('Executes comprehensive UAT scenario with interactions, assertions, and screenshot', { timeout: 60000 }, async () => {
      const scenario = {
        name: 'Defect Gallery E2E UAT Flow',
        description: 'Validates interactions, typing, clicking, hovering, assertions, and forensics',
        startUrl: testUrl,
        steps: [
          {
            action: 'GOTO',
            url: testUrl,
            description: '1. Navigate to test fixture'
          },
          {
            action: 'ASSERT_VISIBLE',
            selector: 'header h1',
            description: '2. Verify header title is visible'
          },
          {
            action: 'ASSERT_TEXT',
            selector: 'header h1',
            text: 'BetterFront Test Laboratory',
            description: '3. Verify header title text'
          },
          {
            action: 'HOVER',
            selector: '#cta-button',
            description: '4. Hover over CTA button'
          },
          {
            action: 'CLICK',
            selector: '#cta-button',
            description: '5. Click CTA button'
          },
          {
            action: 'TYPE',
            selector: '#user-email',
            text: 'tester@betterfront.io',
            clearFirst: true,
            description: '6. Type email address'
          },
          {
            action: 'ASSERT_VALUE',
            selector: '#user-email',
            value: 'tester@betterfront.io',
            description: '7. Verify typed email value'
          },
          {
            action: 'CLEAR',
            selector: '#user-email',
            description: '8. Clear email input'
          },
          {
            action: 'ASSERT_VALUE',
            selector: '#user-email',
            value: '',
            description: '9. Verify email input is cleared'
          },
          {
            action: 'TYPE',
            selector: '#user-email',
            text: 'final@betterfront.io',
            description: '10. Re-type final email'
          },
          {
            action: 'TYPE',
            selector: '#user-name',
            text: 'Quality Champion',
            description: '11. Type user name'
          },
          {
            action: 'CLICK',
            selector: '#submit-form-btn',
            description: '12. Submit contact form'
          },
          {
            action: 'WAIT_FOR',
            selector: '#form-feedback',
            state: 'visible',
            description: '13. Wait for form feedback message'
          },
          {
            action: 'ASSERT_TEXT',
            selector: '#form-feedback',
            text: 'Form submitted successfully!',
            description: '14. Assert form feedback text'
          },
          {
            action: 'ASSERT_COUNT',
            selector: '.avatar-stack .avatar',
            count: 3,
            operator: 'equals',
            description: '15. Assert exactly 3 avatars in avatar stack'
          },
          {
            action: 'SCROLL',
            scrollPx: 300,
            direction: 'down',
            description: '16. Human scroll down'
          },
          {
            action: 'CLICK',
            selector: '#non-existent-optional-promo',
            optional: true,
            timeoutMs: 1000,
            description: '17. Optional click on non-existent element (must not fail scenario)'
          },
          {
            action: 'ASSERT_NO_CONSOLE_ERRORS',
            description: '18. Verify zero unhandled console errors'
          },
          {
            action: 'SCREENSHOT',
            name: 'test-uat-success-proof',
            description: '19. Capture screenshot evidence'
          }
        ]
      };

      const result = await runUat(scenario, { headless: true });

      assert.strictEqual(result.passed, true, 'UAT scenario should pass completely');
      assert.strictEqual(result.failedSteps, 0, 'No non-optional steps should fail');
      assert.strictEqual(result.passedSteps, 19, 'All 19 steps should pass or be gracefully handled');

      // Verify screenshot artifact was created
      const screenshotsDir = path.resolve('./betterfront-artifacts/screenshots');
      assert.ok(fs.existsSync(screenshotsDir), 'Screenshots directory should exist');
      const files = fs.readdirSync(screenshotsDir);
      assert.ok(files.some(f => f.includes('test-uat-success-proof')), 'Screenshot file should be present');
    });

    await t.test('Executes scenario across multi-viewport configuration', { timeout: 60000 }, async () => {
      const scenario = {
        name: 'Multi-Viewport UAT Verification',
        description: 'Runs on both desktop and mobile',
        startUrl: testUrl,
        viewports: ['desktop_fhd', 'mobile_standard'],
        steps: [
          { action: 'GOTO', url: testUrl, description: 'Navigate' },
          { action: 'ASSERT_VISIBLE', selector: 'header h1', description: 'Header Visible' }
        ]
      };

      const result = await runUat(scenario, { headless: true });
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.viewportResults?.length, 2, 'Should execute on both desktop and mobile viewports');
    });

    await t.test('Captures failure snapshot with red element highlight when assertion fails', { timeout: 60000 }, async () => {
      const failingScenario = {
        name: 'Intentional Failure for Forensic Capture Test',
        description: 'Verifies that BetterFront automatically snaps error screenshot on failure',
        startUrl: testUrl,
        viewports: ['desktop_fhd'],
        recording: {
          screenshotOnFailure: true,
          artifactsDir: './betterfront-artifacts'
        },
        steps: [
          { action: 'GOTO', url: testUrl, description: 'Navigate' },
          {
            action: 'ASSERT_TEXT',
            selector: 'header h1',
            text: 'This Text Definitely Does Not Exist',
            description: 'Intentionally failing assertion to trigger failure capture'
          }
        ]
      };

      const result = await runUat(failingScenario, { headless: true });

      assert.strictEqual(result.passed, false, 'Scenario should fail on mismatched assertion');
      assert.strictEqual(result.failedSteps, 1, 'Exactly 1 step should fail');
      assert.ok(result.failureScreenshotPath, 'Run result should include failureScreenshotPath');
      assert.ok(fs.existsSync(result.failureScreenshotPath), 'Failure screenshot file must exist on disk');
      assert.ok(result.failureScreenshotPath.includes('failure_step_2_assert_text'), 'Filename should identify step index and action');
      assert.ok(result.failureScreenshotPath.endsWith('.png'), 'Artifact should be a PNG image');
    });

    await t.test('Records video and trace artifacts when configured in scenario recording block', { timeout: 60000 }, async () => {
      const recordedScenario = {
        name: 'Recorded Video & Trace Scenario',
        description: 'Verifies recording block options generate WebM video and Playwright trace',
        startUrl: testUrl,
        viewports: ['mobile_standard'],
        recording: {
          video: true,
          trace: true,
          artifactsDir: './betterfront-artifacts'
        },
        steps: [
          { action: 'GOTO', url: testUrl, description: 'Navigate' },
          { action: 'ASSERT_VISIBLE', selector: 'header h1', description: 'Header Visible' }
        ]
      };

      const result = await runUat(recordedScenario, { headless: true });

      assert.strictEqual(result.passed, true, 'Scenario should pass');
      assert.ok(result.videoPath, 'Result should have videoPath');
      assert.ok(fs.existsSync(result.videoPath), 'Recorded video file must exist on disk');
      assert.ok(result.tracePath, 'Result should have tracePath');
      assert.ok(fs.existsSync(result.tracePath), 'Recorded trace archive must exist on disk');
      assert.ok(result.tracePath.endsWith('.zip'), 'Trace archive should be a zip file');
    });

    await t.test('Verifies gold-standard assertions (ASSERT_UNOCCLUDED, ASSERT_TOUCH_TARGET, ASSERT_CONTRAST)', { timeout: 60000 }, async () => {
      const goldStandardScenario = {
        name: 'Gold Standard Frontend Quality Verification',
        description: 'Validates unoccluded hit testing, touch target sizing, and color contrast invariants',
        startUrl: testUrl,
        viewports: ['desktop_fhd'],
        steps: [
          { action: 'GOTO', url: testUrl, description: 'Navigate' },
          {
            action: 'ASSERT_UNOCCLUDED',
            selector: '#cta-button',
            description: 'Verify instant action button is physically unoccluded at hit point'
          },
          {
            action: 'ASSERT_TOUCH_TARGET',
            selector: '#submit-form-btn',
            minPx: 36,
            description: 'Verify submit button meets 36x36px minimum touch target size'
          },
          {
            action: 'ASSERT_CONTRAST',
            selector: 'header h1',
            minRatio: 4.5,
            description: 'Verify header title text meets WCAG AA 4.5:1 contrast ratio'
          }
        ]
      };

      const result = await runUat(goldStandardScenario, { headless: true });
      assert.strictEqual(result.passed, true, 'All gold-standard assertions should pass');
      assert.strictEqual(result.passedSteps, 4);
    });

    await t.test('Catches touch target violation and container clipping defects', { timeout: 60000 }, async () => {
      // 1. Touch target defect on #delete-btn (18x18px)
      const touchFailScenario = {
        name: 'Touch Target Defect Detection',
        description: 'Detects undersized button',
        startUrl: testUrl,
        viewports: ['desktop_fhd'],
        steps: [
          { action: 'GOTO', url: testUrl, description: 'Navigate' },
          {
            action: 'ASSERT_TOUCH_TARGET',
            selector: '#delete-btn',
            minPx: 44,
            description: 'Assert delete button meets 44px'
          }
        ]
      };

      const touchResult = await runUat(touchFailScenario, { headless: true });
      assert.strictEqual(touchResult.passed, false, 'Should fail because #delete-btn is only 18x18px');
      assert.ok(touchResult.steps[1].error?.includes('failing minimum size requirement'), 'Should report size failure');

      // 2. Container clipping defect on .starved-clipped-card
      const clippingScenario = {
        name: 'Container Starvation Detection',
        description: 'Detects starved container clipping',
        startUrl: testUrl,
        viewports: ['desktop_fhd'],
        steps: [
          { action: 'GOTO', url: testUrl, description: 'Navigate' },
          {
            action: 'ASSERT_NO_CLIPPING',
            selector: '.starved-clipped-card',
            description: 'Assert no clipping on starved card'
          }
        ]
      };

      const clipResult = await runUat(clippingScenario, { headless: true });
      assert.strictEqual(clipResult.passed, false, 'Should fail because .starved-clipped-card has overflow: hidden with scrollHeight > clientHeight');
      assert.ok(clipResult.steps[1].error?.includes('text clipping/starvation'), 'Should report clipping error');
    });

  } finally {
    server.close();
  }
});
