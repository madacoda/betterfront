#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { resolveConfig, STANDARD_VIEWPORTS } from './config/index.js';
import { AuditRunner } from './core/runner.js';
import { runUat } from './index.js';
import { BetterFrontConfig, ViewportDefinition, UatScenario } from './types/index.js';

const program = new Command();

program
  .name('betterfront')
  .description('Gold-Standard Autonomous Frontend QA & Production-Readiness Engine')
  .version('1.0.0');

program
  .command('audit')
  .description('Audit a URL for layout collisions, mobile bleeds, CLS, and production readiness')
  .argument('<url>', 'Target URL to audit (e.g. http://localhost:3000 or https://example.com)')
  .option('-p, --preset <preset>', 'Audit preset: production-gate, fast-smoke, comprehensive-deep', 'production-gate')
  .option('--viewports <list>', 'Comma-separated viewport names (e.g. mobile_standard,tablet_portrait,desktop_fhd)')
  .option('--persona <persona>', 'Human simulation persona: impatient-mobile, power-user, cautious-first-timer, keyboard-only')
  // Recording toggles
  .option('--no-video', 'Disable video recording')
  .option('--no-trace', 'Disable Playwright trace archive')
  // Anomaly toggles (can be turned ON or OFF)
  .option('--no-text-overlap', 'Disable text collision checking')
  .option('--no-bleed', 'Disable mobile horizontal bleed checking')
  .option('--no-clipping', 'Disable container text clipping checking')
  .option('--no-unsized-media', 'Disable unsized media detection')
  .option('--no-low-contrast', 'Disable color contrast checks')
  .option('--no-touch-targets', 'Disable touch target size auditing')
  .option('--no-a11y', 'Disable WCAG accessibility auditing')
  .option('--no-shifts', 'Disable layout shift (CLS) tracking')
  .option('--no-console-errors', 'Disable console error blocking')
  .option('--no-broken-links', 'Disable broken link and anchor checking')
  // Output paths
  .option('--html <path>', 'Custom path for interactive HTML report', './betterfront-report.html')
  .option('--json <path>', 'Custom path for JSON summary', './betterfront-summary.json')
  .option('--fail-on-blocker', 'Exit with code 1 if any production blocker is triggered', true)
  .action(async (url: string, options: any) => {
    try {
      let customViewports: ViewportDefinition[] | undefined;
      if (options.viewports) {
        const names = options.viewports.split(',').map((s: string) => s.trim());
        customViewports = names
          .map((n: string) => STANDARD_VIEWPORTS[n])
          .filter(Boolean);
      }

      const config = resolveConfig({
        targetUrl: url,
        preset: options.preset as any,
        viewports: customViewports,
        anomalyChecks: {
          textOverlap: options.textOverlap !== false,
          horizontalBleed: options.bleed !== false,
          containerClipping: options.clipping !== false,
          unsizedMedia: options.unsizedMedia !== false,
          lowContrast: options.lowContrast !== false,
          touchTargetSize: options.touchTargets !== false,
          textZoom200Percent: false,
          a11yWcagViolations: options.a11y !== false,
          layoutShifts: options.shifts !== false,
          lighthouseCore: false,
          consoleExceptions: options.consoleErrors !== false,
          brokenNetworkRequests: true,
          brokenLinks: options.brokenLinks !== false
        },
        humanAgent: options.persona ? ({ persona: options.persona } as any) : undefined,
        recording: {
          recordVideo: options.video !== false,
          recordTrace: options.trace !== false,
          captureScreenshots: true,
          highlightAnomalies: true,
          artifactsDir: './betterfront-artifacts'
        },
        reporting: {
          outputHtml: options.html,
          outputJson: options.json
        }
      });

      const runner = new AuditRunner(config);
      const summary = await runner.run();

      if (options.failOnBlocker && !summary.passed) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    } catch (err) {
      console.error(`\n❌ BetterFront Audit Failed with Error:\n${(err as Error).stack || (err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('uat')
  .description('Execute a declarative UAT test scenario checklist file (JSON)')
  .argument('<scenarioFile>', 'Path to UAT scenario file (.json)')
  .action(async (scenarioFile: string) => {
    try {
      const fullPath = path.resolve(scenarioFile);
      if (!fs.existsSync(fullPath)) {
        console.error(`❌ UAT Scenario file not found: ${fullPath}`);
        process.exit(1);
      }

      const raw = fs.readFileSync(fullPath, 'utf8');
      const scenario = JSON.parse(raw) as UatScenario;

      console.log(`\n======================================================`);
      console.log(`🧪 BetterFront UAT Runner: "${scenario.name}"`);
      console.log(`Target: ${scenario.startUrl}`);
      console.log(`======================================================`);

      const result = await runUat(scenario);

      console.log(`\n======================================================`);
      console.log(`UAT Execution Summary:`);
      console.log(`Status:    ${result.passed ? '✅ PASSED' : '🚨 FAILED'}`);
      console.log(`Steps:     ${result.passedSteps}/${result.totalSteps} passed`);
      console.log(`Duration:  ${(result.durationMs / 1000).toFixed(1)}s`);
      console.log(`======================================================\n`);

      if (!result.passed) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    } catch (err) {
      console.error(`\n❌ UAT Execution Failed with Error:\n${(err as Error).stack || (err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('explore')
  .description('Launch an autonomous human-like exploratory crawling session')
  .argument('<url>', 'Target URL to explore')
  .option('--persona <persona>', 'Persona to simulate', 'impatient-mobile')
  .option('--interactions <number>', 'Maximum interactions', '20')
  .action(async (url: string, options: any) => {
    try {
      const config = resolveConfig({
        targetUrl: url,
        preset: 'fast-smoke',
        humanAgent: {
          enabled: true,
          persona: options.persona,
          simulateMouseTrails: true,
          simulateTypingCadence: true,
          simulateScrollMomentum: true,
          maxInteractionsPerPage: parseInt(options.interactions, 10) || 20
        }
      });

      const runner = new AuditRunner(config);
      await runner.run();
    } catch (err) {
      console.error(`\n❌ Exploration Failed:\n${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
