import * as fs from 'fs';
import * as path from 'path';
import { chromium, Page } from 'playwright';
import { UatScenario, UatStep } from '../types/index.js';

export interface RecorderOptions {
  startUrl: string;
  outputFile?: string;
  name?: string;
  description?: string;
}

export class UatActionRecorder {
  /**
   * Launches an interactive browser session, records clicks, inputs, and navigation,
   * and saves them to a declarative BetterFront UAT Scenario JSON file.
   */
  public async startRecording(options: RecorderOptions): Promise<string> {
    const startUrl = options.startUrl;
    const outputPath = path.resolve(options.outputFile || './uat-scenarios/recorded-scenario.json');
    const scenarioName = options.name || `Recorded UAT Flow for ${new URL(startUrl).hostname}`;

    const recordedSteps: UatStep[] = [
      {
        action: 'GOTO',
        url: startUrl,
        description: `1. Initial navigation to ${startUrl}`
      }
    ];

    console.log(`\n======================================================`);
    console.log(`🔴 BetterFront Live UAT Recorder Started`);
    console.log(`Target:    ${startUrl}`);
    console.log(`Output:    ${outputPath}`);
    console.log(`Instructions:`);
    console.log(`  - Interact with your application normally in the browser.`);
    console.log(`  - Clicks, inputs, and navigation will be logged automatically.`);
    console.log(`  - Close the browser window when finished to save the scenario.`);
    console.log(`======================================================\n`);

    const browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized']
    });

    const context = await browser.newContext({
      viewport: null // maximize viewport to window
    });

    const page = await context.newPage();

    // Expose binding to log events from DOM to Node.js
    await page.exposeFunction('__betterfrontRecordStep', (rawStep: any) => {
      const stepIndex = recordedSteps.length + 1;
      const step: UatStep = {
        action: rawStep.action,
        selector: rawStep.selector,
        text: rawStep.text,
        url: rawStep.url,
        scrollPx: rawStep.scrollPx,
        description: `${stepIndex}. ${rawStep.action} ${rawStep.selector || rawStep.text || rawStep.url || ''}`.trim()
      };

      recordedSteps.push(step);
      console.log(`   [Recorded Step ${stepIndex}] ${step.action} ${step.selector || step.text || step.url || ''}`);
    });

    // Inject event listener script on every frame navigation
    await page.addInitScript(() => {
      // Helper to compute a clean CSS selector
      function getSelector(el: HTMLElement | null): string {
        if (!el || el === document.body || el === document.documentElement) return 'body';

        if (el.id) {
          return `#${CSS.escape(el.id)}`;
        }

        const testId = el.getAttribute('data-testid');
        if (testId) {
          return `[data-testid="${CSS.escape(testId)}"]`;
        }

        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) {
          return `${el.tagName.toLowerCase()}[aria-label="${CSS.escape(ariaLabel)}"]`;
        }

        if (el.classList && el.classList.length > 0) {
          const meaningfulClasses = Array.from(el.classList)
            .filter((c) => !c.startsWith('hover:') && !c.startsWith('focus:') && !c.includes(':'))
            .slice(0, 2);
          if (meaningfulClasses.length > 0) {
            return `${el.tagName.toLowerCase()}.${meaningfulClasses.map((c) => CSS.escape(c)).join('.')}`;
          }
        }

        if (el.parentElement) {
          const tag = el.tagName.toLowerCase();
          const siblings = Array.from(el.parentElement.children).filter((c) => c.tagName === el.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(el) + 1;
            return `${getSelector(el.parentElement)} > ${tag}:nth-of-type(${index})`;
          }
          return `${getSelector(el.parentElement)} > ${tag}`;
        }

        return el.tagName.toLowerCase();
      }

      // Record clicks
      document.addEventListener(
        'click',
        (e) => {
          const target = e.target as HTMLElement;
          if (!target) return;
          const selector = getSelector(target);
          (window as any).__betterfrontRecordStep({
            action: 'CLICK',
            selector
          });
        },
        true
      );

      // Record input changes
      document.addEventListener(
        'change',
        (e) => {
          const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          if (!target) return;
          const selector = getSelector(target);
          if (target.tagName === 'SELECT') {
            (window as any).__betterfrontRecordStep({
              action: 'SELECT',
              selector,
              text: target.value
            });
          } else {
            (window as any).__betterfrontRecordStep({
              action: 'TYPE',
              selector,
              text: target.value
            });
          }
        },
        true
      );
    });

    // Track page navigations
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        const currentUrl = frame.url();
        if (currentUrl !== 'about:blank' && currentUrl !== startUrl) {
          const lastStep = recordedSteps[recordedSteps.length - 1];
          if (!lastStep || lastStep.url !== currentUrl) {
            recordedSteps.push({
              action: 'GOTO',
              url: currentUrl,
              description: `${recordedSteps.length + 1}. Navigate to ${currentUrl}`
            });
            console.log(`   [Recorded Step ${recordedSteps.length}] GOTO ${currentUrl}`);
          }
        }
      }
    });

    try {
      await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch (navErr) {
      console.warn(`   ⚠️ Navigation warning: ${(navErr as Error).message}`);
    }

    // Wait until user closes the page or browser
    await new Promise<void>((resolve) => {
      page.on('close', () => resolve());
      browser.on('disconnected', () => resolve());
    });

    // Append standard visual sanity assertions at the end of the recorded flow
    recordedSteps.push({
      action: 'ASSERT_NO_BLEED',
      description: `${recordedSteps.length + 1}. Verify zero mobile horizontal viewport bleed`
    });
    recordedSteps.push({
      action: 'ASSERT_NO_CONSOLE_ERRORS',
      description: `${recordedSteps.length + 2}. Verify zero unhandled JavaScript console errors`
    });

    const scenario: UatScenario = {
      $schema: './uat-scenario.schema.json',
      name: scenarioName,
      description: options.description || 'Autonomously recorded user interaction flow.',
      startUrl,
      anomalyChecks: {
        textOverlap: true,
        horizontalBleed: true,
        consoleExceptions: true
      },
      steps: recordedSteps
    };

    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(scenario, null, 2), 'utf8');

    console.log(`\n======================================================`);
    console.log(`✅ UAT Scenario Successfully Recorded & Saved!`);
    console.log(`Path:  ${outputPath}`);
    console.log(`Steps: ${recordedSteps.length} recorded actions & assertions`);
    console.log(`Run it anytime with:`);
    console.log(`  node dist/cli.js uat "${outputPath}"`);
    console.log(`======================================================\n`);

    return outputPath;
  }
}
